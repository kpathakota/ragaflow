import SwiftUI

struct SessionPlayerView: View {
    let trackId: String
    let scenario: Scenario
    let initialDuration: Int? // minutes

    @Environment(SupabaseService.self) private var supabase

    @State private var track: Track?
    @State private var ragam: Ragam?
    @State private var isFavorite = false
    @State private var isLoading = true

    // Timer state
    @State private var duration: Int = 25 // minutes
    @State private var remaining: Int = 0 // seconds
    @State private var sessionState: SessionState = .idle
    @State private var sessionId: String?
    @State private var startedAt: Date?
    @State private var elapsedBeforePause: TimeInterval = 0
    @State private var noteExpanded = false
    @State private var showDefaultPrompt = false
    @State private var defaultSet = false
    @State private var customDuration: Int?
    @State private var fadeStarted = false

    private let audio = AudioService.shared
    private let fixedDurations = [25, 45]
    /// Seconds before session end to begin sleep volume fade
    private let sleepFadeDuration: TimeInterval = 120

    enum SessionState {
        case idle, running, paused, complete
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let track {
                playerContent(track: track)
            } else {
                Text("Track not found")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if supabase.currentUser != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await toggleFavorite() }
                    } label: {
                        Image(systemName: isFavorite ? "heart.fill" : "heart")
                            .foregroundStyle(isFavorite ? .red : .secondary)
                    }
                }
            }
        }
        .task {
            await loadData()
        }
        .onAppear {
            // Sync lock screen remote commands with view state
            audio.onRemotePause = { [self] in
                guard sessionState == .running, let startedAt else { return }
                elapsedBeforePause += Date().timeIntervalSince(startedAt)
                sessionState = .paused
            }
            audio.onRemoteResume = { [self] in
                guard sessionState == .paused else { return }
                self.startedAt = Date()
                sessionState = .running
                startTimer()
            }
        }
        .onDisappear {
            audio.onRemotePause = nil
            audio.onRemoteResume = nil
        }
    }

    @ViewBuilder
    private func playerContent(track: Track) -> some View {
        VStack(spacing: 0) {
            // Track info
            VStack(alignment: .leading, spacing: 8) {
                Text(ragam?.name ?? track.displayName)
                    .font(.title2)
                    .fontWeight(.semibold)
                Text(track.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineSpacing(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
            .padding(.top, 8)

            // Visual zone
            Spacer()

            ZStack {
                Circle()
                    .fill(scenario.accentColor.opacity(0.15))
                    .frame(width: 220, height: 220)
                    .blur(radius: 60)

                // Artist note
                if let note = track.artistNote, sessionState != .complete {
                    VStack(alignment: .leading, spacing: 8) {
                        Button {
                            withAnimation { noteExpanded.toggle() }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: noteExpanded ? "chevron.up" : "chevron.down")
                                    .font(.caption2)
                                Text("From the session")
                                    .font(.caption)
                            }
                            .foregroundStyle(.tertiary)
                        }

                        if noteExpanded {
                            Text(note)
                                .font(.subheadline)
                                .italic()
                                .foregroundStyle(.secondary)
                                .lineSpacing(4)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .offset(y: 80)
                }
            }

            Spacer()

            // Controls
            controlsSection(track: track)
                .padding(.bottom, 32)
        }
    }

    @ViewBuilder
    private func controlsSection(track: Track) -> some View {
        VStack(spacing: 20) {
            switch sessionState {
            case .idle:
                // Duration picker
                HStack(spacing: 8) {
                    ForEach(fixedDurations, id: \.self) { d in
                        durationPill(d, isSelected: duration == d)
                    }
                    if let custom = customDuration, !fixedDurations.contains(custom) {
                        durationPill(custom, isSelected: duration == custom)
                    }
                }

                // Play button
                Button {
                    Task { await startSession(track: track) }
                } label: {
                    Circle()
                        .fill(scenario.accentColor)
                        .frame(width: 64, height: 64)
                        .overlay {
                            Image(systemName: "play.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                        }
                }

            case .running, .paused:
                // Timer display
                Text(timerDisplay)
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.tertiary)

                HStack(spacing: 24) {
                    // Play/Pause
                    Button {
                        if sessionState == .running { pause() }
                        else { resume() }
                    } label: {
                        Circle()
                            .fill(scenario.accentColor)
                            .frame(width: 64, height: 64)
                            .overlay {
                                Image(systemName: sessionState == .running ? "pause.fill" : "play.fill")
                                    .font(.title2)
                                    .foregroundStyle(.white)
                            }
                    }

                    // Stop
                    Button {
                        Task { await stop(track: track) }
                    } label: {
                        Text("stop")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }
                }

            case .complete:
                completionView(track: track)
            }
        }
    }

    private func durationPill(_ minutes: Int, isSelected: Bool) -> some View {
        Button {
            duration = minutes
        } label: {
            Text("\(minutes)m")
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(isSelected ? scenario.accentColor : Color(.systemGray5))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
    }

    @ViewBuilder
    private func completionView(track: Track) -> some View {
        VStack(spacing: 24) {
            Circle()
                .fill(scenario.accentColor.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay {
                    Image(systemName: "checkmark")
                        .font(.title)
                        .foregroundStyle(scenario.accentColorLight)
                }

            VStack(spacing: 4) {
                Text("\(duration) minutes of \(scenario.label.lowercased())")
                    .font(.headline)
                    .foregroundStyle(scenario.accentColorLight)
                Text(ragam?.name ?? track.displayName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if showDefaultPrompt && !defaultSet {
                VStack(spacing: 12) {
                    Text("Set as your default for \(scenario.label)?")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 12) {
                        Button("Yes") {
                            Task { await setDefault(track: track) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(scenario.accentColor)

                        Button("No thanks") {
                            showDefaultPrompt = false
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            if defaultSet {
                Text("Default set! Quick-play from home.")
                    .font(.subheadline)
                    .foregroundStyle(.green)
            }

            HStack(spacing: 16) {
                Button("New session") {
                    restart()
                }
                .buttonStyle(.borderedProminent)
                .tint(scenario.accentColor)
            }
        }
    }

    // MARK: - Timer

    private var timerDisplay: String {
        let mins = remaining / 60
        let secs = remaining % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    // MARK: - Actions

    private func loadData() async {
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
    }

    private func startSession(track: Track) async {
        remaining = duration * 60
        startedAt = Date()
        elapsedBeforePause = 0
        sessionState = .running

        if let url = URL(string: track.audioUrl) {
            audio.play(url: url, trackId: track.id)
        }

        if supabase.currentUser != nil {
            sessionId = try? await supabase.startListeningSession(
                trackId: track.id,
                scenario: scenario,
                intendedDurationSeconds: duration * 60
            )
        }

        // Start timer
        startTimer()
    }

    private func startTimer() {
        Task {
            while sessionState == .running {
                try? await Task.sleep(for: .seconds(1))
                guard sessionState == .running, let startedAt else { break }

                let elapsed = elapsedBeforePause + Date().timeIntervalSince(startedAt)
                let left = max(0, Int(Double(duration * 60) - elapsed))
                remaining = left

                // Update lock screen / Control Center
                let ragamName = ragam?.name ?? track?.displayName ?? "Ragaflow"
                audio.updateNowPlaying(
                    title: ragamName,
                    duration: Double(duration * 60),
                    elapsed: elapsed
                )

                // Start volume fade for sleep scenario (once)
                if scenario == .sleep && !fadeStarted && Double(left) <= sleepFadeDuration {
                    fadeStarted = true
                    audio.startVolumeFade(duration: Double(left))
                }

                if left <= 0 {
                    await complete()
                    break
                }
            }
        }
    }

    private func pause() {
        guard let startedAt else { return }
        elapsedBeforePause += Date().timeIntervalSince(startedAt)
        sessionState = .paused
        audio.pause()
    }

    private func resume() {
        startedAt = Date()
        sessionState = .running
        startTimer()
        audio.resume()
    }

    private func stop(track: Track) async {
        guard let startedAt else { return }
        let elapsed = Int(elapsedBeforePause + Date().timeIntervalSince(startedAt))
        sessionState = .idle
        remaining = 0
        audio.stop()

        if let sessionId {
            try? await supabase.endListeningSession(sessionId: sessionId, durationSeconds: elapsed, completed: false)
            self.sessionId = nil
        }

        let countable = computeCountableSeconds(scenario: scenario, durationSeconds: elapsed, completed: false)
        if countable > 0 {
            try? await supabase.upsertCertification(ragamId: track.ragamId, additionalSeconds: countable)
        }
    }

    private func complete() async {
        sessionState = .complete
        audio.stop()

        if let sessionId {
            try? await supabase.endListeningSession(sessionId: sessionId, durationSeconds: duration * 60, completed: true)
            self.sessionId = nil
        }

        if supabase.currentUser != nil {
            showDefaultPrompt = true
            if let track {
                try? await supabase.upsertCertification(ragamId: track.ragamId, additionalSeconds: duration * 60)
            }
        }
    }

    private func restart() {
        sessionState = .idle
        remaining = 0
        showDefaultPrompt = false
        defaultSet = false
        fadeStarted = false
        audio.resetVolume()
    }

    private func toggleFavorite() async {
        guard track != nil else { return }
        do {
            let updated = try await supabase.toggleFavoriteTrack(trackId: trackId)
            isFavorite = updated.contains(trackId)
        } catch {}
    }

    private func setDefault(track: Track) async {
        try? await supabase.setDefaultTrack(scenario: scenario, trackId: track.id, durationSeconds: duration * 60)
        defaultSet = true
        showDefaultPrompt = false
    }
}
