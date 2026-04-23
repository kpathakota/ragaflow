import Testing
import Foundation
@testable import Ragaflow

// MARK: - Fixtures

private func makeTracks() -> [Track] {
    [
        Track(
            id: "t1", title: "Morning Raga", ragamId: "r1",
            scenarios: [.focus, .meditate], tags: ["grounding", "calm"],
            description: "A morning session", artistNote: nil,
            recordedDate: "2026-01-15", location: "Portland",
            duration: 1800, audioUrl: "https://example.com/t1.m4a",
            downloadUrl: nil, free: true, featured: false, featuredScenarios: [], createdAt: "2026-01-15T00:00:00Z"
        ),
        Track(
            id: "t2", title: "Evening Raga", ragamId: "r2",
            scenarios: [.sleep], tags: ["calm", "surrender"],
            description: "An evening session", artistNote: nil,
            recordedDate: "2026-02-10", location: "Home studio",
            duration: 2700, audioUrl: "https://example.com/t2.m4a",
            downloadUrl: nil, free: true, featured: false, featuredScenarios: [], createdAt: "2026-02-10T00:00:00Z"
        ),
        Track(
            id: "t3", title: "Deep Focus", ragamId: "r1",
            scenarios: [.focus], tags: ["grounding", "energizing"],
            description: "Deep work session", artistNote: nil,
            recordedDate: "2026-03-01", location: "Portland",
            duration: 3600, audioUrl: "https://example.com/t3.m4a",
            downloadUrl: nil, free: false, featured: false, featuredScenarios: [], createdAt: "2026-03-01T00:00:00Z"
        ),
    ]
}

private func makeRagams() -> [Ragam] {
    [
        Ragam(id: "r1", name: "Hindolam", description: "Pentatonic", timeOfDay: "morning"),
        Ragam(id: "r2", name: "Nilambari", description: "Sleep raga", timeOfDay: "night"),
    ]
}

private func makeRasika(favorites: [String] = []) -> Rasika {
    Rasika(
        id: "rasika-1", rasikaId: "user-uuid", displayName: nil,
        favoriteTracks: favorites, favoriteRagams: [],
        defaultFocusTrack: nil, defaultSleepTrack: nil, defaultMeditateTrack: nil,
        defaultFocusDuration: nil, defaultSleepDuration: nil, defaultMeditateDuration: nil,
        customDuration: nil, subscriptionStatus: .free, polarCustomerId: nil
    )
}

// MARK: - Tests

@Suite("ExploreViewModel")
struct ExploreViewModelTests {

    @Test("loads tracks, ragams, and favorites")
    @MainActor
    func loadData() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()
        mock.rasika = makeRasika(favorites: ["t1"])

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.tracks.count == 3)
        #expect(vm.ragams.count == 2)
        #expect(vm.favorites == Set(["t1"]))
        #expect(vm.isLoading == false)
    }

    @Test("allTags returns sorted unique tags")
    @MainActor
    func allTags() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.allTags == ["calm", "energizing", "grounding", "surrender"])
    }

    @Test("filteredTracks returns all tracks when no tags selected")
    @MainActor
    func filteredTracksNoFilter() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        #expect(vm.filteredTracks.count == 3)
    }

    @Test("filteredTracks filters by selected tags")
    @MainActor
    func filteredTracksWithFilter() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        vm.toggleTag("surrender")
        #expect(vm.filteredTracks.count == 1)
        #expect(vm.filteredTracks[0].id == "t2")
    }

    @Test("filteredTracks matches any selected tag (OR logic)")
    @MainActor
    func filteredTracksOrLogic() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        vm.toggleTag("surrender")
        vm.toggleTag("energizing")
        // t2 has "surrender", t3 has "energizing"
        #expect(vm.filteredTracks.count == 2)
    }

    @Test("groupedByRagam groups tracks by ragam sorted by name")
    @MainActor
    func groupedByRagam() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        let groups = vm.groupedByRagam
        #expect(groups.count == 2)
        #expect(groups[0].ragam.name == "Hindolam") // H before N
        #expect(groups[0].tracks.count == 2) // t1 and t3
        #expect(groups[1].ragam.name == "Nilambari")
        #expect(groups[1].tracks.count == 1) // t2
    }

    @Test("groupedByRagam sorts tracks within group newest-first")
    @MainActor
    func groupedByRagamSortOrder() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        let hindolamTracks = vm.groupedByRagam[0].tracks
        #expect(hindolamTracks[0].id == "t3") // 2026-03-01
        #expect(hindolamTracks[1].id == "t1") // 2026-01-15
    }

    @Test("toggleTag adds and removes tags")
    @MainActor
    func toggleTag() {
        let mock = MockSupabaseService()
        let vm = ExploreViewModel(supabase: mock)

        vm.toggleTag("calm")
        #expect(vm.selectedTags == Set(["calm"]))

        vm.toggleTag("calm")
        #expect(vm.selectedTags.isEmpty)
    }

    @Test("clearFilters removes all selected tags")
    @MainActor
    func clearFilters() {
        let mock = MockSupabaseService()
        let vm = ExploreViewModel(supabase: mock)

        vm.toggleTag("calm")
        vm.toggleTag("grounding")
        vm.clearFilters()

        #expect(vm.selectedTags.isEmpty)
    }

    @Test("toggleFavorite updates favorites set")
    @MainActor
    func toggleFavorite() async {
        let mock = MockSupabaseService()
        mock.rasika = makeRasika()

        let vm = ExploreViewModel(supabase: mock)
        await vm.toggleFavorite(trackId: "t1")

        #expect(vm.favorites.contains("t1"))
        #expect(mock.toggleFavoriteTrackCalls == ["t1"])
    }

    @Test("groupedByRagam filters correctly with tag selection")
    @MainActor
    func groupedByRagamWithFilter() async {
        let mock = MockSupabaseService()
        mock.tracks = makeTracks()
        mock.ragams = makeRagams()

        let vm = ExploreViewModel(supabase: mock)
        await vm.loadData()

        vm.toggleTag("surrender")
        let groups = vm.groupedByRagam
        // Only t2 (Nilambari) has "surrender"
        #expect(groups.count == 1)
        #expect(groups[0].ragam.name == "Nilambari")
    }
}
