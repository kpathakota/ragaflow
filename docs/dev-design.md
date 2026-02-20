# Raaga App - Development Design & Execution Plan

## Current Status (as of 2026-02-13)

### What's Built

**Phase 0 (Tracer Bullet) — Complete**
- Next.js 16.1.6 project with TypeScript + Tailwind CSS v4, deployed to Vercel
- Dark theme, mobile-first UI
- Local seed data (`content/seed.ts`) with 3 ragams + 3 tracks
- Scenario selection homepage → track list → session player flow
- Audio playback with `<audio loop>` and ref-based play/pause
- Timer with `setInterval` in `useEffect`
- Audio files served from `public/audio/{scenario}/`

**Phase 1 (Foundation) — Partially Complete**
- Supabase auth (email sign-in/sign-up) with `AuthProvider` + `useAuth()` hook
- Tag-based data model: ragams, tracks (with `scenarios[]` and `tags[]`), rasika_preferences, listening_sessions, certifications
- Data layer with Supabase-first + local seed fallback (`lib/data.ts`)
- RLS policies: ragams/tracks public; preferences/sessions/certifications owner-only
- Favorites: toggle favorite tracks/ragams (heart icon on track cards and session player)
- Defaults: set default track per scenario, one-tap quick play on homepage
- Explore page: browse all tracks grouped by ragam with tag filtering
- Session logging: start/end listening sessions with duration tracking
- Profile page: account info, listening stats, default tracks, sign-out
- User badge: top-right initial circle on homepage linking to /profile

### What Remains

**Phase 1 — Up Next (ordered)**
1. Track list UI — group tracks by ragam (flat list; session player redesign made ragam name primary but list was not updated). `TrackCard` shows `track.title` as heading; should show ragam name as the group header and differentiate tracks within a ragam by title/tags/duration. Requires ragam name in the data layer (Track only carries `ragam_id`). **PM discussion needed:** Differentiate tracks by **recording date** (when it was recorded) and **location** (freeform text — city/place, e.g. "Portland"). These are new fields on Track. Needs PM to spec: schema changes, seed data, UI layout for track cards within a ragam group.
2. Dev/Staging Environment Separation (Task 1.12)
3. Task 1.9a follow-up — wire `lib/sessions.ts` + session player to pass `intended_duration_seconds` and `completed` (schema layer done, integration pending)
4. Certifications UI: progress bars + badges on /profile (Task 1.9)
5. Listening gate (Task 1.10) — defer until Stripe/payments are ready (Phase 2 dependency)

**Phase 1 — Deferred (known, not blocking)**
- Google Drive content pipeline (Tasks 1.3–1.6) — only needed when track count exceeds manual management
- Audio transcoding pipeline (Task 1.5)
- Cloud storage + CDN (Task 1.6) — currently serving from `/public`, fine for now

~~Middleware → proxy migration~~ ✅

**Phase 2+ — Future**
- Stripe payments + subscription tiers
- Track variant switching (percussion toggle, frequency selector)
- Access control enforcement
- iOS native app

---

## Core Philosophy: Pure, Unprocessed Audio

The entire system is built around delivering **pure, human-performed audio with zero computational processing**. No pitch shifting, no real-time mixing, no stems. Every variant (frequency, percussion) is recorded separately by the artists and stored as complete tracks.

## Recommended Architecture

### Backend Stack
- **API & Database & Auth**: Supabase (PostgreSQL, auth with email/Google/Apple, Row Level Security)
- **Audio Storage**: Google Drive (source) → Cloud Storage (processed files)
- **Payment**: Stripe (for paid downloads/subscriptions)

### Content Management Flow
```
Google Drive (Artists Upload Here)
    ↓
Backend Sync Service (polls Drive API)
    ↓
Audio Processing (transcode to streaming format only - keep audio pure)
    ↓
Cloud Storage (AWS S3 / Cloudflare R2 / Backblaze B2)
    ↓
CDN → API → Clients (Web + iOS)
```

### Why Google Drive as CMS
- Artists drag-drop files to organized folders
- Metadata in Google Sheets (Ragam name, scenarios, tags, artist description)
- Backend syncs automatically via Drive API
- No custom CMS to build/maintain

### Audio Architecture (No Stems)
- Each Ragam recording is a **complete, pure audio file** (no mixing required)
- Track variants per Ragam:
  - **Without percussion** (melody only)
  - **With percussion** (melody + percussion mixed at recording time)
  - **Multiple frequencies**: 440Hz, 432Hz, 528Hz, custom (recorded separately at each frequency)
