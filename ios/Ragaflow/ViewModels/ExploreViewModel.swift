import Foundation

// MARK: - Filter options
//
// Mirrors web lib/explore.ts (DURATION_FILTERS / ACCESS_FILTERS). Kept as plain
// enums with a `matches` predicate so the filter logic stays pure and testable.

/// Duration buckets (minutes), chosen to match the common session lengths.
enum DurationFilter: String, CaseIterable, Identifiable {
    case any, short, medium, long

    var id: String { rawValue }

    var label: String {
        switch self {
        case .any: "Any length"
        case .short: "Under 20m"
        case .medium: "20–40m"
        case .long: "Over 40m"
        }
    }

    func matches(_ track: Track) -> Bool {
        let minutes = Double(track.duration) / 60
        switch self {
        case .any: return true
        case .short: return minutes < 20
        case .medium: return minutes >= 20 && minutes <= 40
        case .long: return minutes > 40
        }
    }
}

/// Free vs. premium access filter.
enum AccessFilter: String, CaseIterable, Identifiable {
    case all, free, premium

    var id: String { rawValue }

    var label: String {
        switch self {
        case .all: "All"
        case .free: "Free"
        case .premium: "Premium"
        }
    }

    func matches(_ track: Track) -> Bool {
        switch self {
        case .all: return true
        case .free: return track.free
        case .premium: return !track.free
        }
    }
}

@Observable
@MainActor
final class ExploreViewModel {
    private let supabase: SupabaseServiceProtocol

    var tracks: [Track] = []
    var ragams: [String: Ragam] = [:]
    var favorites: Set<String> = []
    var isLoading = true

    /// Sorted unique tags, computed once in `loadData` since `tracks` is
    /// immutable after load — avoids re-deriving it on every render.
    private(set) var allTags: [String] = []

    // Filters (mirror web explore-client state).
    var query = ""
    var selectedTag: String?
    var duration: DurationFilter = .any
    var access: AccessFilter = .all
    var tagsExpanded = false

    /// Past this many tags the list collapses behind a "Show all tags" toggle.
    static let collapsedTagLimit = 12

    init(supabase: SupabaseServiceProtocol) {
        self.supabase = supabase
    }

    // MARK: - Computed

    var needsTagCollapse: Bool {
        allTags.count > Self.collapsedTagLimit
    }

    /// Tags to render — all when expanded (or short enough), otherwise the
    /// leading slice that fits the collapsed view.
    var visibleTags: [String] {
        if tagsExpanded || !needsTagCollapse { return allTags }
        return Array(allTags.prefix(Self.collapsedTagLimit))
    }

    /// Case-insensitive substring match across the track's title, its ragam's
    /// name + description, the track description, and its tags. An empty query
    /// matches everything. Mirrors web `trackMatchesQuery`.
    private func matchesQuery(_ track: Track) -> Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return true }
        let ragam = ragams[track.ragamId]
        let haystack = ([
            track.title ?? "",
            ragam?.name ?? "",
            ragam?.description ?? "",
            track.description,
        ] + track.tags)
            .joined(separator: " ")
            .lowercased()
        return haystack.contains(q)
    }

    var filteredTracks: [Track] {
        tracks.filter { track in
            if let tag = selectedTag, !track.tags.contains(tag) { return false }
            return duration.matches(track)
                && access.matches(track)
                && matchesQuery(track)
        }
    }

    /// Count of filters set away from their default — drives the "Clear filters"
    /// badge. Mirrors web `activeFilterCount`.
    var activeFilterCount: Int {
        var n = 0
        if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { n += 1 }
        if selectedTag != nil { n += 1 }
        if duration != .any { n += 1 }
        if access != .all { n += 1 }
        return n
    }

    var groupedByRagam: [(ragam: Ragam, tracks: [Track])] {
        let grouped = Dictionary(grouping: filteredTracks) { $0.ragamId }
        return grouped.compactMap { ragamId, tracks in
            guard let ragam = ragams[ragamId] else { return nil }
            let sorted = tracks.sorted { ($0.recordedDate ?? "") > ($1.recordedDate ?? "") }
            return (ragam, sorted)
        }
        // Deterministic alphabetical order. Intentional deviation from web, which
        // renders groups in first-appearance order; `Dictionary(grouping:)` is
        // unordered, so sort by name for a stable, predictable layout.
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
            allTags = Set(fetchedTracks.flatMap(\.tags)).sorted()
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

    /// Select a tag, or pass `nil` for the "All" pill. Re-selecting the active
    /// tag clears it (matches web's toggle behavior).
    func toggleTag(_ tag: String) {
        selectedTag = (selectedTag == tag) ? nil : tag
    }

    func clearFilters() {
        query = ""
        selectedTag = nil
        duration = .any
        access = .all
    }
}
