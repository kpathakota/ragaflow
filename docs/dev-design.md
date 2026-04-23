# Raaga App - Development Design & Execution Plan

## Current Status (as of 2026-02-25)

### What's Built

**Phase 0 (Tracer Bullet) — Complete**
- Next.js 16.1.6 project with TypeScript + Tailwind CSS v4, deployed to Vercel
- Dark theme, mobile-first UI
- Scenario selection homepage → track list → session player flow
- Audio playback with `<audio loop>` and ref-based play/pause
- Timer with `setInterval` in `useEffect`
- Audio files served from `public/audio/{scenario}/`

**Phase 1 (Foundation) — Complete**
- Supabase auth (email sign-in/sign-up) with `AuthProvider` + `useAuth()` hook
- Tag-based data model: ragams, tracks (with `scenarios[]`, `tags[]`, `recorded_date`, `location`), rasikas, listening_sessions, certifications
- Data layer: Supabase only (`lib/data.ts`), no local seed fallback — Supabase is required
- Seed data in `supabase/seed.sql` (7 ragams, 30 tracks) — `content/seed.ts` removed
- RLS policies: ragams/tracks public; preferences/sessions/certifications owner-only
- Favorites: toggle favorite tracks/ragams (heart icon on track cards and session player)
- Defaults: set default track per scenario, one-tap quick play on homepage
- Explore page: browse all tracks grouped by ragam with tag filtering
- Track list pages (focus/sleep/meditate): flat list sorted newest-first, ragam name on each card
- Session logging: start/end listening sessions with duration, intended_duration_seconds, and completed flag
- Certifications: per-ragam progress computed from session history, tier badges + progress bars on /profile, auto-upsert after each session
- Profile page: account info, listening stats, certifications, default tracks, sign-out
- User badge: top-right initial circle on homepage linking to /profile
- Dev/staging environment separation: staging Supabase + Vercel preview env vars

### What Remains

**Phase 1 — All core tasks complete.**

**Phase 1 — Deferred (known, not blocking)**
- Google Drive content pipeline (Tasks 1.3–1.4) — manual content management is fine at current track count
- Audio transcoding pipeline (Task 1.5) — manual conversion before upload is fine for now
- Listening gate (Task 1.10 → now Task 2.5) — deferred until Polar.sh payments are ready

~~Middleware → proxy migration~~ ✅

**Phase 2+ — Future**
- ~~Polar.sh payments + subscription tiers~~ ✅ (Task 2.6)
- ~~Circular audio (Task 2.4b)~~ ✅
- ~~iOS M2 (Audio Playback) + M3 (Feature Parity)~~ ✅ (Tasks 3.1, 3.2)
- ~~Track titles, artist note, full-track duration, reset rename~~ ✅ (April 12 issues)
- Track variant switching (percussion toggle, frequency selector). This won't be a thing. Tracks will just be tagged when there's no percussion vs. percussion.
- Access control enforcement (Task 2.5 — 10-hour listening gate)
- Premium track downloads (Task 2.8 — deferred to iOS)
- iOS native app — M4 (StoreKit 2) and M5 (Launch) remain

---

## Git & Pull Request Workflow

### Branches

| Branch | Purpose | Who pushes |
|--------|---------|------------|
| `main` | Production — deploys to Vercel production | Human only (via PR merge) |
| `dev` | Integration — deploys to Vercel preview | Human merges PRs here |
| `fix/*`, `feat/*` | Feature/fix branches — one per task | Claude Code or human |

### How a task flows

1. **Start from `dev`** — pull latest `dev`, create a feature branch (`fix/foo` or `feat/bar`)
2. **Do the work** — make commits on the feature branch
3. **Push & open PR against `dev`** — one PR per logical task, keep it small and focused
4. **Human reviews & merges** — squash-merge or regular merge into `dev`
5. **GitHub deletes the remote branch** — remote branch is cleaned up on merge
6. **Periodic cleanup** — fetch with prune, delete local branches whose remotes are gone (`git branch -d`)
7. **Deploy to production** — human merges `dev` → `main` when ready (separate PR or fast-forward)