- Users toggle between complete tracks (not mixing stems)
- No real-time pitch shifting or audio processing - everything is pre-recorded
- Value prop: Pure, unprocessed audio as the artists intended

### Frontend Stack
- **Web**: Next.js (React + API routes, easy deployment)
- **iOS**: SwiftUI + AVFoundation
- **Shared API**: Same backend for both platforms

### Database Schema Overview

```sql
-- Core tables
rasikas (id, email, display_name, total_listening_seconds, subscription_status, created_at)
ragams (id, name, description, time_of_day)
tracks (
  id,
  title,
  ragam_id,
  scenarios text[],        -- editorial: ["focus", "meditate"]
  tags text[],             -- editorial: ["grounding", "contemplative"]
  description text,        -- brief editorial context (1–2 sentences, always visible on session player)
  artist_note text,        -- Gautam's longer personal voice: scene, poetry, session context (expandable on session player)
  frequency (440, 432, 528, etc.),
  has_percussion (boolean),
  streaming_url,
  lossless_url,
  duration_seconds,
  free (boolean),
  drive_file_id,
  created_at
)
rasika_preferences (
  rasika_id,
  favorite_tracks text[],
  favorite_ragams text[],
  default_focus_track_id,
  default_sleep_track_id,
  default_meditate_track_id
)
listening_sessions (id, rasika_id, track_id, started_at, duration_seconds)
certifications (id, rasika_id, ragam_id, total_hours, tier)
```

**Key insights**:
- Ragams have **no mode/scenario** — they are pure melodic frameworks.
- Tracks carry the `scenarios[]` and `tags[]` mapping — a track can appear under multiple scenarios.
- Each track is a complete, standalone audio file. The frontend switches between variants based on user preferences.
- Rasikas (users) have favorites and per-scenario default tracks for one-tap play.

## Execution Plan

### Development Strategy: Tracer Bullet First

**Principle:** Get a deployable URL into someone's hands as fast as possible. The value proposition is "does this music + UI make me want to focus/sleep?" — not "does the Google Drive sync work?" Everything that isn't the front-end listening experience is deferred.

**What's risky (build first):**
- The feel of the UI — does it convey calm, intention, quality?
- Audio playback in browsers — looping, fade-out, background tab behavior
- The core loop — can someone pick a scenario, pick a track, and be listening in <10 seconds?
- Mobile web experience — most people will share the URL and open it on their phone

**What's not risky (build later):**
- Google Drive sync (known API, known problem)
- Database, auth, accounts (commodity infrastructure)
- Payments (Stripe is well-documented)
- iOS native app (only matters after web proves the concept)

---

### Phase 0: Tracer Bullet (Build First)

**The simplification:** No backend. No database. No auth. Audio files in a public bucket (or even `/public`). Metadata is a JSON file checked into the repo. Deploy to Vercel. Share the URL.

**Task 0.1: Next.js Project + Deployment Pipeline**
- Initialize Next.js with TypeScript + Tailwind CSS
- Deploy to Vercel immediately (empty site is fine — establish the deploy pipeline on day 1)
- Dark theme from the start

**Task 0.2: Content Seeding**
- Create `content/ragams.json` with 2–3 hardcoded ragams (name, mode, description, audio URL)
- Upload 2–3 audio files to a public R2 bucket (or `/public` for now)
- This is throwaway scaffolding — will be replaced by Drive sync later

**Task 0.3: Mode Selection Screen (Homepage)**
- 3 mode cards: Focus, Sleep, Meditate
- Clean, minimal, dark UI — this is the first impression
- Route to ragam list for selected mode
- Mobile-first layout

**Task 0.4: Ragam Selection + Session Screen**
- List ragams for the selected mode
- Tap a ragam → enter session screen
- Session screen: minimal — album art or ambient visual, play/pause, volume, timer display

**Task 0.5: Audio Playback Engine**
- HTML5 Audio element (not Web Audio API — keep it simple)
- Play/pause, volume control
- Gapless looping (set `loop = true`, test for gap behavior, add crossfade if needed)
- Background tab audio (test on mobile Safari, Chrome — this is a real risk)

**Task 0.6: Timer Implementation**
- Focus timer: Pomodoro presets (25/5) + custom duration, visual countdown
- Sleep timer: countdown + gradual volume fade over last 2 minutes
- Timer controls integrated into session screen

