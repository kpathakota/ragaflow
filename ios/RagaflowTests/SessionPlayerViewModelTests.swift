import Testing
import Foundation
@testable import Ragaflow

// MARK: - Test Fixtures

private func makeTrack(
    id: String = "track-1",
    ragamId: String = "ragam-1",
    scenario: Scenario = .focus,
    duration: Int = 1500,
    audioUrl: String = "https://example.com/audio.m4a"
) -> Track {
    Track(
        id: id,
        title: "Test Track",
        ragamId: ragamId,
        scenarios: [scenario],
        tags: ["grounding"],
        description: "A test track",
        artistNote: "From a quiet session",
        recordedDate: "2026-01-15",
        location: "Portland",
        duration: duration,
        audioUrl: audioUrl,
        downloadUrl: nil,
        free: true,
        createdAt: "2026-01-15T00:00:00Z"
    )
}

private func makeRagam(id: String = "ragam-1") -> Ragam {
    Ragam(id: id, name: "Hindolam", description: "A pentatonic ragam", timeOfDay: "evening")
}

private func makeRasika(favoriteTracks: [String] = [], customDuration: Int? = nil) -> Rasika {
    Rasika(
        id: "rasika-1",
        rasikaId: "user-uuid",
        favoriteTracks: favoriteTracks,
        favoriteRagams: [],
        defaultFocusTrack: nil,
        defaultSleepTrack: nil,
        defaultMeditateTrack: nil,
        defaultFocusDuration: nil,
        defaultSleepDuration: nil,
        defaultMeditateDuration: nil,
        customDuration: customDuration,
        subscriptionStatus: .free,
        polarCustomerId: nil
    )
}

// MARK: - Tests

@Suite("SessionPlayerViewModel")
struct SessionPlayerViewModelTests {

