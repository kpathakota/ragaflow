import SwiftUI

struct HomeView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var rasika: Rasika?
    @State private var defaultTracks: [(scenario: Scenario, track: Track, durationSeconds: Int?)] = []
    @State private var featuredTracks: [Track] = []
    @State private var allTracks: [Track] = []
    @State private var ragams: [String: Ragam] = [:]

    /// Authenticated: "Welcome, <name>" or "Welcome"
    /// Anonymous: tagline so first-time visitors know what Ragaflow is
    private var subtitle: String {
        if supabase.currentUser != nil {
            if let name = rasika?.displayName, !name.isEmpty {
                return "Welcome, \(name)"
            }
            return "Welcome"
        }
        return "Indian classical ragas for focus, sleep & meditation"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Header
                VStack(spacing: 8) {
                    Text("Ragaflow")
                        .font(.largeTitle)
                        .fontWeight(.semibold)
                        .tracking(-0.5)
                    Text(subtitle)
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

                // Featured tracks
                if !featuredTracks.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("FEATURED")
                            .font(.caption)
                            .fontWeight(.medium)
                            .tracking(1)
                            .foregroundStyle(.secondary)

                        ForEach(featuredTracks) { track in
                            let scenario = track.scenarios.first ?? .focus
                            NavigationLink(value: PlayerDestination(
                                trackId: track.id,
                                scenario: scenario,
                                duration: nil
                            )) {
                                FeaturedTrackRow(track: track, scenario: scenario, ragamName: ragams[track.ragamId]?.name)
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
            async let rasikaResult = supabase.fetchRasika()
            async let allTracksResult = supabase.fetchAllTracks()
            async let featuredResult = supabase.fetchFeaturedTracks()
            async let ragamsResult = supabase.fetchAllRagams()

            let (fetchedRasika, fetchedAllTracks, fetchedFeatured, fetchedRagams) =
                try await (rasikaResult, allTracksResult, featuredResult, ragamsResult)

            rasika = fetchedRasika
            allTracks = fetchedAllTracks
            featuredTracks = fetchedFeatured
            ragams = Dictionary(uniqueKeysWithValues: fetchedRagams.map { ($0.id, $0) })

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

// MARK: - Featured Track Row

struct FeaturedTrackRow: View {
    let track: Track
    let scenario: Scenario
    let ragamName: String?

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(scenario.accentColor)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "play.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.white)
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(track.title ?? ragamName ?? "Untitled")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(scenario.accentColorLight)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    if let ragamName, track.title != nil {
                        Text(ragamName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text("·")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text("\(track.duration / 60)m")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6).opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(scenario.accentColor.opacity(0.4), lineWidth: 1)
                )
        )
    }
}

// MARK: - Navigation

struct PlayerDestination: Hashable {
    let trackId: String
    let scenario: Scenario
    let duration: Int? // minutes
}
