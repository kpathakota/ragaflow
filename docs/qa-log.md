# Ragaflow QA Log

Dev appends an entry here after every committed task. QA agent reads and works from this file.

Format: newest entries at top. Check `[ ]` boxes as verified, mark with date.

---

## Task 1.13a — Schema: add recorded_date + location to tracks, make title nullable

**Commit:** (pending)
**Date:** 2026-02-20
**Status:** Pending verification

### Manual checks
- [ ] `lib/types.ts` — `Track` type has `recorded_date: string | null`, `location: string | null`, `title: string | null`
- [ ] `content/seed.ts` — all 3 seed tracks have `recorded_date` and `location` values
- [ ] App compiles without type errors (`npx tsc --noEmit`)
- [ ] No runtime regressions — track list, session player, homepage, profile all render correctly (title is still non-null in seed data so existing UI is unaffected)

### Supabase migration
- [ ] Run `supabase/migrations/004_track_date_location.sql` in Supabase SQL editor (staging and production)
- [ ] Verify columns added: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tracks' AND column_name IN ('recorded_date', 'location', 'title');`
- [ ] `recorded_date` is type `date`, nullable
- [ ] `location` is type `text`, nullable
- [ ] `title` is now nullable (was `NOT NULL`)
- [ ] Existing track rows unaffected — new columns get NULL, title values preserved
- [ ] Update existing rows with seed values: `UPDATE tracks SET recorded_date = '2025-01-12', location = 'Home studio, Portland' WHERE id = 'bhairavi-focus-01';` (and similarly for other tracks)

---

## Task 1.9a-wire — Wire intended_duration + completed into sessions

**Commit:** (pending)
**Date:** 2026-02-20
**Status:** Pending verification

### Manual checks
- [ ] `lib/sessions.ts` — `startListeningSession` accepts optional `intendedDurationSeconds` param and inserts it
- [ ] `lib/sessions.ts` — `endListeningSession` accepts `completed` boolean param and updates it
- [ ] Session player passes `duration * 60` as intended duration on start
- [ ] Timer fires naturally → `endListeningSession` called with `completed: true`
- [ ] User taps "stop" early → `endListeningSession` called with `completed: false`
- [ ] App compiles without errors (`npm run dev`)
- [ ] Start a session, let timer complete — check Supabase row has `intended_duration_seconds` and `completed = true`
- [ ] Start a session, stop early — check Supabase row has `completed = false`

---

## Task 1.9a — Listening session completion schema

**Commit:** (pending)
**Date:** 2026-02-20
**Status:** Pending verification

### Manual checks
- [ ] `lib/types.ts` — `ListeningSession` type includes `intended_duration_seconds: number | null` and `completed: boolean | null`
- [ ] App compiles without type errors (`npm run dev`)
- [ ] No runtime regressions — session logging still works (start/end a session on the player)

### Supabase migration
- [ ] Run `supabase/migrations/003_session_completion.sql` in Supabase SQL editor (both staging and production)
- [ ] Verify columns added: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listening_sessions' AND column_name IN ('intended_duration_seconds', 'completed');`
- [ ] Existing rows unaffected — new columns are nullable, so old sessions get NULL values

---

## Task 1.11-fix — Fix pause button iOS appearance + circle button shift

**Commit:** (see git log)
**Date:** 2026-02-18
**Status:** Pending verification

### Manual checks
- [ ] Pause button renders as a plain rounded circle (no iOS media glyph treatment) on Safari/iOS
- [ ] Pause button shows two vertical bars (CSS spans), not a Unicode character
- [ ] Tapping play → circle button stays centered; "stop" text appears to the right without moving the circle
- [ ] Tapping pause → circle stays in same position; "stop" text remains to the right
- [ ] All buttons have `type="button"` (no accidental form submissions or browser defaults)
- [ ] Stop, Yes/No thanks, New session buttons all work as before

---

## Task 1.11 — Session player redesign + artist_note field
**Commit:** ad6157d
**Date:** 2026-02-18
**Status:** Issues found — see 1.11-A and 1.11-B in issues.md

### Manual checks
- [x] Ragam name ("Bhairavi", "Neelambari", "Sahana") is the `h1` on the session player — not the track title or scenario name
- [x] Brief track description renders below the ragam name in muted text
- [x] Color blob in center matches scenario: blue (focus), indigo (sleep), amber (meditate)
- [x] Artist note section is **hidden** when `artist_note` is null (all seed tracks are null — nothing should show)
- [x] Artist note **expands/collapses** on tap when a value is set (tested via Supabase table editor)
- [ ] Play button sits in the bottom third of the screen on mobile — **deferred to mobile QA (post-production push)**
- [x] Timer display is small, appears **above** play/pause only while session is running or paused
- [x] Stop is a lowercase text link, not a button
- [x] Heart (favorite) stays top-right, fills red for favorited tracks (requires login)
- [x] Session complete flow: "Session complete" appears, default prompt works, "New session" restarts correctly
- **Issue 1.11-A:** Pause button renders with iOS Safari default media control appearance
- **Issue 1.11-B:** Circle button shifts left when "stop" appears beside it

### Supabase migration
- [x] `supabase/migrations/002_artist_note.sql` run in Supabase SQL editor
- [x] Existing track rows intact — `artist_note` is null by default

---
