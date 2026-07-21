import SwiftUI

struct HomeView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var rasika: Rasika?
    @State private var allTracks: [Track] = []
    @State private var featuredTracks: [Track] = []
    @State private var suggestedTrack: Track?
    @State private var suggestedDurationMin: Int?

    /// Resolved once per appearance so the greeting/glow/suggested track stay stable.
    private let timeOfDay = TimeOfDay.current()

    /// Authenticated: "Welcome, <name>" or "Welcome".
    /// Anonymous: tagline so first-time visitors know what Ragaflow is.
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
            VStack(spacing: 0) {
                // Top bar: profile badge / sign-in pill
                HStack {
                    Spacer()
                    if supabase.currentUser != nil {
                        NavigationLink {
                            ProfileView()
                        } label: {
                            UserBadge()
                        }
                        // The badge's initial (e.g. "K") otherwise bleeds up as the
                        // button's a11y label; ignore children so "Profile" wins for
                        // VoiceOver, and pin an identifier for deterministic UI tests.
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("Profile")
                        .accessibilityIdentifier("Profile")
                    } else {
                        NavigationLink {
                            AuthView()
                        } label: {
                            Text("Sign in")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.warmCream)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.warmPill)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.top, 4)

                // Brand lockup
                VStack(spacing: 10) {
                    Text("Ragaflow")
                        .font(.system(size: 40, weight: .medium, design: .serif))
                        .foregroundStyle(Color.warmCream)
                    Text(subtitle)
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.warmCream.opacity(0.62))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 300)
                }
                .padding(.top, 28)
                .padding(.bottom, 36)

                // Tonight invitation (time-aware featured/default track)
                if let suggestedTrack {
                    NavigationLink(value: PlayerDestination(
                        trackId: suggestedTrack.id,
                        scenario: timeOfDay.scenario,
                        duration: suggestedDurationMin
                    )) {
                        TonightInvitationCard(
                            track: suggestedTrack,
                            scenario: timeOfDay.scenario,
                            durationMinutes: suggestedDurationMin,
                            eyebrowLabel: timeOfDay.label
                        )
                    }
                    .buttonStyle(.plain)
                }

                // Scenario cards
                VStack(spacing: 10) {
                    ForEach(Scenario.allCases) { scenario in
                        NavigationLink(value: scenario) {
                            HomeScenarioCard(scenario: scenario)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 28)

                // Two-up footer: Explore + Favorites
                HStack(spacing: 10) {
                    NavigationLink(value: "explore") {
                        ExploreFooterTile()
                    }
                    .buttonStyle(.plain)

                    NavigationLink(value: "explore") {
                        FavoritesFooterTile(count: rasika?.favoriteTracks.count ?? 0)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 22)
            }
            .frame(maxWidth: 400)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background {
            ZStack(alignment: .top) {
                Color.warmBackground
                // Candle glow — colored by time of day
                Circle()
                    .fill(timeOfDay.scenario.accentColor)
                    .frame(width: 280, height: 280)
                    .opacity(0.12)
                    .blur(radius: 70)
                    .offset(y: 40)
            }
            .ignoresSafeArea()
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(for: Scenario.self) { scenario in
            TrackListView(scenario: scenario)
        }
        .navigationDestination(for: String.self) { value in
            if value == "explore" {
                ExploreView()
            }
        }
        .navigationDestination(for: PlayerDestination.self) { dest in
            SessionPlayerView(trackId: dest.trackId, scenario: dest.scenario, initialDuration: dest.duration, autoplay: dest.autoplay)
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

            let (fetchedRasika, fetchedAllTracks, fetchedFeatured) =
                try await (rasikaResult, allTracksResult, featuredResult)

            rasika = fetchedRasika
            allTracks = fetchedAllTracks
            featuredTracks = fetchedFeatured
            computeSuggestedTrack()
        } catch {
            // Data loads silently fail — same as web behavior
        }
    }

    /// Mirrors web `getHomeData`: pick a time-appropriate featured track, then
    /// prefer the rasika's saved default for the current scenario.
    private func computeSuggestedTrack() {
        let scenario = timeOfDay.scenario
        var suggested: Track?
        var durationMin: Int?

        if scenario == .sleep {
            let sleepFeatured = allTracks.filter { $0.featuredScenarios.contains("sleep") }
            suggested = sleepFeatured.randomElement()
        }
        if suggested == nil {
            suggested = featuredTracks.first
        }

        if let rasika {
            let defaultTrackId: String?
            let defaultDuration: Int?
            switch scenario {
            case .focus:
                defaultTrackId = rasika.defaultFocusTrack
                defaultDuration = rasika.defaultFocusDuration
            case .sleep:
                defaultTrackId = rasika.defaultSleepTrack
                defaultDuration = rasika.defaultSleepDuration
            case .meditate:
                defaultTrackId = rasika.defaultMeditateTrack
                defaultDuration = rasika.defaultMeditateDuration
            }
            if let defaultTrackId, let track = allTracks.first(where: { $0.id == defaultTrackId }) {
                suggested = track
                durationMin = defaultDuration.map { $0 / 60 }
            }
        }

        suggestedTrack = suggested
        suggestedDurationMin = durationMin
    }
}

// MARK: - Time of day
//
// Mirrors web lib/time-of-day.ts. The per-window accent/accentLight map onto the
// scenario's own accent colors, so only the label + scenario are needed here.

enum TimeOfDay {
    case morning, midday, evening, night

    static func current(hour: Int? = nil) -> TimeOfDay {
        let h = hour ?? Calendar.current.component(.hour, from: Date())
        switch h {
        case 5..<12: return .morning
        case 12..<17: return .midday
        case 17..<21: return .evening
        default: return .night
        }
    }

    var label: String {
        switch self {
        case .morning: "This morning"
        case .midday: "A pause"
        case .evening: "Tonight"
        case .night: "Wind down"
        }
    }

    var scenario: Scenario {
        switch self {
        case .morning: .focus
        case .midday: .meditate
        case .evening, .night: .sleep
        }
    }
}

// MARK: - Navigation

struct PlayerDestination: Hashable {
    let trackId: String
    let scenario: Scenario
    let duration: Int? // minutes
    var autoplay: Bool = false
}
