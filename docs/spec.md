# Ragam Focus & Wellness App — Product Specification

## Executive Summary

A web and iOS application that uses the ancient Indian musical framework of Ragam—which maps specific melodic structures to emotional states—to help rasikas focus, meditate, and sleep. Unlike AI-generated ambient music, all content is human-improvised by Gautam (melody) and Kiran (percussion), offering an authentic, artisanal alternative to algorithmic soundscapes.

---

## Core Concept

**The Insight:** Ragam is a centuries-old system that codifies the relationship between melody, rhythm, and emotional states. This app packages that wisdom into a modern productivity and wellness tool—the ideal medium for ambient, improvised music.

**The Differentiator:** Every track is genuinely improvised by human musicians, rejecting the trend of machine-generated ambient music. Users aren't listening to an algorithm; they're listening to real artists channeling traditional knowledge.

---

## Target Users

| Segment | Use Case | Primary Scenarios |
|---------|----------|--------------|
| High school students | SAT prep, homework sessions | Focus timer |
| Adults with ADHD | Deep work, task completion | Focus timer |
| Knowledge workers | Flow state, concentration | Focus timer |
| Senior citizens | Relaxation, reading | Meditation |
| Meditation practitioners | Guided or unguided sits | Meditate timer |
| Sleep seekers | Falling and staying asleep | Sleep timer |

---

## Scenarios (Entry Points)

Users enter the app by selecting a scenario. There are three primary scenarios and one catch-all:

1. **Focus** — sustained concentration, deep work
2. **Sleep** — falling asleep, staying asleep
3. **Meditate** — stillness, presence, breathwork
4. **Explore** — browse all soundscapes by ragam, tag, or mood (catch-all)

Future scenarios (may be added later):
- **Energize** — motivation, movement, getting started
- **Relax** — calm, unwind, leisure reading
- **Wake Up** — gentle morning transition (inspired by SLEEP by Max Richter)

### Tag-based mapping (replaces mode-based mapping)

Tracks are **not** hard-mapped to a single scenario. Instead, each track has:
- **`scenarios[]`** — an editorial list of which top-level scenarios the track fits (e.g., `["focus", "meditate"]`). A single track can appear under multiple scenarios.
- **`tags[]`** — emotion/mood tags (e.g., `["grounding", "elation", "contemplative"]`). These are discovery aids, not rigid categories. They help rasikas find tracks that resonate with them.
- **description** - a free form description written by the artists talking about the scene at the venue, what happened, some context, poetry. 

Ragams themselves have no scenario mapping — they are purely melodic frameworks. The scenario and tag mapping lives on each **track**.

Tags are a curated editorial vocabulary. Examples: `grounding`, `elation`, `empathy`, `contemplative`, `devotion`, `calm`, `energizing`, `longing`, `surrender`, `warmth`. The full list will grow as content is added.

---

## Audio Architecture

### Content Format

- Long-form improvised recordings (30–90 minutes per Ragam)
- Seamless looping or graceful fade for timer-based sessions
- High-quality lossless audio with compressed streaming option

---

## Core Features

### 1. Timer Modes

#### Focus Timer
- Pomodoro-style or custom duration
- Visual progress indicator
- Gentle audio cue at completion (optional)
- Session logging

#### Sleep Timer
- Gradual volume fade over configurable period
- No jarring end—music dissolves
- Screen dims automatically
- App "falls asleep with you"

#### Wake Up Timer
- Gradual volume increase
- Morning Ragams (e.g., Bhairav family)
- Can serve as alarm replacement

#### Meditation Timer
- Interval bells (optional)
- Session length presets (5, 10, 20, 30, 60 min)
- Breath pacer overlay (optional)

#### Open Play
- No timer, continuous listening
- Background audio support

### 2. Ragam Library

Each Ragam entry includes:
- Name
- Brief description of its traditional usage
- Time of day association (if applicable)
- Available tracks (recordings)
- Rasika's listening progress and achievements for that ragam (going platinum)

