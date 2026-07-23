# Ragaflow Issue Log

A record of bugs and issues encountered, why they mattered, and how they were resolved. Newest entries at the top.

## 2026-07-22

### Issue — Portal failures silently redirect to /profile with no feedback (low priority)

**File:** `web/app/api/portal/route.ts` (catch block, ~line 48)

**What's wrong:** Every failure in the `/api/portal` route — unauthenticated, missing `polar_customer_id`, Polar API error — is caught and silently redirected back to `/profile`. To the rasika, the "Manage subscription" link (Plan card, and now the delete-account 409 panel) appears to do nothing.

**How it surfaced:** Testing the account-deletion 409 path with a throwaway account whose `subscription_status` was flipped to `active` via SQL. Such an account has no `polar_customer_id` (only a real checkout's webhook sets it), so the portal link looked dead. Expected for a synthetic subscriber — but a real subscriber hitting a Polar API error would see the same silent nothing.

**User impact:** Any real portal failure is indistinguishable from the link not working. No path to support, no retry signal.

**Fix needed:** Redirect with a query param (e.g. `/profile?portal=error`) and render a banner on the profile page, matching the existing checkout success/error banner pattern in `profile-client.tsx`. Keep the silent redirect only for the unauthenticated case.

**Status:** Open

---

## 2026-04-12

- The artist note reads "From the session" and doesn't feel clickable. Have it be expanded to begin with and with larger padding between that and the buttons. **Status: Fixed**
- Can we have one option be the "full-track" which would just play the thing from beginning to end on the session screen. That would effectively pre-set the length to the entire length of the track. **Status: Fixed**
- Instead of stop, it should be called reset and be under the play button in the session screen. **Status: Fixed**
-

## 2026-04-09

### Issue — Subscribe button has no visible hover state (low priority)

**File:** `app/profile/profile-client.tsx` ~line 346

**What's wrong:** The "Subscribe" button has `bg-[#C9A54C] ... hover:bg-[#C9A54C]` — the hover background is identical to the normal background, so there is no visible hover feedback. This was carried forward from the original palette (same issue with the old `#D4A054` color).

**User impact:** The subscribe button feels unresponsive on hover. No visual affordance that it's interactive beyond the cursor change.

**Fix needed:** Use a distinct hover shade, e.g. `hover:bg-[#C9A54C]/90` or a slightly lighter/darker variant.

**Status:** Open

---

### Issue — Track title not displayed in session player or track cards

**Files:** `components/track-card.tsx`, `app/mode/[scenario]/[trackId]/session-player.tsx`

**What's wrong:** Tracks now have real titles in the database (e.g. "Fiery Todi", "A Kannadagowla in Rupakam", "A Sweet Asaveri"), but the UI doesn't surface them properly:

1. **Session player** (`session-player.tsx` ~line 204, ~line 365): Displays `ragam?.name ?? track.title` — the ragam name always wins, so the track title is never shown. The completion summary has the same issue.

2. **Track card** (`track-card.tsx` ~line 49-52): The headline logic is `dateLabel · location`, falling back to `track.title` only if both date and location are missing. With the new CSV data, most tracks have both, so titles are buried.

**User impact:** Gautam's track titles (which carry editorial voice — "Fiery Todi", "A Sweet Asaveri") are invisible. Every track just shows the ragam name, making tracks within the same ragam indistinguishable. This is the same underlying problem described in Issue 1.13-B but now it's actionable since we have real titles.

**Fix needed:**
- Session player: Show `track.title` as the primary heading when present, with ragam name as a subtitle. Fall back to ragam name when title is null.
- Track card: Show `track.title` prominently when present. Date/location can remain as secondary info.

**Status:** Fixed

---

## 2026-03-26

### Issue — Timer drifts / runs slow when browser tab is not in focus

**File:** `app/mode/[scenario]/[trackId]/session-player.tsx`

**What's wrong:** The session timer uses `setInterval` to count down every second. When the browser tab loses focus, most browsers throttle `setInterval` to fire at most once per second (or less frequently). This causes the displayed time to drift behind real elapsed time — a 20-minute timer can take significantly longer than 20 minutes to complete.

**User impact:** Rasikas who switch tabs or lock their phone during a session will see an inaccurate timer. Sessions take longer than expected to "complete", and listening session durations logged to the database will be incorrect.

**Fix needed (two parts):**

1. **Wall-clock timer:** Replace the interval-based countdown with a wall-clock approach — store `Date.now()` at session start and compute remaining time as `duration - (Date.now() - startTime)` on each tick. The interval drives re-renders, not timekeeping. Handles display drift and snaps to correct time when tab regains focus.

2. **Background completion notification:** The wall-clock fix alone doesn't solve the case where the session *ends* while the tab is backgrounded — the rasika won't know it's done. Layered approach:
   - **Notification API** — request permission at session start, fire a `new Notification(...)` when time is up. Works in background tabs without a service worker.
   - **`visibilitychange` listener** — when tab regains focus, check if session should have completed and immediately trigger the completion flow. Covers the case where notification permission was denied.
   - **Audio cue** (optional) — play a completion chime. Browsers generally allow audio started in a foreground tab to continue playing in the background.

**Status:** Fixed. Handled the wall-clock timer but deferred background completion notification. 

---

## 2026-03-23

### Issue — Subscribe button on profile doesn't render until rasika interacts (e.g., favorites a track) (low priority)

**File:** `app/profile/profile-client.tsx`

**What's wrong:** On the profile page, the "Go Premium" subscribe card (with the Subscribe button) does not appear on initial load. It only becomes visible after the rasika performs an interaction elsewhere — e.g., favoriting a track — and then returns to the profile page.

**Likely cause:** The subscription status or rasika data may not be loaded/available on initial render, causing the plan section to be conditionally hidden. A state update triggered by favoriting (which refreshes the rasika record) may be unblocking the render.

**User impact:** New rasikas visiting their profile for the first time won't see the subscribe option until they've interacted with the app in a way that triggers a rasika data refresh.

**Status:** Fixed. 

---

## 2026-03-17

### Issue — Auth redirect called during render causes React error (HIGH PRIORITY)

**File:** `app/auth/page.tsx` lines 20–23

**What's wrong:** `router.replace("/")` is called synchronously in the render body of `AuthPage` — not inside a `useEffect`. React prohibits side effects (including navigation) during the render phase. This triggers the error:

```
Cannot update a component (`Router`) while rendering a different component (`AuthPage`).
```

This is a React rules violation that fires whenever a logged-in user lands on `/auth` — including after sign-in and on any navigation that hits the auth page with an active session.

**Why it's high priority:** This error is surfacing in production (Vercel deployment) and on the profile screen (likely because the profile page routes through auth context updates that hit this code path). React may suppress the render entirely, leaving the user stuck.

**Root cause:**
```tsx
// app/auth/page.tsx — lines 20–23 (current broken code)
if (user) {
  router.replace("/");   // ← side effect during render
  return null;
}
```

Calling `router.replace()` during render is invalid. It must be moved into a `useEffect` that runs after the component mounts (or use Next.js `redirect()` server-side, but this is a client component).

**Fix needed:** Wrap the redirect in `useEffect`:
```tsx
useEffect(() => {
  if (user) router.replace("/");
}, [user, router]);

if (user) return null;
```

This defers the navigation call to after render, satisfying React's rules while preserving the same behavior.

**Status:** Fixed — `router.replace` moved into `useEffect`; `useSearchParams` extracted to `CheckoutSuccessBanner` child component wrapped in `<Suspense>` in `app/profile/page.tsx`

---

### Issue — Audio does not resume position when timer preset is changed (low priority)

**File:** `app/mode/[scenario]/[trackId]/session-player.tsx`

**What's wrong:** When a rasika changes the timer preset mid-session (e.g., from 20 min to 45 min), the audio restarts from the beginning instead of continuing from the current playback position. The request is for a "circular buffer" behavior — audio state should be preserved across timer changes.

**User impact:** Disrupts flow for rasikas who want to extend a session. Restarting a raga from the beginning breaks the listening experience.

**Status:** Open — needs clarification (see questions below)

---

### Issue — Explore screen only supports single tag selection (low priority)

**File:** `app/explore/explore-client.tsx`

**What's wrong:** The tag filter on the explore screen allows selecting only one tag at a time. Clicking a second tag deselects the first. Rasikas cannot filter by multiple attributes simultaneously (e.g., "sleep" + "no-percussion").

**User impact:** Limited filtering power as the track library grows. A rasika looking for a specific combination of qualities has no way to express that query.

**Status:** Open — needs clarification (see questions below)

---



## 2026-03-11

### Issue — Session player top bar clipped on smaller viewports / browser chrome

**File:** `app/mode/[scenario]/[trackId]/session-player.tsx` line 174

**What's wrong:** The session player's root container uses `min-h-screen` (`100vh`) with `pt-6` top padding. On viewports where browser chrome (address bar, tab bar) is visible, `100vh` includes the area behind the chrome, so the top of the layout is pushed above the visible area. The "← Back" link and the ♡ favorites icon are partially or fully cut off.

**Reproduction:**
1. Open any track in the session player (e.g. `/mode/focus/<any-track-id>`)
2. Use a browser window that is not full-height, or a mobile browser with visible address bar
3. Observe the top bar — "Back" link and heart icon are clipped

**Screenshot:** `Screenshot 2026-03-11 at 7.24.47 AM.png` — "Back" is barely visible, heart icon is cut off entirely.

**User impact:** Rasikas cannot navigate back or toggle favorites without scrolling up first. On mobile Safari (the primary device), this is the default state since the address bar is always visible on initial load.

**Fix options:**
- Replace `min-h-screen` with `min-h-dvh` (dynamic viewport height, Tailwind v4) which accounts for browser chrome
- Alternatively use `min-h-[100dvh]` if `min-h-dvh` isn't available in the current Tailwind version
- Ensure `pt-6` provides enough clearance, or add `pt-safe` / `padding-top: env(safe-area-inset-top)` for notched devices

**Status:** Open

---

## 2026-02-25
-  We need to do a pass on the session timer complete screen. It looks okay for now but should be better. I need it to really show completion. Also when saving the default, the entire "session" should be captured (track and duration) so that it's easy from the home screen to start the default duration. 
- In the profile screen, once someone has achieved a certification, I want to actually design real badges. So that's going to be work. The progress bar should change color to highlight the current tier. For example, Bronze should be bronze, Silver should be silver etc. 
- Need a better word than Certifications
- When we expand the artist note, the graphic resizes and looks weird (no longer blends properly with the surrounding frame). How can we fix that? **Status: Fixed**
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
