# Ragaflow iOS App — Implementation Plan

## Overview

Native iOS app built in Swift/SwiftUI, sharing the same Supabase backend as the web app. This is a **separate Xcode project** (separate repo) that talks to the same Supabase tables and R2 audio storage.

Two things change fundamentally from the web app:
1. **Payments** — Apple requires StoreKit for in-app purchases. Polar.sh is web-only. The iOS app must use native Apple IAP.
2. **Offline downloads** — iOS users expect to download tracks for offline listening. This means local file management, background downloads, and storage tracking.

Everything else (auth, data model, audio streaming, favorites, timers, certifications) maps directly from the web app with a SwiftUI implementation.

---

## Prerequisites & Tooling (Milestone 0)

**Goal:** Machine is ready to build, run, and test an iOS app in Swift.

### Required installs

| Tool | Purpose | Install |
|------|---------|---------|
| **Xcode 16+** | IDE, compiler, simulator, Instruments | Mac App Store (requires macOS 15+) |
| **Xcode Command Line Tools** | `xcodebuild`, `swift`, `simctl` | `xcode-select --install` |
| **Apple Developer Account** | Code signing, App Store, TestFlight | [developer.apple.com](https://developer.apple.com) ($99/yr) |
| **Swift Package Manager** | Dependency management | Built into Xcode (no separate install) |
| **SwiftLint** | Linting | `brew install swiftlint` |
| **Fastlane** (optional) | Build automation, screenshots, TestFlight uploads | `brew install fastlane` |

### Apple Developer Program setup

- [x] Enroll in Apple Developer Program ($99/year) if not already enrolled
- [ ] Create App ID (bundle identifier: `io.ragaflow.app` or similar)
- [ ] Create provisioning profiles (development + distribution)
- [ ] Enable capabilities: Background Modes (audio), Push Notifications (future)
- [ ] Set up App Store Connect listing (name, description, screenshots come later)

### Verification checklist

```bash
# Verify Xcode
xcodebuild -version          # Should show Xcode 16.x

# Verify Swift
swift --version               # Should show Swift 6.x

# Verify simulator
xcrun simctl list devices     # Should list available simulators

# Verify signing
security find-identity -v -p codesigning  # Should show dev certificate
```

### Project creation

```
Ragaflow-iOS/
├── Ragaflow.xcodeproj
├── Ragaflow/
│   ├── App/
│   │   ├── RagaflowApp.swift          # @main entry point
│   │   └── ContentView.swift
│   ├── Models/                        # Mirror of lib/types.ts
│   ├── Services/                      # Supabase, audio, StoreKit
│   ├── Views/                         # SwiftUI views by feature
│   │   ├── Home/
│   │   ├── Scenarios/
│   │   ├── Player/
│   │   ├── Explore/
│   │   ├── Profile/
│   │   └── Auth/
│   ├── Components/                    # Reusable UI components
│   ├── Extensions/
│   └── Resources/
│       ├── Assets.xcassets
│       └── Info.plist
├── RagaflowTests/
├── RagaflowUITests/
└── Package.swift (or use Xcode SPM)
```

### Dependencies (Swift Package Manager)

| Package | Purpose |
|---------|---------|
| [`supabase-swift`](https://github.com/supabase/supabase-swift) | Auth, database, realtime |
| No audio library needed | `AVFoundation` is built-in |
| No StoreKit library needed | `StoreKit 2` is built-in |

---

## Milestone 1 — Launchable iOS App (Shell + Auth + Navigation)

**Goal:** An app you can install on a phone that connects to Supabase, authenticates, and navigates the scenario flow — but does NOT play audio yet.

### 1.1 Project scaffolding

- Create Xcode project (SwiftUI lifecycle, iOS 17+ deployment target)
- Add `supabase-swift` via SPM
- Configure Supabase URL + publishable key (via `xcconfig` or `Info.plist`, NOT hardcoded)
- Set up dark-only appearance (`UIUserInterfaceStyle = Dark` in Info.plist)
- Basic app icon placeholder

### 1.2 Data models

Mirror `lib/types.ts` into Swift structs. All `Codable` + `Identifiable`:

```swift
struct Ragam: Codable, Identifiable { ... }
struct Track: Codable, Identifiable { ... }
struct Rasika: Codable, Identifiable { ... }
struct ListeningSession: Codable, Identifiable { ... }
struct Certification: Codable, Identifiable { ... }
enum Scenario: String, Codable, CaseIterable { case focus, sleep, meditate }
```

### 1.3 Supabase service layer

- `SupabaseService` singleton wrapping the Supabase Swift client
- Auth methods: `signIn(email:password:)`, `signUp(email:password:)`, `signOut()`, `currentUser`
- Data methods: `fetchRagams()`, `fetchTracks(scenario:)`, `fetchRasika()` — same queries as `lib/data.ts`
- Auth state observation via `supabase.auth.onAuthStateChange`

### 1.4 Navigation & views (no audio yet)

| Screen | Web equivalent | Notes |
|--------|----------------|-------|
| **Home** | `app/page.tsx` | Scenario cards (Focus/Sleep/Meditate/Explore), personalized defaults if set |
| **Auth** | `app/auth/page.tsx` | Email sign-in/sign-up form, matches web flow |
| **Track List** | `app/mode/[scenario]/page.tsx` | Flat list of tracks for selected scenario |
| **Explore** | `app/explore/page.tsx` | All tracks grouped by ragam, tag filter chips |
| **Profile** | `app/profile/page.tsx` | Account info, stats, certifications, sign-out |
| **Session Player** | `app/mode/[scenario]/[trackId]/session-player.tsx` | Placeholder — UI layout only, no audio |

- Use `NavigationStack` for routing
- `@Observable` view models per screen (or `@StateObject` if targeting iOS 16)
- Scenario colors match web: Focus (blue), Sleep (indigo), Meditate (amber), Explore (emerald)

### 1.5 Auth flow

- App launches → check Supabase session
- No session → show Auth screen
- Session exists → show Home
- Sign-out from Profile → return to Auth
- Supabase email confirmation callback: register URL scheme or use ASWebAuthenticationSession

### Milestone 1 deliverable

An app on TestFlight (or just Simulator) that:
- Signs in / signs up via Supabase
- Shows scenario selection, track lists, explore page, profile
- Navigates to a session player screen (with track metadata, timer UI, but no audio)
- Dark theme, scenario colors correct
- Data loads from the same Supabase staging project as the web app

---

## Milestone 2 — Audio Playback (Streaming)

**Goal:** Play tracks from Cloudflare R2, with background audio, lock screen controls, and timer functionality.

### 2.1 Audio engine

- `AudioService` singleton wrapping `AVAudioPlayer` or `AVPlayer`
- `AVPlayer` is the better choice here — it streams from URLs natively (R2 audio URLs are direct HTTP)
- Configure `AVAudioSession` category: `.playback` (allows background audio)
- Enable "Audio, AirPlay, and Picture in Picture" background mode in Xcode capabilities

### 2.2 Playback features

| Feature | Implementation |
|---------|---------------|
| Play / pause | `AVPlayer.play()` / `.pause()` |
| Looping | `AVPlayerLooper` with `AVQueuePlayer` |
| Background audio | `AVAudioSession.setCategory(.playback)` + background mode entitlement |
| Lock screen controls | `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter` |
| Volume fade (sleep) | Animate `AVPlayer.volume` over configurable duration |
| Audio interruption handling | Observe `AVAudioSession.interruptionNotification` |

### 2.3 Session player (full)

Complete the session player screen from Milestone 1:
- Timer: countdown with configurable duration (25 / 45 / custom)
- Play/pause button
- Ragam name, track description, artist note (expandable)
- Favorite toggle (heart icon)
- "Set as default" prompt after session ends
- Scenario color theming

### 2.4 Timer logic

- Same rules as web: focus counts only completed sessions, sleep always counts, meditate counts >= 5 min
- Timer runs via `Timer.publish` or `DispatchSourceTimer`
- Session logging: write `ListeningSession` to Supabase on session end
- Certification upsert after each session (same logic as web `lib/sessions.ts`)

### 2.5 Now Playing integration

```swift
let nowPlayingInfo: [String: Any] = [
    MPMediaItemPropertyTitle: track.ragamName,
    MPMediaItemPropertyArtist: "Ragaflow",
    MPNowPlayingInfoPropertyElapsedPlaybackTime: currentTime,
    MPMediaItemPropertyPlaybackDuration: track.duration
]
MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
```

Register remote command handlers for play, pause, skip (if applicable).

### Milestone 2 deliverable

The app plays audio from R2, continues in background, shows on lock screen, supports all timer modes, and logs sessions to Supabase.

---

## Milestone 3 — Feature Parity with Web

**Goal:** Everything the web app does, the iOS app does too.

### 3.1 Favorites

- Toggle favorite tracks and ragams (same Supabase columns: `favorite_tracks[]`, `favorite_ragams[]`)
- Heart icon on track cards and session player
- Optimistic UI updates

### 3.2 Defaults

- Set default track per scenario
- One-tap quick play from home screen
- Persist to `rasikas` table (same columns as web)

### 3.3 Certifications

- Compute per-ragam listening time from `listening_sessions`
- Display tier badges (Bronze/Silver/Gold/Platinum) + progress bars on Profile
- Same thresholds: 10h / 50h / 100h / 250h

### 3.4 Explore

- All tracks grouped by ragam
- Tag filter chips (collapsible, matching the web implementation)
- Search within ragam names

### 3.5 Personalized home

- If rasika has defaults: show one-tap play buttons per scenario at top
- Otherwise: scenario selection cards

### 3.6 Track cards

- Ragam name, recording date, location, duration, tags, description (line-clamped)
- Heart icon for favorites
- Premium badge for non-free tracks

### Milestone 3 deliverable

Feature parity with the web app. A rasika using both platforms sees the same data, favorites, defaults, and certifications.

---

## Milestone 4 — Payments (Apple IAP via StoreKit 2)

**Goal:** Rasikas can subscribe or buy lifetime access through the App Store.

### Why this is different from web

- Apple requires all digital content purchases go through Apple IAP (30% cut, 15% for small businesses)
- Polar.sh cannot be used for iOS payments
- The same tiers exist but are purchased via StoreKit, not Polar
- Both payment systems write to the same `subscription_status` column on the `rasikas` table

### 4.1 App Store Connect setup

Create products in App Store Connect:

| Product | Type | Price | Product ID |
|---------|------|-------|------------|
| Monthly | Auto-renewable subscription | $4.99/mo | `io.ragaflow.monthly` |
| Yearly | Auto-renewable subscription | $29.99/yr | `io.ragaflow.yearly` |
| Lifetime | Non-consumable IAP | $99.99 | `io.ragaflow.lifetime` |

> Note: Sponsor tier ($300) stays web-only — not in the App Store.

Create a subscription group in App Store Connect for monthly + yearly.

### 4.2 StoreKit 2 implementation

```swift
// ProductService.swift
import StoreKit

class StoreService: ObservableObject {
    @Published var products: [Product] = []
    @Published var purchasedProductIDs: Set<String> = []

    func fetchProducts() async {
        products = try await Product.products(for: [
            "io.ragaflow.monthly",
            "io.ragaflow.yearly",
            "io.ragaflow.lifetime"
        ])
    }

    func purchase(_ product: Product) async throws -> Transaction? {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await syncToSupabase(transaction)
            await transaction.finish()
            return transaction
        case .userCancelled, .pending:
            return nil
        @unknown default:
            return nil
        }
    }

    func listenForTransactions() -> Task<Void, Error> {
        Task.detached {
            for await result in Transaction.updates {
                let transaction = try self.checkVerified(result)
                await self.syncToSupabase(transaction)
                await transaction.finish()
            }
        }
    }
}
```

### 4.3 Syncing IAP status to Supabase

Two approaches (pick one):

**Option A: Client-side sync (simpler, less secure)**
- After successful purchase, the iOS app updates `rasikas.subscription_status` directly via Supabase
- Relies on the StoreKit transaction being verified client-side
- Vulnerable to jailbreak tampering (acceptable at our scale)

**Option B: Server-side receipt validation (more secure)**
- iOS app sends the signed transaction (JWS) to a server endpoint
- Server verifies with Apple's App Store Server API
- Server updates `rasikas.subscription_status` in Supabase
- Requires a new API route (could be a Supabase Edge Function or a separate server)
- Apple also sends [App Store Server Notifications V2](https://developer.apple.com/documentation/appstoreservernotifications) for renewals, cancellations, billing issues — similar to Polar webhooks

**Recommendation:** Start with **Option A** for launch speed. Move to **Option B** before significant subscriber count. The `subscription_status` values remain the same regardless of which option is used.

### 4.4 Coexistence with Polar (web)

Both payment systems write to the same `subscription_status` column:

```
Web purchase (Polar webhook)  →  rasikas.subscription_status = 'active' / 'lifetime'
iOS purchase (StoreKit sync)  →  rasikas.subscription_status = 'active' / 'lifetime'
```

A rasika who subscribes on web is recognized on iOS and vice versa. The `polar_customer_id` column is only used by Polar; StoreKit uses its own `originalTransactionId` for tracking (store this in a new column or a separate table if needed).

**Edge case — double subscription:** A rasika subscribes on both web and iOS. Both systems set `active`. When one cancels, the other is still active. This is rare and acceptable — handle it manually if it ever comes up.

### 4.5 Subscription UI

- Profile screen: "Go Premium" card (same as web)
- Tapping opens a native StoreKit product sheet or custom subscription view
- Show current status for subscribers
- "Restore Purchases" button (required by App Store Review Guidelines)
- `AppStore.sync()` for restore functionality

### 4.6 10-hour listening gate

Same logic as web:
- Compute `totalListeningSeconds` from `listening_sessions`
- Under 10h: all tracks playable, premium tracks tagged
- Over 10h + not subscribed: premium tracks greyed out with subscribe CTA
- Subscribed: all tracks playable

### Milestone 4 deliverable

Rasikas can subscribe or buy lifetime access via Apple IAP. Status syncs to Supabase. Web and iOS subscriptions are interchangeable.

---

## Milestone 5 — Offline Downloads

**Goal:** Subscribed rasikas can download tracks for offline listening.

### 5.1 Download manager

```swift
class DownloadService: ObservableObject {
    @Published var downloads: [String: DownloadState] = [:]  // trackId → state

    enum DownloadState {
        case notDownloaded
        case downloading(progress: Double)
        case downloaded(localURL: URL)
        case failed(Error)
    }

    func download(track: Track) async { ... }
    func deleteDownload(trackId: String) { ... }
    func localURL(for trackId: String) -> URL? { ... }
    func totalStorageUsed() -> Int64 { ... }
}
```

### 5.2 Storage

- Download audio files to app's `Documents` directory (persists across app updates, backed up to iCloud)
- Or use `Library/Caches` if you don't want iCloud backup (user can re-download)
- Track download state in a local SQLite database or Core Data store (not Supabase — this is device-local)
- Store metadata alongside: track ID, ragam name, file size, download date

### 5.3 Background downloads

- Use `URLSession` with `background` configuration for downloads that continue when the app is backgrounded
- Handle `application(_:handleEventsForBackgroundURLSession:completionHandler:)` delegate callback
- Show download progress in UI (progress bar on track cards)

### 5.4 Playback integration

When playing a track:
1. Check if local file exists via `DownloadService.localURL(for: trackId)`
2. If yes → play from local file (no network needed)
3. If no → stream from R2 URL (existing behavior)

### 5.5 UI

- Download button on track cards and session player (for subscribed rasikas only)
- Download progress indicator
- "Downloaded" badge on offline-available tracks
- Settings screen: total storage used, "Delete All Downloads" option
- Track-level delete: swipe to delete individual downloads

### 5.6 Access control for downloads

- Only subscribed rasikas (`active`, `lifetime`) can initiate downloads
- If subscription expires → downloaded files remain playable (grace period? or lock immediately?)
  - **Recommendation:** Lock immediately — show "Subscribe to play" overlay on downloaded premium tracks. Free tracks remain playable offline.
- If rasika re-subscribes → downloads become playable again without re-downloading

### Milestone 5 deliverable

Subscribed rasikas can download tracks, play them offline, manage storage. Downloads respect subscription status.

---

## What's NOT in this plan (future milestones)

- Apple Watch integration
- CarPlay support
- Push notifications (new tracks, reminders)
- Widget (quick-play scenario defaults from home screen)
- Haptic feedback for timer completion
- Apple Sign-In (auth provider addition in Supabase)
- Track of the Day
- Journal / mood check-in
- Adaptive playback

---

## Architecture Decisions

### Shared backend, separate frontends

The iOS app is a **new client** to the existing Supabase backend. No new tables or API routes are needed for Milestones 1–3. Milestone 4 (payments) may add a column for Apple transaction IDs. Milestone 5 (downloads) is entirely client-side storage.

### Why native Swift, not React Native or Flutter

- AVFoundation is the gold standard for iOS audio — background playback, AirPlay, lock screen controls, gapless looping all work natively with zero bridging
- StoreKit 2 is Swift-first — wrappers exist for RN/Flutter but add friction
- The app is primarily an audio player with simple UI — SwiftUI handles this well
- Two separate codebases (Next.js + SwiftUI) is fine at this scale — the data layer is Supabase, not duplicated business logic

### iOS deployment target

**iOS 17+** — gives access to SwiftUI improvements (Observable macro, SwiftData if needed), StoreKit 2 maturity, and modern AVFoundation APIs. Covers ~90% of active iPhones.

---

## Rough ordering & dependencies

```
Milestone 0: Tooling & project setup
    ↓
Milestone 1: Shell + auth + navigation (no audio)
    ↓
Milestone 2: Audio streaming + timers + sessions
    ↓
Milestone 3: Feature parity (favorites, defaults, certs, explore)
    ↓
Milestone 4: Apple IAP (StoreKit 2)      ← can be done in parallel with M3
    ↓
Milestone 5: Offline downloads           ← requires M4 (subscription check)
```

Milestones 1–3 are sequential — each builds on the previous. Milestone 4 can start in parallel with Milestone 3 since payments are independent of favorites/certs UI. Milestone 5 depends on Milestone 4 because downloads are gated on subscription status.

---

## App Store submission checklist (when ready)

- [ ] App icon (1024x1024)
- [ ] Screenshots for required device sizes (6.7", 6.1", etc.)
- [ ] Privacy policy URL
- [ ] App description, keywords, category (Music or Health & Fitness)
- [ ] Age rating questionnaire
- [ ] In-app purchase products approved in App Store Connect
- [ ] "Restore Purchases" button present (App Store requirement)
- [ ] Background audio entitlement justified in review notes
- [ ] Sign in with Apple (required if offering third-party sign-in — add to Supabase auth)