Each Track entry includes:
- **Title** (nullable) — optional freeform name. When absent, the track is identified by its recording date and location.
- Ragam it belongs to
- Scenarios it appears under (editorial, not 1:1)
- Emotion/mood tags
- Duration
- **Recorded date** (`recorded_date`) — actual date the session was recorded. Displayed as a short date (e.g. "Jan 12"), used for sorting tracks newest-first within a ragam group.
- **Location** (`location`) — evocative editorial text describing where/how it was recorded (e.g. "At dawn by the Willamette", "Home studio, Portland"). Not just a city name — this is part of the editorial voice.
- **Description** — brief editorial context (1–2 sentences): time of day, mood, scenario fit. Always visible on the session player and on track cards (line-clamped).
- **Artist note** (`artist_note`) — Gautam's longer, personal voice: scene at the venue, what happened, poetry. Expandable/collapsible on the session player. Written by the artist per recording session.
- Streaming URL
- Download URL (paid only)
- Whether it's free-tier or requires subscription

### 3. Listening Progress & Achievements

**Album Certifications** (per Ragam)

| Hours Listened | Certification |
|----------------|---------------|
| 10 hours | Bronze |
| 50 hours | Silver |
| 100 hours | Gold |
| 250 hours | Platinum |

- Visual badges displayed on user profile (as tiny albums)
- Progress bars showing approach to next tier
- Optional social sharing
- Encourages deep listening over playlist skimming

### 4. Favorites & Defaults

Rasikas can:
- **Favorite tracks** — heart icon on session player and track cards
- **Favorite ragams** — heart icon on ragam pages
- **Set a default track per scenario** — one-tap play from the home screen for Focus, Sleep, and Meditate. After a session, the app prompts "Set as your default for [scenario]?"

The home screen transforms once a rasika has defaults:
- Top section shows one-tap play buttons for each scenario with the default track
- Scenario cards move below
- Recent favorites section at the bottom

### 5. Track of the Day

A single curated track featured daily on the homepage — gives the app a sense of liveness, editorial voice, and gravity.

**How it works:**
- Each day, one track from the existing library is selected as the "Track of the Day"
- An artist (Gautam or Kiran) writes a short blurb for that day's pick — a sentence or two about why this track, what mood it fits, a memory from the recording session, etc. This is distinct from the track's permanent `description` or `artist_note`
- The selection is stored as a simple date → track_id mapping with the daily blurb
- Any track in the library can be featured — no special content needed

