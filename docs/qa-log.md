# Ragaflow QA Log

Dev appends an entry here after every committed task. QA agent reads and works from this file.

Format: newest entries at top. Check `[ ]` boxes as verified, mark with date.

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
