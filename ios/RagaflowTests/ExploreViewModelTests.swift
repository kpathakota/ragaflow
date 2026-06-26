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

@MainActor
private func loadedViewModel() async -> ExploreViewModel {
    let mock = MockSupabaseService()
    mock.tracks = makeTracks()
    mock.ragams = makeRagams()
    mock.rasika = makeRasika(favorites: ["t1"])
    let vm = ExploreViewModel(supabase: mock)
    await vm.loadData()
    return vm
}

// MARK: - Tests

@Suite("ExploreViewModel")
struct ExploreViewModelTests {

    @Test("loads tracks, ragams, and favorites")
    @MainActor
    func loadData() async {
        let vm = await loadedViewModel()
        #expect(vm.tracks.count == 3)
        #expect(vm.ragams.count == 2)
        #expect(vm.favorites == Set(["t1"]))
        #expect(vm.isLoading == false)
    }

    @Test("allTags returns sorted unique tags")
    @MainActor
    func allTags() async {
        let vm = await loadedViewModel()
        #expect(vm.allTags == ["calm", "energizing", "grounding", "surrender"])
    }

    // MARK: Tag filter (single-select)

    @Test("filteredTracks returns all tracks when no filters set")
    @MainActor
    func filteredTracksNoFilter() async {
        let vm = await loadedViewModel()
        #expect(vm.filteredTracks.count == 3)
    }

    @Test("filteredTracks filters by the selected tag")
    @MainActor
    func filteredTracksWithTag() async {
        let vm = await loadedViewModel()
        vm.toggleTag("surrender")
        #expect(vm.filteredTracks.map(\.id) == ["t2"])
    }

    @Test("toggleTag selects then clears on re-select")
    @MainActor
    func toggleTagSingleSelect() async {
        let vm = await loadedViewModel()

        vm.toggleTag("calm")
        #expect(vm.selectedTag == "calm")
        // t1 and t2 carry "calm"
        #expect(Set(vm.filteredTracks.map(\.id)) == Set(["t1", "t2"]))

        // Re-selecting the active tag clears it.
        vm.toggleTag("calm")
        #expect(vm.selectedTag == nil)
        #expect(vm.filteredTracks.count == 3)
    }

    @Test("selecting a different tag replaces the previous one")
    @MainActor
    func toggleTagReplaces() async {
        let vm = await loadedViewModel()
        vm.toggleTag("calm")
        vm.toggleTag("energizing")
        #expect(vm.selectedTag == "energizing")
        #expect(vm.filteredTracks.map(\.id) == ["t3"])
    }

    // MARK: Duration filter

    @Test("duration filter buckets by minutes")
    @MainActor
    func durationFilter() async {
        let vm = await loadedViewModel()

        // t1 = 30m, t2 = 45m, t3 = 60m
        vm.duration = .short // < 20m
        #expect(vm.filteredTracks.isEmpty)

        vm.duration = .medium // 20–40m
        #expect(vm.filteredTracks.map(\.id) == ["t1"])

        vm.duration = .long // > 40m
        #expect(Set(vm.filteredTracks.map(\.id)) == Set(["t2", "t3"]))

        vm.duration = .any
        #expect(vm.filteredTracks.count == 3)
    }

    // MARK: Access filter

    @Test("access filter splits free vs premium")
    @MainActor
    func accessFilter() async {
        let vm = await loadedViewModel()

        vm.access = .free
        #expect(Set(vm.filteredTracks.map(\.id)) == Set(["t1", "t2"]))

        vm.access = .premium
        #expect(vm.filteredTracks.map(\.id) == ["t3"])

        vm.access = .all
        #expect(vm.filteredTracks.count == 3)
    }

    // MARK: Search

    @Test("search matches track titles")
    @MainActor
    func searchByTitle() async {
        let vm = await loadedViewModel()
        vm.query = "deep focus"
        #expect(vm.filteredTracks.map(\.id) == ["t3"])
    }

