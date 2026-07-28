# Ragaflow iOS

Native iOS client for Ragaflow, built with SwiftUI. Lives in the `ios/` directory of the ragaflow monorepo, sharing the same Supabase backend as the web app.

## Setup

1. Open Xcode → Create new project → **App** (SwiftUI lifecycle, iOS 17+, bundle ID `com.ragaflow.app`)
2. Set the project location to `ios/` — Xcode will create `.xcodeproj` here
3. Drag the existing `Ragaflow/` folder contents into the Xcode project navigator
4. Add Supabase Swift SDK: File → Add Package Dependencies → `https://github.com/supabase/supabase-swift` (version 2.0.0+)
5. Copy `Configuration/Secrets.xcconfig.example` to `Configuration/Debug.xcconfig`, fill in your staging Supabase credentials
6. In Xcode project settings → Info → Configurations, set Debug to use `Debug.xcconfig`
7. Enable Background Modes capability → Audio, AirPlay, and Picture in Picture
8. Build and run

## Running tests

Model tests run via Swift Package Manager (no Xcode project needed):

```bash
cd ios
swift test
```

## Xcode Cloud

CI is configured via `ci_scripts/ci_post_clone.sh`. In App Store Connect:

1. Create a new Xcode Cloud workflow for this repo
2. Set the source path to `ios/`
3. Add environment variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (production values)
4. Set trigger: push to `dev` branch
5. Action: Archive → Distribute to TestFlight (internal testing)

## Architecture

- **Models/** — Swift structs mirroring `lib/types.ts` from the web app
- **Services/SupabaseService** — Auth, data access, favorites, sessions, certifications
- **Services/AudioService** — AVPlayer streaming, background audio, lock screen controls, volume fade
- **Views/** — SwiftUI views organized by feature (Home, Auth, Scenarios, Player, Explore, Profile)
- **Components/** — Reusable UI (ScenarioCard, TrackCard, UserBadge, FlowLayout)
- **Configuration/** — xcconfig files for Supabase env vars (gitignored)

## Structure

```
ios/
├── Package.swift                  ← SPM manifest for model tests
├── ci_scripts/
│   └── ci_post_clone.sh           ← Xcode Cloud secret injection
├── Ragaflow/
│   ├── App/
│   │   ├── RagaflowApp.swift      ← @main, initializes Supabase
│   │   └── ContentView.swift      ← Auth gate → Home
│   ├── Models/                    ← Mirrors lib/types.ts exactly
│   │   ├── Scenario.swift         ← Enum + colors (blue/indigo/amber)
│   │   ├── Ragam.swift
│   │   ├── Track.swift            ← displayName, durationFormatted helpers
│   │   ├── Rasika.swift           ← SubscriptionStatus enum
│   │   ├── ListeningSession.swift
│   │   └── Certification.swift    ← TierInfo, computeCountableSeconds
│   ├── Services/
│   │   ├── SupabaseService.swift  ← All Supabase operations
│   │   └── AudioService.swift     ← AVPlayer, looping, Now Playing, volume fade
│   ├── Views/
│   │   ├── Auth/AuthView.swift
│   │   ├── Home/HomeView.swift
│   │   ├── Scenarios/TrackListView.swift
│   │   ├── Player/SessionPlayerView.swift
│   │   ├── Explore/ExploreView.swift
│   │   └── Profile/ProfileView.swift
│   ├── Components/
│   │   ├── ScenarioCard.swift     ← + ExploreCard + QuickPlayRow
│   │   ├── TrackCard.swift
│   │   └── UserBadge.swift
│   ├── Configuration/
│   │   ├── Debug.xcconfig         ← Staging creds (gitignored)
│   │   ├── Release.xcconfig       ← Production creds (gitignored)
│   │   └── Secrets.xcconfig.example
│   └── Resources/
│       ├── Assets.xcassets        ← App icon
│       └── Info.plist
└── Tests/
    └── RagaflowModelTests/        ← Unit tests (swift test)
```

## Milestones

- **M0:** Project scaffolding, Xcode Cloud pipeline, tests ← current
- **M1:** Audio streaming (AVPlayer), background playback, lock screen controls, TestFlight alpha
- **M2:** Feature parity with web (favorites, defaults, certs, explore verified end-to-end)
- **M3:** Apple IAP via StoreKit 2
- **M4:** Offline downloads

See `docs/archive/ios-plan.md` for the full implementation plan.
