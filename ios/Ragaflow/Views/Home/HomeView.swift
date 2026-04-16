import SwiftUI

struct HomeView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var rasika: Rasika?
    @State private var defaultTracks: [(scenario: Scenario, track: Track, durationSeconds: Int?)] = []
    @State private var allTracks: [Track] = []

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Header
                VStack(spacing: 8) {
                    Text("Ragaflow")
                        .font(.largeTitle)
                        .fontWeight(.semibold)
                        .tracking(-0.5)
                    Text("Indian classical ragas for focus, sleep & meditation")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 24)
                .padding(.bottom, 8)

                // Quick play defaults
                if !defaultTracks.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("QUICK PLAY")
                            .font(.caption)
                            .fontWeight(.medium)
                            .tracking(1)
                            .foregroundStyle(.secondary)

                        ForEach(defaultTracks, id: \.scenario) { item in
                            NavigationLink(value: PlayerDestination(
                                trackId: item.track.id,
                                scenario: item.scenario,
                                duration: item.durationSeconds.map { $0 / 60 }
                            )) {
                                QuickPlayRow(scenario: item.scenario, track: item.track, durationMinutes: item.durationSeconds.map { $0 / 60 })
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }

                // Scenario cards
                VStack(spacing: 12) {
                    ForEach(Scenario.allCases) { scenario in
                        NavigationLink(value: scenario) {
                            ScenarioCard(scenario: scenario)
                        }
                    }

                    // Explore card
                    NavigationLink(value: "explore") {
                        ExploreCard()
                    }
                }
                .padding(.horizontal)

                // Favorites count
                if let rasika, !rasika.favoriteTracks.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("FAVORITES")
                            .font(.caption)
                            .fontWeight(.medium)
                            .tracking(1)
                            .foregroundStyle(.secondary)
                        Text("\(rasika.favoriteTracks.count) favorited track\(rasika.favoriteTracks.count == 1 ? "" : "s")")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
            }
            .padding(.bottom, 32)
        }
        .navigationDestination(for: Scenario.self) { scenario in
            TrackListView(scenario: scenario)
        }
        .navigationDestination(for: String.self) { value in
            if value == "explore" {
                ExploreView()
            }
        }
        .navigationDestination(for: PlayerDestination.self) { dest in
            SessionPlayerView(trackId: dest.trackId, scenario: dest.scenario, initialDuration: dest.duration)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if supabase.currentUser != nil {
                    NavigationLink {
                        ProfileView()
                    } label: {
                        UserBadge()
                    }
                    .accessibilityLabel("Profile")
                } else {
                    NavigationLink {
                        AuthView()
                    } label: {
                        Text("Sign in")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .task {
            await loadData()
        }
    }

    private func loadData() async {
        do {
            rasika = try await supabase.fetchRasika()
            allTracks = try await supabase.fetchAllTracks()

            guard let rasika else { return }

            var defaults: [(Scenario, Track, Int?)] = []
            let mapping: [(Scenario, String?, Int?)] = [
                (.focus, rasika.defaultFocusTrack, rasika.defaultFocusDuration),
                (.sleep, rasika.defaultSleepTrack, rasika.defaultSleepDuration),
                (.meditate, rasika.defaultMeditateTrack, rasika.defaultMeditateDuration),
            ]

            for (scenario, trackId, dur) in mapping {
                if let trackId, let track = allTracks.first(where: { $0.id == trackId }) {
                    defaults.append((scenario, track, dur))
                }
            }

            defaultTracks = defaults
        } catch {
            // Data loads silently fail — same as web behavior
        }
    }
}

// MARK: - Navigation

struct PlayerDestination: Hashable {
    let trackId: String
    let scenario: Scenario
    let duration: Int? // minutes
}