### Conventions

- **Never commit directly to `main`** — all changes go through PRs
- **Never commit directly to `dev`** — use feature branches + PRs (exception: trivial doc-only changes)
- **One PR per logical task** — smaller PRs are easier to review and less likely to conflict
- **Rebase `dev` onto `main` frequently** — small rebases are trivial; large ones bring back deleted files
- **Clean up stale branches** — after PRs are merged, run `git fetch --prune origin` and delete local branches marked `gone`

### Branch naming

- `fix/` — bug fixes and polish (e.g., `fix/tier-colors-and-rename`)
- `feat/` — new features (e.g., `feat/default-duration`)

---



The entire system is built around delivering **pure, human-performed audio with zero computational processing**. No pitch shifting, no real-time mixing, no stems. Every variant (frequency, percussion) is recorded separately by the artists and stored as complete tracks.

## Recommended Architecture

### Backend Stack
- **API & Database & Auth**: Supabase (PostgreSQL, auth with email/Google/Apple, Row Level Security)
- **Audio Storage**: Google Drive (source) → Cloud Storage (processed files)
- **Payment**: Polar.sh (merchant of record — web checkout, subscription management, tax remittance)

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
  title text,              -- nullable; optional freeform name. If absent, date+location identify the track
  ragam_id,
  scenarios text[],        -- editorial: ["focus", "meditate"]
  tags text[],             -- editorial: ["grounding", "contemplative"]
  description text,        -- brief editorial context (1–2 sentences, always visible on session player)
  artist_note text,        -- Gautam's longer personal voice: scene, poetry, session context (expandable on session player)
  recorded_date date,      -- actual recording date (nullable). Displayed as short date, used for sorting
  location text,           -- evocative editorial text: where/how recorded (nullable, freeform)
  frequency (440, 432, 528, etc.),
  has_percussion (boolean),
  streaming_url,
  lossless_url,
  duration_seconds,
  free (boolean),
  drive_file_id,
  created_at
)
rasikas (
  rasika_id,
  favorite_tracks text[],
  favorite_ragams text[],
  default_focus_track_id,
  default_sleep_track_id,
  default_meditate_track_id,
  default_focus_duration,
  default_sleep_duration,
  default_meditate_duration,
  custom_duration integer,
  subscription_status text DEFAULT 'free',
  polar_customer_id text
)
listening_sessions (id, rasika_id, track_id, scenario, started_at, ended_at, duration_seconds, intended_duration_seconds, completed)
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
- Supabase-only data layer (`lib/data.ts`) — no local seed fallback

**Task 1.3: Google Drive Structure + Metadata Sheet** *(deferred)*
- Set up folder structure on Drive (organized by ragam, not by mode)
- Create metadata Google Sheet with track-level fields (ragam, scenarios, tags, artist description)
- Upload initial content library (10+ tracks across multiple ragams)
- *Deferred: manual content management is fine at current track count. Revisit when library exceeds ~50 tracks.*

**Task 1.4: Drive → Database Sync** *(deferred)*
- Sync script: scan Drive, parse filenames, upsert to Supabase
- Replace hardcoded seed data with Supabase queries
- *Deferred: depends on 1.3. Not needed until automated content pipeline becomes worthwhile.*

**Task 1.5: Audio Transcoding Pipeline** *(deferred)*
- FFmpeg: FLAC → Opus/AAC for streaming
- No pitch shifting — keep audio pure
- *Deferred: manual conversion before upload is fine for now. Build this when content volume justifies it.*

**Task 1.6: Cloud Storage — Cloudflare R2** ✅
- Audio moved from `/public/audio/` to Cloudflare R2 (bucket: `ragaflow-audio`, public URL: `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/`)
- `audio_url` in Supabase stores full R2 URLs
- Audio files removed from git repo and history; `public/audio/*.m4a` and `*.mp3` gitignored
- One shared R2 bucket for staging and production
- See `public/audio/README.md` for upload instructions

