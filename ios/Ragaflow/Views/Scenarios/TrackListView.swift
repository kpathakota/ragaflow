import SwiftUI

struct TrackListView: View {
    let scenario: Scenario

    @Environment(SupabaseService.self) private var supabase

    @State private var tracks: [Track] = []
    @State private var ragams: [String: Ragam] = [:]
    @State private var favorites: Set<String> = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView()
                    .padding(.top, 100)
            } else if tracks.isEmpty {
                Text("No tracks available")
                    .foregroundStyle(.secondary)
                    .padding(.top, 100)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(sortedTracks) { track in
                        NavigationLink(value: PlayerDestination(
                            trackId: track.id,
                            scenario: scenario,
                            duration: nil
                        )) {
                            TrackCard(
                                track: track,
                                ragamName: ragams[track.ragamId]?.name,
                                isFavorite: favorites.contains(track.id),
                                scenario: scenario,
                                isFeatured: track.featuredScenarios.contains(scenario.rawValue),
                                onToggleFavorite: {
                                    Task { await toggleFavorite(trackId: track.id) }
                                }
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 16)
            }
        }
        .navigationTitle(scenario.label)
        .navigationBarTitleDisplayMode(.large)
        .task {
            await loadData()
        }
    }

    /// Featured tracks pinned to top, then newest-first by recorded_date
    private var sortedTracks: [Track] {
        tracks.sorted { a, b in
            let aFeatured = a.featuredScenarios.contains(scenario.rawValue)
            let bFeatured = b.featuredScenarios.contains(scenario.rawValue)
            if aFeatured != bFeatured { return aFeatured }
            return (a.recordedDate ?? "") > (b.recordedDate ?? "")
        }
    }

    private func loadData() async {
        do {
            async let tracksResult = supabase.fetchTracks(scenario: scenario)
            async let ragamsResult = supabase.fetchAllRagams()
            async let rasikaResult = supabase.fetchRasika()

            let (fetchedTracks, fetchedRagams, rasika) = try await (tracksResult, ragamsResult, rasikaResult)

            tracks = fetchedTracks
            ragams = Dictionary(uniqueKeysWithValues: fetchedRagams.map { ($0.id, $0) })
            favorites = Set(rasika?.favoriteTracks ?? [])
        } catch {
            // Silent fail
        }
        isLoading = false
    }

    private func toggleFavorite(trackId: String) async {
        do {
            let updated = try await supabase.toggleFavoriteTrack(trackId: trackId)
            favorites = Set(updated)
        } catch {}
    }
}
