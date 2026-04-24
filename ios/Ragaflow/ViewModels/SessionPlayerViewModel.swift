import Foundation

@Observable
@MainActor
final class SessionPlayerViewModel {
    // MARK: - Dependencies

    let trackId: String
    let scenario: Scenario
    let initialDuration: Int? // minutes
    let autoplay: Bool

    private let supabase: SupabaseServiceProtocol
    private let audio: AudioServiceProtocol

    // MARK: - State

    var track: Track?
    var ragam: Ragam?
    var isFavorite = false
    var isLoading = true

    // Timer state
    var duration: Int = 25 // minutes
    var remaining: Int = 0 // seconds
    var sessionState: SessionState = .idle
    var noteExpanded = false
    var showDefaultPrompt = false
    var defaultSet = false
    var customDuration: Int?
    var isFullTrack = false
    var showCustomInput = false
    var customInputText = ""

    private var sessionId: String?
    private var startedAt: Date?
    private var elapsedBeforePause: TimeInterval = 0
    private var fadeStarted = false
    private var timerTask: Task<Void, Never>?

    let fixedDurations = [25, 45]
    let sleepFadeDuration: TimeInterval = 120

    enum SessionState {
        case idle, running, paused, complete
    }

    // MARK: - Computed

    var isLoggedIn: Bool { supabase.isAuthenticated }

    var timerDisplay: String {
        let mins = remaining / 60
        let secs = remaining % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    var displayName: String {
        ragam?.name ?? track?.displayName ?? "Ragaflow"
    }

    // MARK: - Init

    init(
        trackId: String,
        scenario: Scenario,
        initialDuration: Int?,
        autoplay: Bool = false,
        supabase: SupabaseServiceProtocol,
        audio: AudioServiceProtocol
    ) {
        self.trackId = trackId
        self.scenario = scenario
        self.initialDuration = initialDuration
        self.autoplay = autoplay
        self.supabase = supabase
        self.audio = audio
    }

    // MARK: - Data Loading

    func loadData() async {
        do {
            track = try await supabase.fetchTrack(id: trackId)
            if let track {
                ragam = try await supabase.fetchRagam(id: track.ragamId)
                let rasika = try await supabase.fetchRasika()
                isFavorite = rasika?.favoriteTracks.contains(track.id) ?? false
                if let custom = rasika?.customDuration {
                    customDuration = custom
                }
            }
            if let initialDuration {
                duration = initialDuration
            }
        } catch {}
        isLoading = false

        if autoplay, let track {
            isFullTrack = true
            duration = track.duration / 60
            await startSession()
        }
    }

    // MARK: - Session Actions

    func startSession() async {
        guard let track else { return }
        remaining = duration * 60
        startedAt = Date()
        elapsedBeforePause = 0
        sessionState = .running

        if let url = URL(string: track.audioUrl) {
            audio.play(url: url, trackId: track.id)
        }

        if supabase.isAuthenticated {
            sessionId = try? await supabase.startListeningSession(
                trackId: track.id,
                scenario: scenario,
                intendedDurationSeconds: duration * 60
            )
        }

        startTimer()
    }

    func pause() {
        guard let startedAt else { return }
        elapsedBeforePause += Date().timeIntervalSince(startedAt)
        sessionState = .paused
        audio.pause()
    }

    func resume() {
        startedAt = Date()
        sessionState = .running
        startTimer()
        audio.resume()
    }

    func stop() async {
        guard let startedAt else { return }
        let elapsed = Int(elapsedBeforePause + Date().timeIntervalSince(startedAt))
        sessionState = .idle
        remaining = 0
        timerTask?.cancel()
        timerTask = nil
        audio.stop()

        if let sessionId {
            try? await supabase.endListeningSession(sessionId: sessionId, durationSeconds: elapsed, completed: false)
            self.sessionId = nil
        }

        if let track {
            let countable = computeCountableSeconds(scenario: scenario, durationSeconds: elapsed, completed: false)
            if countable > 0 {
                try? await supabase.upsertCertification(ragamId: track.ragamId, additionalSeconds: countable)
            }
        }
    }

    func restart() {
        sessionState = .idle
        remaining = 0
        showDefaultPrompt = false
        defaultSet = false
        fadeStarted = false
        isFullTrack = false
        timerTask?.cancel()
        timerTask = nil
        audio.resetVolume()
    }

    // MARK: - Timer

    func startTimer() {
        timerTask?.cancel()
        timerTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled && self.sessionState == .running {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled, self.sessionState == .running, let startedAt = self.startedAt else { break }

                let elapsed = self.elapsedBeforePause + Date().timeIntervalSince(startedAt)
                let left = max(0, Int(Double(self.duration * 60) - elapsed))
                self.remaining = left

                self.audio.updateNowPlaying(
                    title: self.displayName,
                    duration: Double(self.duration * 60),
                    elapsed: elapsed
                )

                if self.scenario == .sleep && !self.fadeStarted && Double(left) <= self.sleepFadeDuration {
                    self.fadeStarted = true
                    self.audio.startVolumeFade(duration: Double(left))
                }

                if left <= 0 {
                    await self.complete()
                    break
                }
            }
        }
    }

    private func complete() async {
        sessionState = .complete
        timerTask?.cancel()
        timerTask = nil
        audio.stop()

        if let sessionId {
            try? await supabase.endListeningSession(sessionId: sessionId, durationSeconds: duration * 60, completed: true)
            self.sessionId = nil
        }

        if supabase.isAuthenticated {
            showDefaultPrompt = true
            if let track {
                try? await supabase.upsertCertification(ragamId: track.ragamId, additionalSeconds: duration * 60)
            }
        }
    }

    // MARK: - Favorites

    func toggleFavorite() async {
        guard track != nil else { return }
        do {
            let updated = try await supabase.toggleFavoriteTrack(trackId: trackId)
            isFavorite = updated.contains(trackId)
        } catch {}
    }

    // MARK: - Defaults

    func setDefault() async {
        guard let track else { return }
        try? await supabase.setDefaultTrack(scenario: scenario, trackId: track.id, durationSeconds: duration * 60)
        defaultSet = true
        showDefaultPrompt = false
    }

    // MARK: - Duration Selection

    func selectFixedDuration(_ d: Int) {
        duration = d
        isFullTrack = false
        showCustomInput = false
    }

    func selectFullTrack() {
        guard let track else { return }
        duration = track.duration / 60
        isFullTrack = true
        showCustomInput = false
    }

    func applyCustomDuration() {
        if let val = Int(customInputText), val >= 1, val <= 120 {
            customDuration = val
            duration = val
            isFullTrack = false
            showCustomInput = false
        }
    }

    // MARK: - Remote Command Handlers

    func handleRemotePause() {
        guard sessionState == .running, let startedAt else { return }
        elapsedBeforePause += Date().timeIntervalSince(startedAt)
        sessionState = .paused
    }

    func handleRemoteResume() {
        guard sessionState == .paused else { return }
        self.startedAt = Date()
        sessionState = .running
        startTimer()
    }

    func setupRemoteCommands() {
        audio.onRemotePause = { [weak self] in
            Task { @MainActor in self?.handleRemotePause() }
        }
        audio.onRemoteResume = { [weak self] in
            Task { @MainActor in self?.handleRemoteResume() }
        }
    }

    func teardownRemoteCommands() {
        audio.onRemotePause = nil
        audio.onRemoteResume = nil
    }
}