**Task 1.7: Favorites, Defaults & Personalized Home** ✅
- Heart icon on session player and track cards (favorite tracks and ragams)
- "Set as default" button on session player
- Personalized home screen: one-tap quick play for each scenario default, scenario cards below, favorites count

**Task 1.8: Explore Page** ✅
- 4th entry point: browse all tracks grouped by ragam
- Tag-based filtering

**Task 1.9: Listening Progress & Certifications** ✅
- Session tracking ✅ (start/end listening sessions with duration)
- Certification calculation (Bronze → Platinum) ✅ — `lib/certifications.ts` with tier logic, per-scenario counting rules, ragam progress aggregation, client-side upsert
- Session player upserts certification after each session ✅ (timer completion + manual stop, applying counting rules)
- Profile page shows certifications section ✅ — per-ragam cards with tier badge, progress bar, hours label

**Task 1.9a: Listening Session Schema — Completion Tracking** ✅ *(schema layer — 2026-02-20, commit c8648e0)*
- Add two fields to `listening_sessions`:
  - `intended_duration_seconds integer` (nullable — null means open play, no timer)
  - `completed boolean` (true only when the timer fires naturally; false if rasika stops early)
- Migration: `supabase/migrations/003_session_completion.sql` ✅
- Update `lib/types.ts` `ListeningSession` type ✅
- Migration applied to production Supabase ✅
- `lib/sessions.ts` wired: `startListeningSession` accepts `intendedDurationSeconds`, `endListeningSession` accepts `completed` ✅
- Session player passes `duration * 60` on start, `completed=true` when timer fires, `completed=false` on manual stop ✅

**Completion counting rules (what counts toward certification):**
| Scenario | Rule |
|----------|------|
| Focus | Only completed sessions (completed=true). Bailing early = nothing counted. |
| Sleep | All time always counted (falling asleep before timer = success state). |
| Meditate | All time ≥ 5 minutes minimum. |
| Explore / Open play | All time ≥ 5 minutes minimum (no timer to complete). |

**Decided:** Completion threshold for Focus is 100% — timer must fire naturally. No partial credit.
**Decided:** Certifications are additive-only. `total_seconds` never decrements. Tier earned = tier kept.

**Manual QA — Certifications (Task 1.9)**

Pre-requisite: sign in, have at least one track available per scenario.

1. **Profile loads clean** — visit `/profile`. If no sessions yet, certifications section should not appear. No console errors.

2. **Focus — completed session counts** — go to `/mode/focus`, pick a track, set 5m timer, let it complete naturally. Visit `/profile` — certifications section appears with that track's ragam, showing 5m progress toward Bronze (10h). Progress bar should be visible but small (~0.8%).

3. **Focus — manual stop does NOT count** — start another Focus session, stop manually after ~30s. Visit `/profile` — the ragam's total should still show 5m (unchanged from test 2). Focus requires `completed=true`.

4. **Sleep — manual stop DOES count** — go to `/mode/sleep`, pick a track, start a session, stop manually after ~30s. Visit `/profile` — the ragam for that sleep track should appear with ~30s of progress. Sleep always counts all time.

5. **Meditate — short session does NOT count** — go to `/mode/meditate`, pick a track, start a session, stop manually after ~1 minute. Visit `/profile` — that ragam's total should be 0 (or absent). Meditate requires ≥5 minutes.

6. **Meditate — long session counts** — start a Meditate session, set 5m timer, let it complete. Visit `/profile` — that ragam now shows 5m progress.

7. **Cumulative progress** — play multiple sessions on the same ragam (across scenarios). Profile should show cumulative total for that ragam, not per-session.

8. **Multiple ragams** — play sessions on tracks from different ragams. Profile should show separate cards for each ragam, sorted by total time descending.

9. **Tier badge** — if you accumulate 10+ hours on a ragam (use Supabase SQL editor to manually set `certifications.total_seconds = 36000`), the profile should show "Bronze" instead of "—".

10. **No regressions** — verify listening stats (total time, session count) still display correctly above certifications. Verify default tracks section still works below certifications.

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

