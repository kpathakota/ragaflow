import Foundation

@Observable
@MainActor
final class ExploreViewModel {
    private let supabase: SupabaseServiceProtocol

    var tracks: [Track] = []
    var ragams: [String: Ragam] = [:]
    var favorites: Set<String> = []
    var selectedTags: Set<String> = []
    var isLoading = true
    var tagsExpanded = false

    init(supabase: SupabaseServiceProtocol) {
        self.supabase = supabase
    }

    // MARK: - Computed

    var allTags: [String] {
        Set(tracks.flatMap(\.tags)).sorted()
    }

    var filteredTracks: [Track] {
        if selectedTags.isEmpty { return tracks }
        return tracks.filter { !selectedTags.isDisjoint(with: $0.tags) }
    }

    var groupedByRagam: [(ragam: Ragam, tracks: [Track])] {
        let grouped = Dictionary(grouping: filteredTracks) { $0.ragamId }
        return grouped.compactMap { ragamId, tracks in
            guard let ragam = ragams[ragamId] else { return nil }
            let sorted = tracks.sorted { ($0.recordedDate ?? "") > ($1.recordedDate ?? "") }
            return (ragam, sorted)
        }
        .sorted { $0.ragam.name < $1.ragam.name }
    }

    // MARK: - Actions

    func loadData() async {
        do {
            async let tracksResult = supabase.fetchAllTracks()
            async let ragamsResult = supabase.fetchAllRagams()
            async let rasikaResult = supabase.fetchRasika()

            let (fetchedTracks, fetchedRagams, rasika) = try await (tracksResult, ragamsResult, rasikaResult)

            tracks = fetchedTracks
            ragams = Dictionary(uniqueKeysWithValues: fetchedRagams.map { ($0.id, $0) })
            favorites = Set(rasika?.favoriteTracks ?? [])
        } catch {}
        isLoading = false
    }

    func toggleFavorite(trackId: String) async {
        do {
            let updated = try await supabase.toggleFavoriteTrack(trackId: trackId)
            favorites = Set(updated)
        } catch {}
    }

    func toggleTag(_ tag: String) {
        if selectedTags.contains(tag) {
            selectedTags.remove(tag)
        } else {
            selectedTags.insert(tag)
        }
    }

    func clearFilters() {
        selectedTags.removeAll()
    }
}
