import SwiftUI

struct ExploreView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var tracks: [Track] = []
    @State private var ragams: [String: Ragam] = [:]
    @State private var favorites: Set<String> = []
    @State private var selectedTags: Set<String> = []
    @State private var isLoading = true
    @State private var tagsExpanded = false

    /// All unique tags across all tracks, sorted alphabetically
    private var allTags: [String] {
        let tags = Set(tracks.flatMap(\.tags))
        return tags.sorted()
    }

    /// Tracks filtered by selected tags
    private var filteredTracks: [Track] {
        if selectedTags.isEmpty { return tracks }
        return tracks.filter { track in
            !selectedTags.isDisjoint(with: track.tags)
        }
    }

    /// Filtered tracks grouped by ragam, sorted by ragam name
    private var groupedByRagam: [(ragam: Ragam, tracks: [Track])] {
        let grouped = Dictionary(grouping: filteredTracks) { $0.ragamId }
        return grouped.compactMap { ragamId, tracks in
            guard let ragam = ragams[ragamId] else { return nil }
            let sorted = tracks.sorted { ($0.recordedDate ?? "") > ($1.recordedDate ?? "") }
            return (ragam, sorted)
        }
        .sorted { $0.ragam.name < $1.ragam.name }
    }

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView()
                    .padding(.top, 100)
            } else {
                VStack(alignment: .leading, spacing: 20) {
                    // Tag filter
                    tagFilterSection

                    // Grouped tracks
                    ForEach(groupedByRagam, id: \.ragam.id) { group in
                        VStack(alignment: .leading, spacing: 12) {
                            Text(group.ragam.name)
                                .font(.title3)
                                .fontWeight(.semibold)
                                .padding(.horizontal)

                            if let description = group.ragam.description as String?, !description.isEmpty {
                                Text(description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .padding(.horizontal)
                            }

                            ForEach(group.tracks) { track in
                                NavigationLink(value: PlayerDestination(
                                    trackId: track.id,
                                    scenario: track.scenarios.first ?? .focus,
                                    duration: nil
                                )) {
                                    TrackCard(
                                        track: track,
                                        ragamName: nil, // Already shown in group header
                                        isFavorite: favorites.contains(track.id),
                                        scenario: nil,
                                        onToggleFavorite: {
                                            Task { await toggleFavorite(trackId: track.id) }
                                        }
                                    )
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal)
                            }
                        }
                        .padding(.bottom, 8)
                    }

                    if groupedByRagam.isEmpty {
                        Text("No tracks match the selected tags")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 40)
                    }
                }
                .padding(.vertical, 16)
            }
        }
        .navigationTitle("Explore")
        .navigationBarTitleDisplayMode(.large)
        .task {
            await loadData()
        }
    }

    @ViewBuilder
    private var tagFilterSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation { tagsExpanded.toggle() }
            } label: {
                HStack(spacing: 4) {
                    Text("Filter by tag")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Image(systemName: tagsExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                    if !selectedTags.isEmpty {
                        Text("(\(selectedTags.count))")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                }
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            if tagsExpanded {
                FlowLayout(spacing: 6) {
                    ForEach(allTags, id: \.self) { tag in
                        Button {
                            if selectedTags.contains(tag) {
                                selectedTags.remove(tag)
                            } else {
                                selectedTags.insert(tag)
                            }
                        } label: {
                            Text(tag)
                                .font(.caption)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(selectedTags.contains(tag) ? Color.green.opacity(0.3) : Color(.systemGray5))
                                .foregroundStyle(selectedTags.contains(tag) ? .green : .secondary)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal)

                if !selectedTags.isEmpty {
                    Button("Clear filters") {
                        selectedTags.removeAll()
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                }
            }
        }
    }

    private func loadData() async {
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

    private func toggleFavorite(trackId: String) async {
        do {
            let updated = try await supabase.toggleFavoriteTrack(trackId: trackId)
            favorites = Set(updated)
        } catch {}
    }
}

// MARK: - Flow Layout for tag chips

struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (CGSize(width: maxX, height: y + rowHeight), positions)
    }
}