    @Test("search matches ragam name and description")
    @MainActor
    func searchByRagam() async {
        let vm = await loadedViewModel()

        vm.query = "nilambari"
        #expect(vm.filteredTracks.map(\.id) == ["t2"])

        vm.query = "pentatonic" // r1 description → t1 + t3
        #expect(Set(vm.filteredTracks.map(\.id)) == Set(["t1", "t3"]))
    }

    @Test("search matches tags and is case-insensitive")
    @MainActor
    func searchByTag() async {
        let vm = await loadedViewModel()
        vm.query = "SURRENDER"
        #expect(vm.filteredTracks.map(\.id) == ["t2"])
    }

    @Test("whitespace-only query matches everything")
    @MainActor
    func searchWhitespace() async {
        let vm = await loadedViewModel()
        vm.query = "   "
        #expect(vm.filteredTracks.count == 3)
    }

    // MARK: Combined filters

    @Test("filters combine with AND across dimensions")
    @MainActor
    func combinedFilters() async {
        let vm = await loadedViewModel()
        vm.toggleTag("grounding") // t1, t3
        vm.access = .free          // t1, t3 -> t1
        #expect(vm.filteredTracks.map(\.id) == ["t1"])
    }

    // MARK: Active filter count

    @Test("activeFilterCount counts non-default filters")
    @MainActor
    func activeFilterCount() async {
        let vm = await loadedViewModel()
        #expect(vm.activeFilterCount == 0)

        vm.query = "raga"
        vm.toggleTag("calm")
        vm.duration = .long
        vm.access = .free
        #expect(vm.activeFilterCount == 4)

        // Whitespace query does not count.
        vm.query = "  "
        #expect(vm.activeFilterCount == 3)
    }

    @Test("clearFilters resets every dimension")
    @MainActor
    func clearFilters() async {
        let vm = await loadedViewModel()
        vm.query = "raga"
        vm.toggleTag("calm")
        vm.duration = .long
        vm.access = .premium

        vm.clearFilters()

        #expect(vm.query == "")
        #expect(vm.selectedTag == nil)
        #expect(vm.duration == .any)
        #expect(vm.access == .all)
        #expect(vm.activeFilterCount == 0)
        #expect(vm.filteredTracks.count == 3)
    }

    // MARK: Tag collapse

    @Test("needsTagCollapse only past the collapse limit")
    @MainActor
    func tagCollapse() async {
        let vm = await loadedViewModel()
        // 4 tags < limit → no collapse, all visible.
        #expect(vm.needsTagCollapse == false)
        #expect(vm.visibleTags == vm.allTags)
    }

    // MARK: Grouping

    @Test("groupedByRagam groups tracks by ragam sorted by name")
    @MainActor
    func groupedByRagam() async {
        let vm = await loadedViewModel()
        let groups = vm.groupedByRagam
        #expect(groups.count == 2)
        #expect(groups[0].ragam.name == "Hindolam") // H before N
        #expect(groups[0].tracks.count == 2)         // t1 and t3
        #expect(groups[1].ragam.name == "Nilambari")
        #expect(groups[1].tracks.count == 1)         // t2
    }

    @Test("groupedByRagam sorts tracks within group newest-first")
    @MainActor
    func groupedByRagamSortOrder() async {
        let vm = await loadedViewModel()
        let hindolamTracks = vm.groupedByRagam[0].tracks
        #expect(hindolamTracks[0].id == "t3") // 2026-03-01
        #expect(hindolamTracks[1].id == "t1") // 2026-01-15
    }

    @Test("groupedByRagam reflects the active tag filter")
    @MainActor
    func groupedByRagamWithFilter() async {
        let vm = await loadedViewModel()
        vm.toggleTag("surrender")
        let groups = vm.groupedByRagam
        #expect(groups.count == 1)
        #expect(groups[0].ragam.name == "Nilambari")
    }

    // MARK: Favorites

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
}
