# App Store Listing — Ragaflow (v1.0, free beta)

Copy-paste source for App Store Connect. Values chosen for the **free beta**
submission (no in-app purchases; StoreKit IAP returns in v1.1). Character limits
noted inline — App Store Connect enforces them.

---

## App information

| Field | Value |
|-------|-------|
| **App name** (30 char max) | `Ragaflow` |
| **Subtitle** (30 char max) | `Ragas for focus & sleep` (23) |
| **Bundle ID** | `com.ragaflow.app` |
| **SKU** | `ragaflow` |
| **Primary category** | Health & Fitness |
| **Secondary category** | Music |
| **Primary language** | English (U.S.) |
| **Age rating** | 4+ (no objectionable content) |

> **Category note:** Health & Fitness primary puts Ragaflow next to Calm /
> Headspace for the focus-sleep-meditation use case, which is the intended
> comparison set. Music secondary captures raga/Carnatic search traffic.

---

## Promotional text (170 char max — editable without a new build)

```
Indian classical ragas, chosen for how you want to feel. Pick a moment — focus, sleep, or meditation — and let a raga hold the space. New sessions added regularly.
```
(159 chars)

---

## Description (4000 char max)

```
Ragaflow turns the depth of Indian classical music into a tool for everyday focus, rest, and stillness.

Instead of browsing a library, you start with a moment:

• FOCUS — sustained, uncluttered ragas for deep work and study
• SLEEP — slow, settling ragas for winding down and drifting off
• MEDITATE — spacious ragas for breathwork and contemplation

Every session is a real recording built around a ragam — the melodic framework at the heart of Indian classical music. Tracks are tagged to moods and moments, not locked to a single use, so the same raga can carry you through a work sprint one afternoon and into sleep that night.

WHAT YOU CAN DO
• Play uninterrupted, looping sessions with a built-in timer
• Keep listening in the background and from your lock screen
• Favorite the ragas and recordings that work for you
• Set a default track per moment for one-tap play
• Explore the full collection by ragam, mood, or tag
• Track your listening and earn certifications as you go deeper into each ragam

BUILT FOR LISTENERS (RASIKAS)
Ragaflow is made for anyone who wants the calm and concentration that Indian classical music brings — whether you grew up with these ragas or are hearing them for the first time. No music theory required. Just choose a moment and press play.

This is an early release. New recordings are added regularly, and your listening helps shape what comes next.

An account is required so your favorites, defaults, and progress stay with you across devices.
```
(~1,180 chars — room to grow)

---

## Keywords (100 char max, comma-separated, no spaces)

```
raga,indian classical,carnatic,focus,meditation,sleep,ambient,calm,study,mindfulness,relax
```
(90 chars — full words only; no truncation. Room to add one more term if you
want, e.g. `,carnatic music` won't fit but a short one like `,tanpura` would.)

> Don't repeat words already in the app name/subtitle ("Ragaflow", "sleep")
> unnecessarily — Apple indexes those separately. The list above front-loads the
> highest-intent terms.

---

## URLs

| Field | Value | Status |
|-------|-------|--------|
| **Marketing URL** | `https://ragaflow.io` | ✅ live |
| **Support URL** | `https://ragaflow.io/support` (or a `mailto:` fallback) | ⚠️ create — a simple contact page or `mailto:support@ragaflow.io` |
| **Privacy Policy URL** | `https://ragaflow.io/privacy` | ⚠️ **required** — host `docs/privacy-policy.md` content here before submit |

> Apple **rejects** submissions without a reachable Privacy Policy URL. This is
> the one URL that blocks review — prioritize it.

---

## App Privacy (nutrition labels)

Answer the App Privacy questionnaire in ASC to match what the app actually does.
Ragaflow collects:

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
|-----------|-----------|---------------------|--------------------|---------|
| **Email address** | Yes | Yes | No | Account authentication (Supabase) |
| **User ID** | Yes | Yes | No | App functionality (favorites, sessions, certs) |
| **Product interaction** (plays, sessions, screen views) | Yes | Yes (when signed in) | No | Analytics & app functionality |
| **Crash / performance data** | No | — | — | — |
| **Advertising data** | No | — | — | — |

- **No third-party ad SDKs. No cross-app tracking.** Answer "No" to App Tracking
  Transparency — the app does not track users across other companies' apps/sites,
  so no ATT prompt is required.
- All data lives in the app's own Supabase backend; nothing is sold or shared
  with data brokers.

---

## App Review notes (paste into "Notes" for the reviewer)

```
Ragaflow streams Indian classical music sessions for focus, sleep, and meditation.

DEMO ACCOUNT (required — the app gates content behind sign-in):
  email:    kpathakota+alt@gmail.com
  password: alt123

BACKGROUND AUDIO: The app uses the Audio background mode so a session keeps
playing when the screen locks or the app is backgrounded — this is core to the
product (users start a focus/sleep session and put the phone down). Lock-screen
transport controls are provided via MPNowPlayingInfoCenter / MPRemoteCommandCenter.

PAYMENTS: This version has no in-app purchases. All content is free. (A
subscription tier is planned for a later update via StoreKit.)

Audio is streamed from our CDN (Cloudflare R2). An internet connection is
required to play.
```

> The credentials above are the UI-test account (`kpathakota+alt@gmail.com` /
> `alt123`), verified logging in on **production** Supabase and used by the
> screenshot/UI test suite. Treat it as a **disposable, review-only** login:
> it's committed in plaintext, so rotate the password after the review passes
> (and update the test files + this doc when you do). The older
> `kpathakota+test@gmail.com` account is dead on prod — do not use it.

---

## "What's New in This Version" (v1.0)

```
Welcome to Ragaflow — Indian classical ragas for focus, sleep, and meditation. This is our first public release. Choose a moment, press play, and tell us what works.
```

---

## Screenshots

Required sizes for a 2026 submission (App Store Connect will accept the largest
size and down-scale for others, but uploading both avoids surprises):

| Display | Device | Pixels (portrait) |
|---------|--------|-------------------|
| **6.9"** (required) | iPhone 16 Pro Max | 1320 × 2868 |
| **6.5"** (recommended) | iPhone 15 Plus / 11 Pro Max | 1284 × 2778 |

Captured via `ios/scripts/screenshot.sh --all --sign-in` on iPhone 16 Pro Max.
Suggested order for the listing (first 3 are what most users see):

1. **Home** — the moment picker + "Tonight" featured card (the hook)
2. **Session Player** — timer + breathing orb mid-session (the core loop)
3. **Explore** — the collection by ragam (depth/library)
4. **Track List** — a scenario's tracks (browsing)
5. **Profile** — stats + certifications (progress/retention)

> Optional but high-converting: add a one-line caption band above each shot
> ("Start with a moment", "Let a raga hold the space", "Go deeper into every
> ragam"). Not required to submit.

---

## Pre-submit blockers (owner: you, in App Store Connect)

- [ ] Privacy Policy URL live at `https://ragaflow.io/privacy`
- [ ] Support URL live (or `mailto:` fallback)
- [ ] Review demo account created + credentials in review notes
- [ ] 6.9" screenshots uploaded (from the capture run)
- [ ] App Privacy questionnaire completed (table above)
- [ ] Age rating questionnaire → 4+
- [ ] Build uploaded via Xcode Cloud (main workflow) or manual Archive
- [ ] Export compliance: uses only standard HTTPS encryption → answer "No" to
      the custom-encryption question (or add `ITSAppUsesNonExemptEncryption=false`
      to Info.plist to skip the prompt each build)
```