**Task 1.13: Track List UI — Ragam Grouping + Recording Date/Location** ✅

Two sub-tasks, both complete:

**Task 1.13a: Schema — add `recorded_date` and `location` to tracks, make `title` nullable** ✅
- Added `recorded_date date` (nullable) and `location text` (nullable) to tracks
- Made `title` nullable — when absent, date + location identify the track
- Migration: `supabase/migrations/004_track_date_location.sql`
- Updated `lib/types.ts`, `supabase/seed.sql`
- Dropped `content/seed.ts` — Supabase is now required (no local seed fallback)
- Expanded seed data: 7 ragams, 30 tracks with varied dates, locations, and artist notes

**Task 1.13b: UI — track list layout, compact cards** ✅
- Scenario pages (focus/sleep/meditate): flat list sorted newest-first, ragam name on each card (no ragam grouping — optimized for fast play)
- Explore page: groups tracks by ragam (ragam name + description as section header) — optimized for browsing/discovery
- Tracks sorted newest-first by `recorded_date`
- Compact card layout:
  - Line 1: `"Jan 12 · Home studio, Portland"` — date + location (falls back to title)
  - Line 2: `"45 min · grounding · warmth"` — duration + tags (inline with dots)
  - Line 3: description (line-clamped to 2 lines)
- Session player unchanged — ragam name + description only

**Decisions captured:**
- `recorded_date` is a `date` column (sortable, displayed as short date)
- `location` is evocative editorial text, not just a city name
- `title` is nullable — existing titles stay, new tracks may omit it
- Tracks sorted newest-first within each ragam group
- Description kept on card (line-clamped)
- Session player unchanged

**Task 1.10: Paywall Gate** *(moved to Phase 2 — see Tasks 2.2–2.6)*

**Task 1.12: Dev/Staging Environment Separation** ✅ *(completed 2026-02-20)*
- Staging Supabase project created (`ragaflow-staging`)
- All migrations (001–004) + seed data run on staging
- `.env.local` points to staging Supabase
- Vercel environment variables configured:
  - **Preview** (all non-main branches) → staging Supabase
  - **Production** (main) → production Supabase
- Verified: dev branch preview deploys use staging DB, production unaffected

### Phase 2: Payments, Access Control & Polish

#### Decisions (captured 2026-03-03)

- **Free tracks** (`free: true`): no badge, always playable, never gated
- **Premium tracks** (`free: false`): subtle "Premium" tag on track cards, playable for free until the 10-hour gate
- **After 10 hours**: premium tracks greyed out with Premium tag, tap shows subscribe CTA. Free tracks unchanged.
- **Gate metric**: raw `totalListeningSeconds` (sum of `duration_seconds` from all sessions) — same number already shown in profile stats. NOT filtered through `computeCountableSeconds`.
- **Subscribe visibility**: subscribe link in profile from day one, regardless of gate status
- **No hard block**: rasikas can always access free tracks, their profile, and their listening journey
- **Transparency principle**: rasikas should always know what's free vs. premium before tapping — no bait-and-switch
- **Downloads deferred**: offline playback is a future PWA/iOS feature, not file downloads. `download_url` stays in schema but no UI yet.
- **Sponsor tier ($300)**: relationship/investor tier handled outside the app — no in-app differentiation from lifetime
- **Billing provider**: Polar.sh — chosen as merchant of record. Handles web checkout, subscription management, tax remittance, and webhook-based status sync to Supabase. Future iOS App Store billing will need a separate integration path (Polar does not handle Apple IAP directly).

#### Tasks

**Task 2.0: Flexible Timer Durations** *(replaces old "Test Mode" task)*

Replace the hardcoded `DURATION_OPTIONS = [5, 15, 25, 45]` with a flexible 3-pill layout:

- **Pill 1:** 25 min (fixed default)
- **Pill 2:** 45 min (fixed default)
- **Pill 3:** Custom — shows last-used custom value (or "…" if none set). Tapping opens a small popover/inline input to set a new value (integer minutes).