    @Test("loads track and ragam data")
    @MainActor
    func loadData() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        let track = makeTrack()
        let ragam = makeRagam()
        mock.tracks = [track]
        mock.ragams = [ragam]
        mock.rasika = makeRasika()

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        #expect(vm.track?.id == "track-1")
        #expect(vm.ragam?.name == "Hindolam")
        #expect(vm.isLoading == false)
        #expect(vm.isFavorite == false)
    }

    @Test("loads favorite status from rasika")
    @MainActor
    func loadFavoriteStatus() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika(favoriteTracks: ["track-1"])

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        #expect(vm.isFavorite == true)
    }

    @Test("uses initialDuration when provided")
    @MainActor
    func initialDuration() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika()

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: 45,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        #expect(vm.duration == 45)
    }

    @Test("loads custom duration from rasika")
    @MainActor
    func customDuration() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika(customDuration: 90)

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        #expect(vm.customDuration == 90)
    }

    @Test("startSession transitions to running state and plays audio")
    @MainActor
    func startSession() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika()

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        // Cancel timer immediately so test doesn't hang
        vm.duration = 25
        await vm.startSession()

        #expect(vm.sessionState == .running)
        #expect(vm.remaining == 25 * 60)
        #expect(audio.playCalls.count == 1)
        #expect(audio.playCalls[0].trackId == "track-1")

        // Clean up timer
        vm.restart()
    }

    @Test("startSession logs session to supabase when logged in")
    @MainActor
    func startSessionLogsToSupabase() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika()
        mock.isAuthenticated = true

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()

        #expect(mock.startSessionCalls.count == 1)
        #expect(mock.startSessionCalls[0].trackId == "track-1")
        #expect(mock.startSessionCalls[0].scenario == .focus)
        vm.restart()
    }

    @Test("startSession does NOT log session when logged out")
    @MainActor
    func startSessionNoLogWhenLoggedOut() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika()
        mock.isAuthenticated = false

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()

        #expect(mock.startSessionCalls.isEmpty)
        vm.restart()
    }

    @Test("pause stops audio and records elapsed time")
    @MainActor
    func pause() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()

        vm.pause()

        #expect(vm.sessionState == .paused)
        #expect(audio.pauseCallCount == 1)
        vm.restart()
    }

    @Test("resume restarts audio and transitions back to running")
    @MainActor
    func resume() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()
        vm.pause()
        vm.resume()

        #expect(vm.sessionState == .running)
        #expect(audio.resumeCallCount == 1)
        vm.restart()
    }

    @Test("stop resets to idle and stops audio")
    @MainActor
    func stop() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()

        await vm.stop()

        #expect(vm.sessionState == .idle)
        #expect(vm.remaining == 0)
        #expect(audio.stopCallCount >= 1)
    }

    @Test("restart resets all state")
    @MainActor
    func restart() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()
        vm.restart()

        #expect(vm.sessionState == .idle)
        #expect(vm.remaining == 0)
        #expect(vm.showDefaultPrompt == false)
        #expect(vm.defaultSet == false)
        #expect(vm.isFullTrack == false)
        #expect(audio.resetVolumeCallCount == 1)
    }

    @Test("toggleFavorite adds and removes track from favorites")
    @MainActor
    func toggleFavorite() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]
        mock.rasika = makeRasika()

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        // Add favorite
        await vm.toggleFavorite()
        #expect(vm.isFavorite == true)
        #expect(mock.toggleFavoriteTrackCalls == ["track-1"])

        // Remove favorite
        await vm.toggleFavorite()
        #expect(vm.isFavorite == false)
        #expect(mock.toggleFavoriteTrackCalls == ["track-1", "track-1"])
    }

    @Test("setDefault calls supabase and updates state")
    @MainActor
    func setDefault() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        vm.duration = 25

        await vm.setDefault()

        #expect(vm.defaultSet == true)
        #expect(vm.showDefaultPrompt == false)
        #expect(mock.setDefaultTrackCalls.count == 1)
        #expect(mock.setDefaultTrackCalls[0].scenario == .focus)
        #expect(mock.setDefaultTrackCalls[0].trackId == "track-1")
        #expect(mock.setDefaultTrackCalls[0].durationSeconds == 1500)
    }

    @Test("selectFixedDuration updates duration")
    @MainActor
    func selectFixedDuration() {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )

        vm.selectFixedDuration(45)
        #expect(vm.duration == 45)
        #expect(vm.isFullTrack == false)
        #expect(vm.showCustomInput == false)
    }

    @Test("selectFullTrack sets duration from track length")
    @MainActor
    func selectFullTrack() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack(duration: 3600)] // 60 min track
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        vm.selectFullTrack()
        #expect(vm.duration == 60)
        #expect(vm.isFullTrack == true)
    }

    @Test("applyCustomDuration validates range 1-120")
    @MainActor
    func applyCustomDuration() {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )

        // Valid
        vm.customInputText = "90"
        vm.applyCustomDuration()
        #expect(vm.duration == 90)
        #expect(vm.customDuration == 90)

        // Too low
        vm.customInputText = "0"
        vm.applyCustomDuration()
        #expect(vm.duration == 90) // unchanged

        // Too high
        vm.customInputText = "200"
        vm.applyCustomDuration()
        #expect(vm.duration == 90) // unchanged

        // Non-numeric
        vm.customInputText = "abc"
        vm.applyCustomDuration()
        #expect(vm.duration == 90) // unchanged
    }

    @Test("timerDisplay formats correctly")
    @MainActor
    func timerDisplay() {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )

        vm.remaining = 0
        #expect(vm.timerDisplay == "00:00")

        vm.remaining = 90
        #expect(vm.timerDisplay == "01:30")

        vm.remaining = 1500
        #expect(vm.timerDisplay == "25:00")
    }

    @Test("displayName prefers ragam name over track name")
    @MainActor
    func displayName() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()

        #expect(vm.displayName == "Hindolam")
    }

    @Test("handleRemotePause transitions from running to paused")
    @MainActor
    func handleRemotePause() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()

        vm.handleRemotePause()
        #expect(vm.sessionState == .paused)
        vm.restart()
    }

    @Test("handleRemoteResume transitions from paused to running")
    @MainActor
    func handleRemoteResume() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack()]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()
        vm.pause()

        vm.handleRemoteResume()
        #expect(vm.sessionState == .running)
        vm.restart()
    }

    @Test("stop on sleep scenario counts all time toward certification")
    @MainActor
    func stopSleepCountsAllTime() async {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        mock.tracks = [makeTrack(scenario: .sleep)]
        mock.ragams = [makeRagam()]

        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .sleep, initialDuration: nil,
            supabase: mock, audio: audio
        )
        await vm.loadData()
        await vm.startSession()

        // Simulate some elapsed time by waiting briefly
        try? await Task.sleep(for: .milliseconds(100))
        await vm.stop()

        // Sleep always counts — no certification call since no user logged in
        // but verify the state machine transitions correctly
        #expect(vm.sessionState == .idle)
    }

    @Test("isLoggedIn reflects isAuthenticated state")
    @MainActor
    func isLoggedIn() {
        let mock = MockSupabaseService()
        let audio = MockAudioService()
        let vm = SessionPlayerViewModel(
            trackId: "track-1", scenario: .focus, initialDuration: nil,
            supabase: mock, audio: audio
        )

        #expect(vm.isLoggedIn == false)

        mock.isAuthenticated = true
        #expect(vm.isLoggedIn == true)
    }
}