**Task 0.7: Polish + Mobile Testing**
- Test on iPhone Safari, Android Chrome (the actual use case)
- Screen dim behavior during sleep mode
- PWA basics: manifest.json, so it can be "added to home screen"
- Gentle completion sound for focus timer

**Milestone: Shareable URL.** Hand it to 3 people. Watch them use it. Learn.

---

### Phase 1: Foundation, Auth & Content Pipeline (After Tracer Bullet)

**Task 1.1: Supabase Setup + Auth** ✅
- Set up Supabase project (PostgreSQL, Auth, Row Level Security)
- Auth with email sign-in/sign-up, `AuthProvider` + `useAuth()` hook
- Profile page with account info, listening stats, sign-out

**Task 1.2: Tag-based Data Model** ✅
- Ragams table: id, name, description, time_of_day (no tradition column)
- Tracks table: id, title, ragam_id, scenarios[], tags[], description, duration, audio_url, download_url, free, created_at
- Rasika preferences: favorite_tracks[], favorite_ragams[], default track per scenario
- Listening sessions + certifications tables with RLS
- Supabase-first data layer with local seed fallback (`lib/data.ts`)

**Task 1.3: Google Drive Structure + Metadata Sheet**
- Set up folder structure on Drive (organized by ragam, not by mode)
- Create metadata Google Sheet with track-level fields (ragam, scenarios, tags, artist description)
- Upload initial content library (10+ tracks across multiple ragams)

**Task 1.4: Drive → Database Sync**
- Sync script: scan Drive, parse filenames, upsert to Supabase
- Replace hardcoded seed data with Supabase queries

**Task 1.5: Audio Transcoding Pipeline**
- FFmpeg: FLAC → Opus/AAC for streaming
- Upload to Cloudflare R2
- No pitch shifting — keep audio pure

**Task 1.6: Cloud Storage + CDN**
- Cloudflare R2 buckets: `streaming-audio`, `lossless-audio`
- Public URLs for streaming, signed URLs for downloads

**Task 1.7: Favorites, Defaults & Personalized Home** ✅
- Heart icon on session player and track cards (favorite tracks and ragams)
- "Set as default" button on session player
- Personalized home screen: one-tap quick play for each scenario default, scenario cards below, favorites count

**Task 1.8: Explore Page** ✅
- 4th entry point: browse all tracks grouped by ragam
- Tag-based filtering

**Task 1.9: Listening Progress & Certifications**
- Session tracking ✅ (start/end listening sessions with duration)
- Certification calculation (Bronze → Platinum) — schema exists, UI not yet built
- Progress bars, badges in UI — not yet built

**Task 1.9a: Listening Session Schema — Completion Tracking** ✅ *(schema layer — 2026-02-20, commit c8648e0)*
- Add two fields to `listening_sessions`:
  - `intended_duration_seconds integer` (nullable — null means open play, no timer)
  - `completed boolean` (true only when the timer fires naturally; false if rasika stops early)
- Migration: `supabase/migrations/003_session_completion.sql` ✅
- Update `lib/types.ts` `ListeningSession` type ✅
- Migration applied to production Supabase ✅
- **Still TODO (follow-up task):** Update `lib/sessions.ts` `startSession()` to accept `intendedDuration`, `endSession()` to accept `completed`
- **Still TODO (follow-up task):** Update session player to pass timer duration on start and pass `completed=true` only when timer fires (not when stop is tapped)

**Completion counting rules (what counts toward certification):**
| Scenario | Rule |
|----------|------|
| Focus | Only completed sessions (completed=true). Bailing early = nothing counted. |
| Sleep | All time always counted (falling asleep before timer = success state). |
| Meditate | All time ≥ 5 minutes minimum. |
| Explore / Open play | All time ≥ 5 minutes minimum (no timer to complete). |

**Decided:** Completion threshold for Focus is 100% — timer must fire naturally. No partial credit.
**Decided:** Certifications are additive-only. `total_seconds` never decrements. Tier earned = tier kept.

**Task 1.11: Session Player Redesign + artist_note Schema** ✅
- Add `artist_note text` (nullable) to tracks table: migration SQL + `lib/types.ts` + `content/seed.ts`
- Redesign `session-player.tsx` layout (top → bottom):
  - Top: ragam name as primary title, heart/favorite top-right
  - Below title: `description` (brief, always visible)
  - Center: scenario color fill block (swappable `<div>` for future animation — no hardcoded shape)
  - Above controls: `artist_note` collapsed by default, tap to expand/collapse
  - Bottom third (~20% from bottom): play/pause + small timer (timer small, non-prominent)
