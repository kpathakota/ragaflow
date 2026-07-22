import Testing
import Foundation
@testable import Ragaflow

// MARK: - Fixtures

private func makeRasika(status: SubscriptionStatus = .free) -> Rasika {
    Rasika(
        id: "rasika-1", rasikaId: "user-uuid", displayName: nil,
        favoriteTracks: ["t1", "t2"], favoriteRagams: ["r1"],
        defaultFocusTrack: "t1", defaultSleepTrack: nil, defaultMeditateTrack: nil,
        defaultFocusDuration: 1500, defaultSleepDuration: nil, defaultMeditateDuration: nil,
        customDuration: nil, subscriptionStatus: status, polarCustomerId: nil
    )
}

private func makeSessions() -> [ListeningSession] {
    [
        ListeningSession(
            id: "s1", rasikaId: "user-uuid", trackId: "t1",
            scenario: .focus, startedAt: "2026-01-15T10:00:00Z",
            endedAt: "2026-01-15T10:25:00Z", durationSeconds: 1500,
            intendedDurationSeconds: 1500, completed: true
        ),
        ListeningSession(
            id: "s2", rasikaId: "user-uuid", trackId: "t2",
            scenario: .sleep, startedAt: "2026-01-15T22:00:00Z",
            endedAt: "2026-01-15T22:45:00Z", durationSeconds: 2700,
            intendedDurationSeconds: 2700, completed: true
        ),
        ListeningSession(
            id: "s3", rasikaId: "user-uuid", trackId: "t1",
            scenario: .focus, startedAt: "2026-01-16T10:00:00Z",
            endedAt: "2026-01-16T10:25:00Z", durationSeconds: 1500,
            intendedDurationSeconds: 1500, completed: true
        ),
    ]
}

private func makeCertifications() -> [Certification] {
    [
        Certification(id: "c1", rasikaId: "user-uuid", ragamId: "r1", level: 1, totalSeconds: 36000),
        Certification(id: "c2", rasikaId: "user-uuid", ragamId: "r2", level: 0, totalSeconds: 5000),
    ]
}

private func makeRagams() -> [Ragam] {
    [
        Ragam(id: "r1", name: "Hindolam", description: "Pentatonic", timeOfDay: "morning"),
        Ragam(id: "r2", name: "Nilambari", description: "Sleep raga", timeOfDay: "night"),
    ]
}

// MARK: - Tests

@Suite("ProfileViewModel")
struct ProfileViewModelTests {

