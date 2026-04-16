import SwiftUI

struct ExploreView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var viewModel: ExploreViewModel?

    var body: some View {
        ScrollView {
            if let vm = viewModel {
                if vm.isLoading {
                    ProgressView()
                        .padding(.top, 100)
                } else {
                    VStack(alignment: .leading, spacing: 20) {
                        // Tag filter
                        tagFilterSection(vm: vm)

                        // Grouped tracks
                        ForEach(vm.groupedByRagam, id: \.ragam.id) { group in
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
                                            ragamName: nil,
                                            isFavorite: vm.favorites.contains(track.id),
                                            scenario: nil,
                                            onToggleFavorite: {
                                                Task { await vm.toggleFavorite(trackId: track.id) }
                                            }
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .padding(.horizontal)
                                }
                            }
                            .padding(.bottom, 8)
                        }

                        if vm.groupedByRagam.isEmpty {
                            Text("No tracks match the selected tags")
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                        }
                    }
                    .padding(.vertical, 16)
                }
            } else {
                ProgressView()
                    .padding(.top, 100)
            }
        }
        .navigationTitle("Explore")
        .navigationBarTitleDisplayMode(.large)
        .onAppear {
            if viewModel == nil {
                let vm = ExploreViewModel(supabase: supabase)
                viewModel = vm
                Task { await vm.loadData() }
            }
        }
    }

    @ViewBuilder
    private func tagFilterSection(vm: ExploreViewModel) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation { vm.tagsExpanded.toggle() }
            } label: {
                HStack(spacing: 4) {
                    Text("Filter by tag")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Image(systemName: vm.tagsExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                    if !vm.selectedTags.isEmpty {
                        Text("(\(vm.selectedTags.count))")
                            .font(.caption)
                            .foregroundStyle(Color(red: 0.72, green: 0.52, blue: 0.35))
                    }
                }
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            if vm.tagsExpanded {
                FlowLayout(spacing: 6) {
                    ForEach(vm.allTags, id: \.self) { tag in
                        Button {
                            vm.toggleTag(tag)
                        } label: {
                            Text(tag)
                                .font(.caption)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(vm.selectedTags.contains(tag) ? Color(red: 0.72, green: 0.52, blue: 0.35).opacity(0.3) : Color(.systemGray5))
                                .foregroundStyle(vm.selectedTags.contains(tag) ? Color(red: 0.72, green: 0.52, blue: 0.35) : .secondary)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal)

                if !vm.selectedTags.isEmpty {
                    Button("Clear filters") {
                        vm.clearFilters()
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                }
            }
        }
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