- Remove scenario name ("Deep Focus") as primary header — ragam name takes that role
- Keep layout flexible: color block and control strip should be easy to swap/rearrange without restructuring
- iOS pause button appearance fix (1.11-A) + circle button anchor fix (1.11-B) ✅

**Task 1.10: Paywall Gate**
- Track cumulative listening time per rasika
- After 10 hours: prompt to subscribe
- Streaming free up to gate, downloads always paid

**Task 1.12: Dev/Staging Environment Separation** *(pre-launch)*
- **Problem:** Local dev and Vercel deployments currently all point to the single production Supabase project. Any test data, schema experiments, or bad seeds hit real user data.
- **Goal:** Three clean environment tiers:
  - **Local dev** → staging Supabase (`.env.local`)
  - **Vercel preview deploys** (every branch push) → staging Supabase (Vercel "Preview" environment vars)
  - **Vercel production** (ragaflow.io) → production Supabase (Vercel "Production" environment vars)

- **Steps:**
  1. Create a new Supabase project: `ragaflow-staging`
  2. Run all migrations on the staging project (`001_initial_schema.sql`, `002_artist_note.sql`)
  3. Run `supabase/seed.sql` on the staging project to populate it with the 3 test ragams + tracks
  4. Update `.env.local` to point to the staging Supabase URL + publishable key (not production)
  5. In Vercel project settings → Environment Variables:
     - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for **Preview** environment → staging credentials
     - Confirm **Production** environment vars still point to production Supabase
  6. Add `.env.production.local` to `.gitignore` (if not already) — never commit credentials
  7. Update `.env.example` to document both sets of vars with comments explaining which env each belongs to

- **Acceptance criteria:**
  - `npm run dev` locally → writes go to staging Supabase, not production
  - A branch push to Vercel preview → uses staging DB
  - `ragaflow.io` production deployment → still uses production DB, unaffected
  - Confirmed by: creating a test account on a preview deploy and verifying it does not appear in the production Supabase auth table

- **Note on staging URL:** Vercel auto-generates a preview URL per branch (e.g. `ragaflow-git-branch-user.vercel.app`). This is sufficient for now. Add `staging.ragaflow.io` as a Vercel alias later if a fixed staging URL is needed for external testers.

- **Future:** Once a local Docker-based Supabase setup is worthwhile (i.e. offline dev or CI), add Task Inf.1 for that. For now, staging Supabase is the dev database.

### Phase 2: Payments, Track Variants & Polish

**Task 2.1: Stripe Integration**
- Subscription tiers: $5/mo, $30/yr, $100 lifetime, $300 sponsor
- Checkout, webhooks, subscription status sync to Supabase

**Task 2.2: Track Variant Switching**
- Percussion toggle, frequency selector
- Seamless switching with position preservation

**Task 2.3: Access Control**
- Enforce 10-hour gate for free rasikas
- Paid downloads with signed URLs

### Phase 3: iOS App

**Task 3.1: SwiftUI + AVFoundation**
- Native playback, background audio, lock screen controls

**Task 3.2: Feature Parity**
- Scenario selection, track browsing, timers, favorites, progress tracking

### Phase 4: Polish & Launch

**Task 4.1: Educational Content** — Ragam descriptions, "Why this Ragam?"
**Task 4.2: Adaptive Playback** — Learn from skip/replay behavior
**Task 4.3: Analytics** — PostHog/Mixpanel, Sentry
**Task 4.4: Final QA** — Cross-browser, cross-device, audio edge cases

## Key Technical Decisions

1. **Cloudflare R2 over S3**: S3-compatible, 10x cheaper egress, includes CDN
2. **Next.js API routes**: Start monolithic, can split later if needed
3. **Track variants (not stems)**: Store complete tracks for each variant (percussion on/off × multiple frequencies)
4. **Pure audio**: No pitch shifting or audio processing - each frequency is recorded separately by artists
5. **Monetization**: Free streaming (account required) + paid downloads + 10-hour listening gate. Tiers: $5/mo, $30/yr, $100 lifetime, $300 sponsor
6. **Google Sheets for metadata**: Simple CSV-like structure artists can edit
7. **3 primary scenarios + Explore**: Focus, Sleep, Meditate as entry points; Explore as catch-all. Tracks tagged with scenarios[] and tags[] — no mode binding on ragams
8. **Auth via Supabase**: Email, Google, Apple Sign-In with Row Level Security