**Custom duration details:**
- Range: 1–120 minutes (enforced in UI)
- Persisted per-rasika in Supabase: `custom_duration` column on `rasikas` (nullable integer, stores minutes)
- On first use (no saved value), pill 3 shows "…" or a placeholder; after setting, it shows the saved value (e.g., "90")
- The custom value is shared across scenarios (one column, not per-scenario) — the per-scenario default duration (saved on session completion) already captures what each scenario uses
- All existing logic (start session, end session, certification upsert, default duration save) works unchanged — `duration` is already handled in minutes internally

**Why:** The old 4-pill system was rigid. Users doing 90-minute deep work sessions or 1-minute QA tests couldn't set their preferred duration. This also replaces the need for a separate "test mode" feature — set custom to 1 min for QA.

**Sub-tasks:**

**Task 2.0a: Schema — add `custom_duration` to rasikas** ✅
- Migration 006: added `custom_duration integer` (nullable) to rasikas table
- Updated `lib/types.ts` `Rasika` type
- **Acceptance criteria:** column exists, nullable, no default value

**Task 2.0b: Data layer — read/write custom duration** ✅
- Added `setCustomDurationClient(minutes)` to `lib/preferences.ts`
- Custom duration read via existing `getPreferencesClient()` (returns full Rasika record)
- **Acceptance criteria:** custom duration round-trips through Supabase

**Task 2.0c: UI — 3-pill duration selector with custom input** ✅
- Replace `DURATION_OPTIONS = [5, 15, 25, 45]` in `session-player.tsx` with new 3-pill layout
- Fixed pills: 25, 45
- Third pill: shows saved `custom_duration` value or "…"
- Tapping third pill: opens a small popover or inline number input (1–120 range, integer only)
- On confirm: saves to Supabase via `setCustomDuration()`, selects that duration
- If rasika has `initialDuration` (from default), pre-select the matching pill (or custom if it matches neither 25 nor 45)
- **Acceptance criteria:**
  - 3 pills render (25 · 45 · custom)
  - Custom pill shows saved value after first use
  - Setting custom to 1 works (useful for QA)
  - Setting custom to 90 works (useful for deep work)
  - Values outside 1–120 rejected
  - Selected duration flows into session start, timer, and completion as before
  - Existing "set as default" on session completion still captures the duration (25, 45, or custom value)

