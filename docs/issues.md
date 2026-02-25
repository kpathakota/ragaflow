# Ragaflow Issue Log

A record of bugs and issues encountered, why they mattered, and how they were resolved. Newest entries at the top.


## 2026-02-25
-  We need to do a pass on the session timer complete screen. It looks okay for now but should be better. I need it to really show completion. Also when saving the default, the entire "session" should be captured (track and duration) so that it's easy from the home screen to start the default duration. 
- In the profile screen, once someone has achieved a certification, I want to actually design real badges. So that's going to be work. The progress bar should change color to highlight the current tier. For example, Bronze should be bronze, Silver should be silver etc. 
- Need a better word than Certifications
- When we expand the artist note, the graphic resizes and looks weird (no longer blends properly with the surrounding frame). How can we fix that? 
- Why is the password manager asking me to save new details every time I favorite a track? That seems like something we're doing ... 

## 2026-02-20

### Issue 1.13-A — Track list not grouped by ragam after session player redesign

**Files:** `app/mode/[scenario]/track-list-client.tsx`, `components/track-card.tsx`

**What's wrong:** The session player redesign (Task 1.11) made ragam name the primary title of the session experience. The track list was not updated to match — it remains a flat list of tracks with `track.title` as the primary heading on each card. There's no ragam grouping.

**User impact:** The list and the session player feel like different products. A rasika picking a track has no ragam context — which is the primary musical identity of the content.

**Fix needed:**
- Group tracks by ragam in `TrackListClient` (requires ragam name in the data layer — Track only carries `ragam_id`, so `getTracksByScenario` or a parallel call must return ragam names)
- Render a ragam name as a group header above each group of tracks
- Within each group, tracks should be distinguishable without relying on ragam name (see Issue 1.13-B)

**Status:** Open

---

### Issue 1.13-B — No clear way to differentiate multiple tracks of the same ragam

**What's wrong:** When multiple tracks share the same ragam (e.g. two Bhairavi recordings), the only differentiators in the current data model are `title`, `description`, `tags`, `duration`, and `artist_note`. There is no standardized "variant label" (e.g. "without percussion", "432 Hz", "morning session") that would let a rasika quickly tell them apart in a list.

**User impact:** Once we have 2+ tracks per ragam, the list will be confusing. Rasikas won't know which to pick.

**Open question:** What is the right label for a track within a ragam group? Options:
- Use `title` as the variant label (artists write a short distinguishing name)
- Add a structured `variant_label` field to tracks (e.g. "Percussion · 440 Hz")
- Derive from existing fields: `has_percussion` + `frequency` → auto-generate label (requires those schema fields, planned for Phase 2)
- Use `tags` as the primary visual differentiator (already present, no schema change)

**No action needed yet** — only 1 track per ragam in seed data. Revisit when adding second track to any ragam.

**Status:** Open (deferred — no urgency until content library grows)

---

## 2026-02-18

### Issue 1.11-A — Pause button renders with iOS Safari default media control appearance

**File:** `app/mode/[scenario]/[trackId]/session-player.tsx` line 227–234

**What's wrong:** The pause button uses the `⏸` Unicode character (U+23F8). On iOS Safari, this character can trigger the browser's native media control styling — overriding the rounded-full shape and accent color with a system-default appearance. The button also lacks `type="button"`, which can cause additional rendering inconsistencies.

**User impact:** The pause button looks out of place on the primary use-case device (iPhone). Breaks the visual consistency of the session player — the most important screen in the app.

**Fix needed:** Add `type="button"` to all `<button>` elements in the session player. Replace `⏸` with a CSS/SVG-based pause icon or plain-text `||` to avoid the iOS media glyph treatment. Tailwind's `-webkit-appearance: none` (`appearance-none`) may also be needed.

---

### Issue 1.11-B — Play/pause circle button shifts left when "stop" link appears

**File:** `app/mode/[scenario]/[trackId]/session-player.tsx` line 225–248

**What's wrong:** The running/paused state renders both the circle button and the "stop" text link in a `flex items-center gap-4` row. Because the row is centered as a unit, the circle button shifts left when "stop" appears beside it. The circle button is the visual anchor of the screen — it should stay fixed in the center.

**User impact:** Jarring visual jump on play → the primary button moves the moment you tap it. Feels unstable.

**Fix needed:** Anchor the circle button to the center using relative/absolute positioning. One approach: wrap in a `relative` container, position the "stop" link with `absolute left-full ml-4` so it floats beside the button without affecting its position. Alternatively, use a fixed-width outer container with `justify-center` and overlap the stop link on top with absolute positioning.

---

---

## 2026-02-13 — Middleware → proxy migration (Next.js 16 breaking change)

**What:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. The Supabase session refresh logic lived in middleware, so it broke silently on upgrade.

**Why it mattered:** Without the session refresh running on every request, Supabase auth tokens would expire mid-session and users would get logged out unexpectedly with no error message.

**Resolution:** Ran the Next.js 16 codemod. Renamed `middleware.ts` → `proxy.ts`, renamed the exported function, updated all internal imports. Also renamed `lib/supabase/middleware.ts` → `lib/supabase/session.ts` to remove the confusing naming overlap.

**Test signal:** Auth state should persist across page navigations without re-login.

---

## 2026-02-13 — Route directory renames broke dynamic params

**What:** Route directories were renamed: `[mode]` → `[scenario]` and `[ragamId]` → `[trackId]`. Any code still referencing the old param names (`params.mode`, `params.ragamId`) would silently return `undefined`.

**Why it mattered:** Track and session pages would render with no data — broken UI with no error thrown, because `undefined` is valid JavaScript.

**Resolution:** Renamed all `params.mode` → `params.scenario` and `params.ragamId` → `params.trackId` across all page and component files. Added `await params` per Next.js 15+ requirement (params is now a Promise).

**Test signal:** Navigating to `/mode/focus/[any-track-id]` should load track data. Check that `params.scenario` and `params.trackId` are both defined on the session player page.

---

## 2026-02-13 — Supabase publishable key vs. anon key

**What:** Supabase renamed their client-side key from "anon key" to "publishable key" with a new format (`sb_publishable_...`). The env var name changed from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Why it mattered:** Any deployment or local setup using the old env var name would fail to connect to Supabase entirely. The Supabase client would return `null`, triggering the seed fallback — silently, with no auth and no database.

**Resolution:** Updated `.env.local`, `.env.example`, all client/server Supabase init files, and CLAUDE.md to use the new key name. Documented in CLAUDE.md gotchas section.

**Reference:** https://github.com/orgs/supabase/discussions/29260

---

## 2026-02-13 — `tradition` column removed from ragams

**What:** The `ragams` table originally included a `tradition` column (Carnatic / Hindustani / both). This was intentionally removed from the data model.

**Why it mattered:** Tradition is a complex, contested categorization — many ragams exist in both traditions with variation. Encoding it as a single column would mislead users and force editorial decisions that don't belong in the MVP. The description field can carry nuance instead.

**Resolution:** Removed from `lib/types.ts`, `content/seed.ts`, and `supabase/migrations/001_initial_schema.sql`. Added to CLAUDE.md gotchas: "Don't re-add it."

---