## Folder Structure on Google Drive
```
Raaga App Content/
├── metadata.csv (or Google Sheet with columns: ragam_name, track_title, scenarios, tags, artist_description, time_of_day)
└── Audio/
    ├── Ragam_Hindolam/
    │   ├── 440hz_no_percussion.flac
    │   ├── 440hz_with_percussion.flac
    │   ├── 432hz_no_percussion.flac
    │   ├── 432hz_with_percussion.flac
    │   ├── 528hz_no_percussion.flac
    │   └── 528hz_with_percussion.flac
    ├── Ragam_Mohanam/
    │   └── ...
    ├── Ragam_Bhairavi/
    │   └── ...
    └── ...
```

**Note**: Folders are organized by **ragam**, not by scenario. A track's scenario mapping lives in the metadata sheet, not the folder structure.

**Note**: Not all Ragams need all frequency/percussion combinations. Artists can upload only the variants that make sense for each Ragam.

## Content Creation Workflow (Artist Perspective)

### Recording Session
1. **Set up multi-track recording**: Record melody and percussion on separate tracks simultaneously
2. **Record improvisation** (60-90 minutes) at specific frequency (e.g., 440Hz tuned tanpura/shruti)
3. **Export two versions**:
   - Mix 1: Melody only → `440hz_no_percussion.flac`
   - Mix 2: Melody + percussion → `440hz_with_percussion.flac`
4. **Repeat for other frequencies** (optional): Re-record with 432Hz or 528Hz tuned drone

**Key insight**: Percussion on/off variants come from the same recording session, so they're perfectly synchronized. Different frequencies require separate recording sessions.

### Upload & Sync
1. **Upload to Drive**: Drag files to appropriate folder: `Audio/Ragam_Name/`
2. **Update metadata**: Add row to Google Sheet with track details (ragam, title, scenarios, tags, artist description)
3. **Backend syncs automatically**: System detects new files, transcodes for streaming, updates database

**Result**: Non-technical artists can manage content with zero code, no audio processing knowledge required.

## Tracer Bullet Content Requirements
- **3 scenarios**: Focus, Sleep, Meditate
- **2–3 tracks total** (at least 1 per scenario) — just enough to demo the experience
- **Single variant per track**: 440Hz, no percussion toggle needed yet
- **Format**: Whatever you have — MP3/FLAC/WAV all work for the prototype

## Full MVP Content Requirements (Phase 1+)
- **3 scenarios + Explore**: Focus, Sleep, Meditate, Explore
- **10+ tracks across multiple ragams** (a track can appear under multiple scenarios)
- **Each track tagged**: scenarios[], tags[], artist description
- **Minimum variants per track**: 440Hz with/without percussion
- **Optional variants**: 432Hz, 528Hz (can be added post-launch)
- **Recordings**: Minimum 90 minutes, converted to FLAC/Opus before uploading to Google Drive

## Implementation Notes

This plan assumes leveraging Claude Code for implementation guidance, code generation, and debugging throughout. Each task is scoped for ~2 hours but may need adjustment based on your experience level with the specific technologies.

### Solo Dev Advantages
- **Google Drive as CMS**: No backend admin panel to build
- **Cloudflare R2**: Simple S3-compatible API, great pricing
- **Next.js**: Single framework for web frontend + API routes
- **Supabase**: Auth + database + RLS in one service
- **Stripe**: Payment infrastructure handled
- **No audio processing complexity**: Simple file storage and playback, no mixing engine needed

### Why Track Variants > Stems

| Stems Approach (Complex) | Track Variants (Simple) |
|--------------------------|-------------------------|
| Real-time mixing in browser/app | Simple playback switching |
| Web Audio API complexity | HTML5 Audio or basic AVPlayer |
| Synchronization challenges | Single file = perfect sync |
| Higher CPU/battery usage | Minimal resource usage |
| More QA surface area | Simpler testing |
| **Dev time: +2 weeks** | **Dev time: baseline** |

**Trade-off**: More storage (multiple complete files per Ragam) vs. significantly simpler implementation and better user experience (no sync issues, lower battery drain).

### Storage Cost Analysis

**Per Ragam (60-minute recording)**:
- Lossless (FLAC): ~300MB
- Streaming (Opus 128kbps): ~60MB