**Task 2.1: Research — Billing Provider** ✅ *(completed 2026-03-04)*
- Researched Stripe, RevenueCat, Paddle, Lemon Squeezy, and Polar.sh
- **Decision: Polar.sh** — merchant of record (MoR)
- **Why Polar:** MoR handles sales tax/VAT remittance (solo dev doesn't want tax compliance burden), clean checkout UI, webhook events for subscription lifecycle, supports one-time payments (lifetime tier), reasonable fees, good DX
- **Trade-offs:**
  - Polar does not handle Apple IAP — iOS App Store billing will use native StoreKit in Phase 3
  - Newer platform vs. Stripe's maturity — acceptable risk at current scale
  - MoR takes a larger cut than pure payment processor, but eliminates tax filing complexity
- **Webhook plan:** Polar sends subscription events → Supabase edge function (or Next.js API route) → update `subscription_status` in `rasikas`
- **Tiers to configure:** $5/mo, $30/yr, $100 lifetime (one-time). $300 sponsor handled outside Polar as a relationship tier.

**Task 2.2: Schema — Subscription Status + Table Rename** ✅
- Renamed `rasika_preferences` → `rasikas` (migration 007)
- Added `subscription_status text NOT NULL DEFAULT 'free'` and `polar_customer_id text` to `rasikas`
- Updated RLS policies for new table name
- Renamed `RasikaPreferences` → `Rasika` type in `lib/types.ts`
- Updated all `.from("rasika_preferences")` → `.from("rasikas")` across app code
- Seed data already had `free` boolean set on all 30 tracks (22 free, 8 premium)
- **Acceptance criteria:**
  - `subscription_status` queryable for the current rasika ✅
  - `free` boolean is set on all tracks in seed data ✅

**Task 2.3: UI — Premium Badge on Track Cards** ✅
- Subtle amber "Premium" pill badge inline with track metadata (duration/tags) in `components/track-card.tsx`
- Visible always (not just after the gate) — transparency principle
- Appears on scenario track lists (`/mode/*`) and explore page
- **Acceptance criteria:**
  - Premium tag visible on non-free tracks ✅
  - Free tracks have no badge ✅
  - No change to session player ✅

**Task 2.4: UI — Subscribe Link in Profile** ✅
- "Plan" section added to profile page between Default tracks and Sign out
- Free/expired rasikas: amber "Go Premium" card with "Coming soon" placeholder (checkout link will come from Task 2.6)
- Subscribed rasikas: emerald "Premium" card
- Lifetime rasikas: emerald "Lifetime" card with dedicated copy
- Expired state deferred — shows same "Go Premium" card as free. Will design proper expired UX in Task 2.6 when we know what Polar sends.
- **Acceptance criteria:**
  - Non-subscribed rasikas see a subscribe CTA on profile ✅
  - Subscribed rasikas see their plan status ✅
  - Works with the `subscription_status` field from Task 2.2 ✅

**Task 2.4a: Fix — Timer Drift in Background Tabs**

The session timer uses `setInterval` to count down, which drifts when the browser throttles backgrounded tabs. Three-task fix:

**Task 2.4a-1: Wall-clock timer** ✅
- Replace interval-based countdown with wall-clock approach
- Store `Date.now()` at session start, compute remaining as `totalSeconds - elapsed`
- Track cumulative elapsed across pause/resume cycles via refs
- Interval still fires every 1s for re-renders, but is not the source of truth
- `stop` handler computes elapsed from wall clock, not from `remaining` state
- **Acceptance criteria:** Timer shows correct time after tab regains focus; pause/resume preserves correct elapsed; logged session durations are accurate

**Task 2.4a-2: Background completion via `visibilitychange`** *(deferred to post-alpha backlog)*
- Add `visibilitychange` listener in timer effect
- When tab regains focus, recompute remaining; if ≤ 0, trigger completion flow
- **Why deferred:** Wall-clock timer (2.4a-1) is the core fix; music stopping is sufficient signal that the session ended
- **Acceptance criteria:** Returning to a tab after session should have ended immediately shows completion screen; logged duration is wall-clock accurate

**Task 2.4a-3: Notification API (layered, optional)** *(deferred to post-alpha backlog)*
- Request `Notification.requestPermission()` on session start
- Fire `new Notification(...)` when session ends in a backgrounded tab
- Falls back silently to Task 2 behavior if permission denied
- No service worker needed
- **Why deferred:** Nice-to-have UX polish, not needed for alpha launch
- **Acceptance criteria:** Notification fires when session ends in background; no prompt if permission already granted/denied

**Decisions:**
- Timer keeps running when tab is backgrounded (no auto-pause) — audio may stop (browser behavior), but session completes on schedule
- Audio completion chime deferred — requires an audio asset, separate task
- Tasks are layered: 2.4a-1 is the core fix, 2.4a-2 and 2.4a-3 add background UX on top

**Task 2.4b: Circular Audio — Preserve Playback Position Across Sessions** ✅

Audio currently resets to 0:00 on every session end (completion, stop, restart). Since `<audio loop>` already makes the track a continuous loop, we just need to stop rewinding it. This lets a rasika complete a session, start another, and hear a different section of the same raga — no repetitive beginnings.

**Changes to `session-player.tsx`:**

1. **Split `stopAudio` into `pauseAudio` + `resetAudioPosition`:**
   - `pauseAudio()` — `audio.pause()` only, position preserved
   - `resetAudioPosition()` — `audio.currentTime = 0` (available if ever needed, not currently called)

2. **Session completes (`remaining === 0`):** call `pauseAudio()` instead of `stopAudio()`. Audio pauses at current position. Session logged, completion screen shown as today.

3. **Stop (mid-session):** call `pauseAudio()` instead of `stopAudio()`. Audio pauses at current position, timer resets to idle.

4. **"New session" / `restart`:** reset timer state to idle, **don't touch audio**. Audio stays paused at its position.

5. **`startSessionHandler`:** calls `audio.play()` as today — resumes from wherever the audio was paused.

6. **Navigate away:** component unmounts, `<audio>` element destroyed, position lost. This is fine — no persistence needed.

**What we're NOT doing:**
- No server-side or localStorage position tracking
- No cross-track memory — only same-track, same-mount continuity
- No audio during completion screen — audio pauses when timer hits zero

**Acceptance criteria:**
- Complete a session → start "New session" → audio resumes from where it was, not from 0:00
- Stop mid-session → start again → audio resumes from the stop point
- Navigate away → come back → audio starts fresh (position lost on unmount, acceptable)
- Session logging, certifications, and set-default flow unchanged

---

**Task 2.5: Access Control — 10-Hour Listening Gate** *(deferred to post-alpha backlog)*
- Compute total listening seconds for the current rasika (raw sum of `duration_seconds` from `listening_sessions`)
- If ≥ 36,000 seconds (10 hours) AND rasika is not subscribed:
  - Premium tracks on track lists: greyed out, Premium tag, not tappable (or tap shows subscribe CTA)
  - Free tracks: unchanged, always playable
- Session player: if a premium track is somehow reached while gated, show subscribe CTA instead of play button
- **Why deferred:** Not enough users yet to need a paywall gate; billing is live but gate enforcement can wait
- **Depends on:** Task 2.6 (Polar billing) ✅
- **Acceptance criteria:**
  - Under 10 hours: all tracks playable, premium tagged but not blocked
  - Over 10 hours + not subscribed: premium tracks greyed/locked on lists, free tracks unaffected
  - Subscribed rasikas (`active`, `lifetime`, `canceled`, `past_due`): all tracks playable regardless of hours

**Task 2.6: Billing Integration — Polar.sh** ✅
- Polar.sh checkout for $5/mo, $30/yr, $100 lifetime tiers ($300 sponsor handled outside app)
- Server-side checkout sessions via `polar.checkouts.create()` with `externalCustomerId` = Supabase UID
- Webhook handler (`/api/webhooks/polar`): subscription lifecycle events → `update_rasika_subscription()` RPC
- Customer portal (`/api/portal`): manage subscription, cancel, update payment
- Profile page shows plan status + subscribe CTA or manage link
- Subscription states: `free`, `active`, `past_due`, `canceled`, `expired`, `lifetime`
- SECURITY DEFINER function for webhook writes (migration 008)
- See `docs/payments-design.md` for full design and testing checklist

**Task 2.7: Track Variant Switching** *(needs more PM discussion)*
- Percussion toggle, frequency selector
- Seamless switching with position preservation
- *Deferred — not blocking payments/gating work*

**Task 2.8: Premium Track Downloads** *(deferred — iOS dependency)*
- Subscribers (`active`, `lifetime`) can download tracks for offline playback
- Web: deferred until PWA offline support is scoped
- iOS: enabled via StoreKit 2 subscription validation + AVFoundation download (Phase 3, M4)
- `download_url` field already in schema — no migration needed
- **Depends on:** Task 2.6 (Polar billing) ✅, iOS M4 (StoreKit 2)

### Phase 3: iOS App

**Task 3.1: SwiftUI + AVFoundation** ✅
- Native playback, background audio, lock screen controls
- iOS M2 (Audio Playback) complete — AVFoundation streaming, background audio, lock screen controls, Now Playing integration

**Task 3.2: Feature Parity** ✅
- Scenario selection, track browsing, timers, favorites, progress tracking
- iOS M3 (Feature Parity) complete — favorites, defaults, session logging, certifications, explore, profile

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
5. **Monetization**: Free streaming (account required) + paid downloads + 10-hour listening gate. Tiers: $5/mo, $30/yr, $100 lifetime, $300 sponsor. **Billing via Polar.sh** (merchant of record)
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
- **Polar.sh**: Payment infrastructure handled (merchant of record)
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