    @Test("loads all profile data")
    @MainActor
    func loadData() async {
        let mock = MockSupabaseService()
        mock.rasika = makeRasika()
        mock.listeningSessions = makeSessions()
        mock.certifications = makeCertifications()
        mock.ragams = makeRagams()

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.rasika != nil)
        #expect(vm.certifications.count == 2)
        #expect(vm.ragams.count == 2)
        #expect(vm.isLoading == false)
    }

    @Test("computes total listening time from sessions")
    @MainActor
    func totalListeningTime() async {
        let mock = MockSupabaseService()
        mock.listeningSessions = makeSessions()

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        // 1500 + 2700 + 1500 = 5700 seconds
        #expect(vm.totalListeningSeconds == 5700)
    }

    @Test("counts sessions correctly")
    @MainActor
    func sessionCount() async {
        let mock = MockSupabaseService()
        mock.listeningSessions = makeSessions()

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.sessionCount == 3)
    }

    @Test("formats listening time under an hour")
    @MainActor
    func formatTimeUnderHour() {
        let mock = MockSupabaseService()
        let vm = ProfileViewModel(supabase: mock)

        #expect(vm.formatListeningTime(0) == "0m")
        #expect(vm.formatListeningTime(300) == "5m")
        #expect(vm.formatListeningTime(3599) == "59m")
    }

    @Test("formats listening time over an hour")
    @MainActor
    func formatTimeOverHour() {
        let mock = MockSupabaseService()
        let vm = ProfileViewModel(supabase: mock)

        #expect(vm.formatListeningTime(3600) == "1h 0m")
        #expect(vm.formatListeningTime(5700) == "1h 35m")
        #expect(vm.formatListeningTime(36000) == "10h 0m")
    }

    @Test("formattedListeningTime reflects totalListeningSeconds")
    @MainActor
    func formattedListeningTime() async {
        let mock = MockSupabaseService()
        mock.listeningSessions = makeSessions()

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.formattedListeningTime == "1h 35m")
    }

    @Test("subscriptionStatus defaults to free")
    @MainActor
    func subscriptionStatusDefault() {
        let mock = MockSupabaseService()
        let vm = ProfileViewModel(supabase: mock)

        #expect(vm.subscriptionStatus == .free)
    }

    @Test("subscriptionStatus reflects rasika status")
    @MainActor
    func subscriptionStatusFromRasika() async {
        let mock = MockSupabaseService()
        mock.rasika = makeRasika(status: .active)

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.subscriptionStatus == .active)
    }

    @Test("subscriptionStatus shows lifetime")
    @MainActor
    func subscriptionStatusLifetime() async {
        let mock = MockSupabaseService()
        mock.rasika = makeRasika(status: .lifetime)

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.subscriptionStatus == .lifetime)
    }

    @Test("signOut delegates to supabase")
    @MainActor
    func signOut() async {
        let mock = MockSupabaseService()
        let vm = ProfileViewModel(supabase: mock)

        await vm.signOut()

        #expect(mock.signOutCalled == true)
    }

    @Test("deleteAccount success delegates to supabase and returns true")
    @MainActor
    func deleteAccountSuccess() async {
        let mock = MockSupabaseService()
        let vm = ProfileViewModel(supabase: mock)

        let deleted = await vm.deleteAccount()

        #expect(deleted == true)
        #expect(mock.deleteAccountCalled == true)
        #expect(vm.deleteAccountFailure == nil)
        #expect(vm.isDeletingAccount == false)
    }

    @Test("deleteAccount surfaces the active-subscription refusal")
    @MainActor
    func deleteAccountActiveSubscription() async {
        let mock = MockSupabaseService()
        mock.errorToThrow = DeleteAccountError.activeSubscription
        let vm = ProfileViewModel(supabase: mock)

        let deleted = await vm.deleteAccount()

        #expect(deleted == false)
        #expect(mock.deleteAccountCalled == false)
        #expect(vm.deleteAccountFailure == .activeSubscription)
        #expect(vm.isDeletingAccount == false)
    }

    @Test("deleteAccount maps any other error to the generic failure")
    @MainActor
    func deleteAccountGenericError() async {
        let mock = MockSupabaseService()
        mock.errorToThrow = URLError(.notConnectedToInternet)
        let vm = ProfileViewModel(supabase: mock)

        let deleted = await vm.deleteAccount()

        #expect(deleted == false)
        #expect(vm.deleteAccountFailure == .generic)
        #expect(vm.isDeletingAccount == false)
    }

    @Test("deleteAccount failure leaves the confirmation flow re-triggerable")
    @MainActor
    func deleteAccountRetryAfterFailure() async {
        let mock = MockSupabaseService()
        mock.errorToThrow = URLError(.timedOut)
        let vm = ProfileViewModel(supabase: mock)

        _ = await vm.deleteAccount()
        #expect(vm.deleteAccountFailure == .generic)

        // Dismissing the alert and retrying after the error clears succeeds
        vm.deleteAccountFailure = nil
        mock.errorToThrow = nil
        let deleted = await vm.deleteAccount()

        #expect(deleted == true)
        #expect(vm.deleteAccountFailure == nil)
    }

    @Test("handles empty data gracefully")
    @MainActor
    func emptyData() async {
        let mock = MockSupabaseService()

        let vm = ProfileViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.rasika == nil)
        #expect(vm.certifications.isEmpty)
        #expect(vm.totalListeningSeconds == 0)
        #expect(vm.sessionCount == 0)
        #expect(vm.isLoading == false)
    }
}