**Per Ragam with all variants** (2 percussion options × 3 frequencies):
- Lossless: 300MB × 6 = 1.8GB
- Streaming: 60MB × 6 = 360MB

**Full library (50 Ragams)**:
- Total lossless: 90GB
- Total streaming: 18GB

**Cloudflare R2 costs** (at scale):
- Storage: $0.015/GB/month = $1.62/month for 108GB
- Egress: $0 (included)
- **Total monthly cost: ~$2**

Storage is essentially free. The simplified architecture is worth the extra storage.

### Technical Implementation: Seamless Track Switching

When user toggles percussion or changes frequency:
1. **Save current playback position** (e.g., 15 minutes 23 seconds into track)
2. **Load new track variant** from same Ragam
3. **Seek to saved position**
4. **Resume playback**

**Web implementation**:
```javascript
// Pseudocode
function switchVariant(newTrackUrl) {
  const currentTime = audioElement.currentTime;
  audioElement.src = newTrackUrl;
  audioElement.currentTime = currentTime;
  audioElement.play();
}
```

**iOS implementation**:
```swift
// Pseudocode
func switchVariant(newTrackUrl: URL) {
  let currentTime = player.currentTime()
  let newItem = AVPlayerItem(url: newTrackUrl)
  player.replaceCurrentItem(with: newItem)
  player.seek(to: currentTime)
  player.play()
}
```

Since all variants of a Ragam are improvisation sessions recorded simultaneously, the timing does not matter.

### Critical Path Items (Reordered for Tracer Bullet)
1. **Audio playback in mobile browsers** — does it loop? does it play in background tabs? does Safari kill it?
2. **The UI feel** — does someone open this and immediately feel "this is quality, this is calm"?
3. **The core loop speed** — open → scenario → track → listening in under 10 seconds
4. **Sleep fade-out** — does the volume fade work smoothly, or does it click/pop?
5. Gapless looping for continuous sessions
6. Track variant switching (deferred to Phase 2)
7. Background audio on iOS native (deferred to Phase 3)

### Future Enhancements (Post-MVP)
- **Track of the Day** — Daily curated track featured on homepage with artist-written blurb. Simple `track_of_the_day` table (date, track_id, blurb, selected_by). Reuses existing tracks — no new content format. See spec.md §5 for full details. Tasks: schema migration, data access function, homepage UI card, selection workflow (manual Supabase insert initially, Google Sheets integration later).
- Apple Watch integration (show current Ragam, control playback)
- Journal/mood tracking (correlate Ragams with mood improvements)
- Adaptive playback based on user behavior (recommend Ragams based on time of day, past preferences)
- CarPlay support (safe focus music for driving)
- Expanded Ragam library (50+ Ragams across all scenarios)
- Additional frequency variants (custom user requests)
- Social sharing of certifications (share achievements on social media)
- Collaborative playlists (curated sequences of Ragams for specific workflows)
- Live session recordings (special limited-time content)

---

## Getting Started: Immediate Next Steps

### Step 1: Get Audio Files Ready
- Pick 2–3 existing recordings (any format — MP3, FLAC, WAV)
- Assign each one a scenario (Focus, Sleep, or Meditate)
- Write a one-line description for each
- That's your content. Don't overthink it.

### Step 2: Ship an Empty Next.js Site to Vercel
- `npx create-next-app@latest` with TypeScript + Tailwind
- Push to GitHub, connect to Vercel, deploy
- You now have a URL. Everything after this is iterating on a live product.

### Step 3: Build the Core Loop
- Scenario selection → Track selection → Session screen → Audio plays
- Hardcode everything. JSON file for metadata. Audio in `/public` or a public R2 bucket.
- Focus on the session screen — that's where users spend 95% of their time.

### Step 4: Test on Phones
- Send the URL to yourself, open on iPhone Safari and Android Chrome
- Does audio play? Does it loop? Does it survive locking the screen?
- These are the real questions. Answer them before building anything else.

### Step 5: Show Someone
- Hand the URL to 2–3 people. Don't explain anything. Watch what they do.
- If they get it → build the backend (Phase 1)
- If they don't → iterate on the UI before investing in infrastructure

### Recommendation: Frontend First, Backend Later
The previous plan recommended starting with the backend + audio pipeline. **Revised recommendation: start with the front-end.** The backend is a solved problem (Drive API, PostgreSQL, R2). The front-end experience is the unsolved question. Validate first, then build the plumbing.
