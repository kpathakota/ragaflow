import SwiftUI

struct ExploreView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var viewModel: ExploreViewModel?

    var body: some View {
        ScrollView {
            if let vm = viewModel, !vm.isLoading {
                ExploreContent(vm: vm)
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
}

// MARK: - Content
//
// Split out so the @Observable view model can be bound (search field, filters)
// via @Bindable. Mirrors web app/explore/explore-client.tsx.

private struct ExploreContent: View {
    @Bindable var vm: ExploreViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            searchField
            filtersSection

            ForEach(vm.groupedByRagam, id: \.ragam.id) { group in
                ragamGroup(group)
            }

            if vm.groupedByRagam.isEmpty {
                emptyState
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 16)
    }

    // MARK: Search

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
            TextField("Search ragams, titles, moods…", text: $vm.query)
                .textFieldStyle(.plain)
                .font(.subheadline)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
            if !vm.query.isEmpty {
                Button {
                    vm.query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6).opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color(.systemGray4).opacity(0.5), lineWidth: 1)
                )
        )
    }

    // MARK: Filters

    private var filtersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Tag pills
            VStack(alignment: .leading, spacing: 8) {
                FlowLayout(spacing: 8) {
                    pill(label: "All", isOn: vm.selectedTag == nil) {
                        vm.selectedTag = nil
                    }
                    ForEach(vm.visibleTags, id: \.self) { tag in
                        pill(label: tag, isOn: vm.selectedTag == tag) {
                            vm.toggleTag(tag)
                        }
                    }
                }

                if vm.needsTagCollapse {
                    Button {
                        withAnimation { vm.tagsExpanded.toggle() }
                    } label: {
                        Text(vm.tagsExpanded ? "Show fewer tags" : "Show all tags")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }

            // Duration pills
            FlowLayout(spacing: 8) {
                ForEach(DurationFilter.allCases) { option in
                    pill(label: option.label, isOn: vm.duration == option) {
                        vm.duration = option
                    }
                }
            }

            // Access pills
            FlowLayout(spacing: 8) {
                ForEach(AccessFilter.allCases) { option in
                    pill(label: option.label, isOn: vm.access == option) {
                        vm.access = option
                    }
                }
            }

            // Active filter count + clear
            if vm.activeFilterCount > 0 {
                HStack {
                    Text("\(vm.activeFilterCount) filter\(vm.activeFilterCount == 1 ? "" : "s") active")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Clear filters") {
                        withAnimation { vm.clearFilters() }
                    }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.warmAccent)
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func pill(label: String, isOn: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isOn ? Color.warmAccent : Color(.systemGray5))
                .foregroundStyle(isOn ? .white : Color.secondary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: Ragam group

    @ViewBuilder
    private func ragamGroup(_ group: (ragam: Ragam, tracks: [Track])) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Text(group.ragam.name)
                    .font(.system(.title3, design: .serif))
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)

                if let timeOfDay = group.ragam.timeOfDay, !timeOfDay.isEmpty {
                    Text(timeOfDay.uppercased())
                        .font(.system(size: 11, weight: .medium))
                        .tracking(1.4)
                        .foregroundStyle(.secondary)
                }

                if !group.ragam.description.isEmpty {
                    Text(group.ragam.description)
                        .font(.system(.subheadline, design: .serif))
                        .italic()
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
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
            }
        }
        .padding(.bottom, 8)
    }

    // MARK: Empty state

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("No tracks match these filters.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if vm.activeFilterCount > 0 {
                Button("Clear filters") {
                    withAnimation { vm.clearFilters() }
                }
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.warmAccent)
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.top, 40)
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