**Homepage UI:**
- Featured prominently at the top of the homepage, above scenario cards
- Shows: ragam name, track title, daily blurb, and a play button
- Tapping play enters the session player directly (with the track's scenario context)
- Should feel curated and intentional — not algorithmic

**Selection mechanism:**
- A single row insert per day (in Supabase or via the Google Sheets content pipeline once built)
- Should be dead simple for the artists — no admin panel needed initially

**Data model — `track_of_the_day` table:**
- `date` (date, primary key) — one entry per day
- `track_id` (FK → tracks) — the featured track
- `blurb` (text) — artist-written daily note
- `selected_by` (text) — who picked it (Gautam, Kiran, etc.)

**Open questions:**
- Fallback behavior when no entry exists for today (hide section? show most recent?)
- Whether old picks should be browsable as an archive
- RLS: likely publicly readable (same as tracks)

### 6. Adaptive Playback

- Track which Ragams users skip vs. replay
- Surface favorites more often
- Learn preferred session lengths
- Personalize recommendations over time

### 7. Journal / Mood Check-In (Optional)

- Pre-session: "How are you feeling?" (quick mood selector)
- Post-session: "How do you feel now?"
- Over time, correlate Ragams with mood improvements
- Lightweight—not required, but available for users who want it
- This is the primary mode that rasikas can figure out which ragas provide which moods. The descriptions in the library are just suggestions but it encourages people to find their own taste 

### 8. Educational Layer

- Brief intro cards explaining each Ragam
- "Why this Ragam?" context for each emotional state
- Optional deeper content: history, scale structure, notable compositions

---

## User Experience Flow

```
Open App (new rasika)
    ↓
Select Scenario (Focus / Sleep / Meditate / Explore)
    ↓
Browse tracks (flat list, sorted newest-first; Explore groups by ragam)
    ↓
Track cards show: recording date · location, duration · ragam · tags, description
    ↓
Select Track → See ragam info, description, tags, listening progress
    ↓
Configure session:
    - Timer duration (or open play)
    - Percussion on/off
    - Drone tuning (optional)
    ↓
Begin session
    ↓
Session screen (top → bottom):
    - Ragam name as primary title + ♡ favorite (top-right)
    - Brief track description (always visible, 1–2 sentences)
    - Scenario color fill — center visual (placeholder; future: hand-drawn animation)
    - Artist note — collapsed by default, tap to expand/collapse
    - Play/pause + small timer — bottom third (~20% from bottom, one-thumb reach)
    ↓
Session ends → Log recorded → Progress updated → Certification check
    ↓
Prompt: "Set as your default for [scenario]?"

Open App (returning rasika with defaults)
    ↓
Home shows one-tap play for each scenario default
    ↓
Tap → Session starts immediately with default track
```

---

## Technical Requirements

### Platforms

- **Web App:** Responsive, works on desktop and mobile browsers
- **iOS App:** Native, supports background audio, lock screen controls, CarPlay (future)

### Audio

- Streaming with offline download option (premium)
- Gapless playback for loops
- Independent volume control per stem (requires multi-track mixing in real-time or pre-rendered mix levels)
- Support for multiple tuning frequencies

### Data & Sync

- Rasika accounts (email, Apple Sign-In, Google)
- Cloud sync of listening history, favorites, defaults, and achievements
- Local caching for offline sessions

### Notifications

- Gentle reminders ("Time for your evening wind-down?")
- Achievement unlocks
- New Ragam releases

---

## Visual Design Direction

Inspired by SLEEP by Max Richter's cosmic/celestial theme, but adapted for Indian classical context:

- **Nature imagery** tied to traditional Ragam time associations (dawn, dusk, water, sky, night)
- **Minimal, dark UI** for sleep/meditation modes
- **Progress visualization** — mandalas that complete, or a journey through a landscape (instead of planets)
- **Calming animations** that users can watch or ignore

### UX Behaviors

- Screen dims progressively during sleep sessions
- Volume fades over configurable period
- App enters low-power state (no sudden notifications)
- Gradual volume increase for wake-up mode

---

## Competitive Analysis: SLEEP by Max Richter

### What They Do Well

- **Artist-centric branding** — the app *is* Max Richter's music
- **Four core modes:** Fall Asleep, Wake Up, Meditate, Focus
- **Adaptive personalization:** music adapts to user preferences (skip = less frequent; volume up = more frequent)
- **Apple Watch integration:** syncs music tempo to heartbeat
- **Progression system:** users "traverse a digital solar system" as they use the app
- **Business model:** completely free, requires Apple Music or Spotify Premium
- **Minimal, gorgeous design** with calming planetary visuals
- **Journaling feature** for mood tracking

### Our Differentiation

| SLEEP by Max Richter | Ragam App |
|----------------------|-----------|
| Single Western composer | Two Indian classical artists |
| Pre-composed, arranged music | Genuinely improvised recordings |
| Streams via Spotify/Apple Music | Self-hosted audio (or hybrid) |
| Heartbeat sync via Apple Watch | Drone tuning to user-selected frequencies |
| Planetary progression system | Album certification (Bronze → Platinum) per Ragam |
| Modern classical aesthetic | Ancient tradition meets modern wellness |

### Positioning Statement

> **SLEEP by Max Richter** is modern classical music engineered for rest.
>
> **Ragaflow** is ancient melodic science—Ragam—performed live and unscripted, to help you focus, meditate, and sleep.
>
> One is composed. Ours is improvised.
> One is Western. Ours is rooted in thousands of years of Indian tradition.
> Both reject algorithmic ambient noise in favor of human artistry.

---

## Monetization

**Primary model: Free + Premium tracks with a 10-hour listening gate**

### Track access model

- **Free tracks** (`free: true`) — ~5–10 tracks, always playable by any rasika, no subscription required, no gate
- **Premium tracks** (`free: false`) — the rest of the library. Playable by everyone for free until the 10-hour gate, then subscription-only
- **Transparency principle:** rasikas always know what's free vs. premium before tapping. Premium tracks show a subtle "Premium" tag on track cards at all times — not just after the gate

### The 10-hour gate

- **Metric:** raw `totalListeningSeconds` — the sum of `duration_seconds` from all `listening_sessions`. Same number already displayed in profile stats. Not filtered through certification counting rules.
- **Under 10 hours:** all tracks playable, premium tracks tagged but not blocked
- **Over 10 hours + not subscribed:** premium tracks greyed out on track lists with a subscribe CTA. Free tracks always playable. Profile, listening journey, and favorites remain accessible.
- **Subscribed rasikas:** all tracks playable regardless of hours

### Subscription tiers

| Tier | Price | Notes |
|------|-------|-------|
| Monthly | $5/mo | "Buy us a coffee" |
| Yearly | $30/yr | "Buy an album from us" |
| Lifetime | $100 | One-time, permanent access |
| Sponsor | $300 | Investor tier — call with artists, raga requests. Handled outside the app as a relationship tier, no in-app differentiation from lifetime |

### Subscribe visibility

- Subscribe link visible in profile from day one for all non-subscribed rasikas
- Subscribed rasikas see their plan status instead (e.g., "Premium · $30/yr")

### Downloads (deferred)

- Offline playback is a future PWA/iOS feature — not file downloads
- `download_url` remains in the schema for future use
- No download UI in Phase 2

### Additional options (future)
- Tip jar / patronage (support the artists directly)

---

## Content Roadmap

### Phase 0 (Tracer Bullet — Ship First)
The goal is a **deployable front-end you can hand someone a URL to**. Everything else is fluff until this works.

- Static Next.js site on Vercel — no backend, no database, no auth
- 2–3 Ragams total, hardcoded metadata (JSON file, not a database)
- Audio files served from a public R2/S3 bucket (or even `/public` folder)
- Core loop: **Open → Pick mode → Pick ragam → Hear music → Timer runs**
- Focus timer (Pomodoro) and Sleep timer (fade-out) only
- Minimal, dark UI — session screen should feel good immediately
- No accounts, no progress tracking, no achievements, no payments
- Mobile-responsive (people will test on phones)

**What this validates (the risky parts):**
- Does the UI feel calm and intentional, not like a generic music player?
- Does the audio playback work reliably (looping, fade-out, background)?
- Does a first-time user understand the concept without explanation?
- Does someone actually *use it* for a focus session?

**What this deliberately skips (not risky — known-solvable):**
- Google Drive sync, backend API, database, auth, payments, certifications
- These are engineering tasks with known solutions — defer until the front-end proves the concept

### Phase 1 (MVP — after tracer bullet is validated)
- Auth (Google + email/password via Supabase)
- Access control (rasika accounts) - Listening time tracking → paywall gate at 10 hours
- Backend API + database (rasika accounts, listening history, favorites, defaults)
- Tag-based track model: tracks have `scenarios[]` and `tags[]`, ragams have no mode
- Explore page (4th entry point — browse all tracks by ragam/tag)
- Favorites (tracks and ragams) + default track per scenario
- Personalized home screen (one-tap play for defaults)
- 10+ tracks across multiple ragams
- Certification system (Bronze → Platinum)
- Google Drive sync for content management

### Phase 2 — Payments, Access Control & Polish
- Subscription billing (Stripe / RevenueCat — TBD after research)
- `subscription_status` on rasika record
- Premium badge on track cards (transparency from day one)
- Subscribe link in profile
- 10-hour listening gate enforcement (premium tracks gated, free tracks always open)
- Test mode for non-production environments (30s timer option for QA)
- Track variant switching (percussion toggle, frequency selector) — *needs PM discussion*

### Phase 3 — iOS App
- Native SwiftUI + AVFoundation with background audio
- Feature parity with web (scenarios, timers, favorites, progress)
- RevenueCat for App Store billing (if chosen in Phase 2 research)
- Offline playback via PWA or native caching

### Phase 4 — Polish & Growth
- Apple Watch integration
- Journal / mood tracking
- Adaptive playback (learns preferences)
- Expanded library (50+ Ragams)
- Social sharing of certifications
- CarPlay support
- Wake Up mode
- Drone tuning options (432Hz, 528Hz, custom)

---

## Open Questions

### Resolved
- **App name:** ragaflow.io
- **Audio hosting:** Self-hosted. Maybe a few tracks on Apple Music but not primary.
- **Ragam curation:** Gautam and Kiran define it. Some traditional consensus, but a lot is taste. Gautam is expert-level here.
- **Ragam-to-scenario mapping:** Replaced with tag-based system. Each track is editorially tagged with scenarios and emotion tags. Ragams are pure melodic frameworks with no scenario binding.
- **Auth provider:** Supabase
- **Recording workflow:** Recordings will be a minimum 90mins long and be converted to FLAC/OPUS before uploading to google drive. 
- **Subscription pricing:** I want this to be like buying an album from us yearly ($30) or buying a coffee monthly ($5), $100 lifetime access, $300 sponsor access (investor tier/call with artists/raga requests). We'll eventually figure out how much we need to make to make this worthwhile but that depends on other sources of income really. 

### Resolved (monetization & access model — 2026-03-03)
- **Access model:** Free tracks always playable, premium tracks gated after 10 hours of total listening
- **Gate metric:** Raw `totalListeningSeconds` (sum of all session durations), not certification-filtered time
- **UX:** Transparency — premium tracks always tagged, never a surprise. Soft gate — free tracks always accessible.
- **Subscription tiers:** $5/mo, $30/yr, $100 lifetime, $300 sponsor (sponsor handled outside app)
- **Downloads:** Deferred — offline playback is a future PWA/iOS feature, not file downloads
- **Subscribe visibility:** Profile link from day one, not hidden behind the gate

### Open

1. **Tag vocabulary:** Full initial curated list of emotion/mood tags
2. **Billing provider:** Stripe vs. RevenueCat vs. others — needs research (must support web + future iOS App Store billing)

### Resolved (listening time counting rules — 2026-02-18)
- **Focus:** Only completed sessions count (timer must fire naturally — 100% threshold, no partial credit)
- **Sleep:** All time always counts (falling asleep = success, not failure)
- **Meditate / Explore / Open play:** All time ≥ 5 minutes counts
- **Certifications are permanent:** `total_seconds` is additive only, never decremented. Tier earned = tier kept.
---

## Technical Architecture Notes (for Claude Code)

### Web App Stack Suggestions
- **Frontend:** React or Next.js
- **Audio:** Web Audio API for stem mixing and playback control
- **State management:** Consider Zustand or Redux for complex audio state
- **Backend:** Node.js or Python for user accounts, progress tracking
- **Database:** PostgreSQL for user data, listening history
- **Audio storage:** S3 or similar for audio files

### iOS App Stack Suggestions
- **Framework:** SwiftUI
- **Audio:** AVFoundation for background playback, multi-track mixing
- **Backend:** Same as web (shared API)

### Key Technical Challenges
- Gapless looping of long audio files
- Real-time volume control of separate stems
- Background audio playback on iOS
- Offline caching of large audio files
- Real-time or pre-computed frequency tuning for drone

---
