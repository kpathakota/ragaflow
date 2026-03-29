# Ragaflow QA Log

Dev appends an entry here after every committed task. QA agent reads and works from this file.

Format: newest entries at top. Check `[ ]` boxes as verified, mark with date.

---

## Fix — Create rasika row on sign-in
**Commit:** f78a0b7
**Date:** 2026-03-26
**Status:** Pending verification

### What changed
- Extracted `ensureRasika` from `lib/favorites.ts` into `lib/ensure-rasika.ts` (shared utility)
- `AuthProvider` calls `ensureRasika` on initial load (if user exists) and on `SIGNED_IN` events
- `lib/favorites.ts` imports from the shared utility instead of its own copy

### Manual checks
- [ ] Sign up with a new email — verify a `rasikas` row is created immediately in Supabase (check the table)
- [ ] Sign in with an existing account that already has a `rasikas` row — no duplicate row created, no errors
- [ ] Visit `/profile` immediately after sign-in (without favoriting anything first) — Plan section with "Go Premium" card should be visible
- [ ] Favorite a track — still works (no regression from extracting `ensureRasika`)
- [ ] Sign out and visit `/profile` — should redirect to `/auth` (no crash from `ensureRasika` running without a user)
- [ ] Open app without Supabase env vars — no crash, loading completes normally

---

## Task 2.6b — Webhook security hardening + env var rename
**Date:** 2026-03-17
**Status:** Verified — 2026-03-26

### Changes
- Renamed `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY` in `lib/supabase/admin.ts` (matches new Supabase project terminology)
- Created migration `008_subscription_update_fn.sql`: `SECURITY DEFINER` function `update_rasika_subscription` that validates status values and is restricted to `service_role` only
- Updated webhook handler to use `.rpc("update_rasika_subscription", ...)` instead of raw `.update()`

### Manual checks
- [x] Run migration 008 in Supabase SQL editor (both staging and production)
- [x] Rename env var in Vercel: `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY` (both Preview and Production)
- [x] Rename env var in `.env.local`: `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY`
- [x] Test checkout flow end-to-end on Vercel preview — verify `subscription_status` updates in `rasikas` table
- [x] Verify calling `update_rasika_subscription` from browser console (as authenticated user) returns permission denied
- [x] Verify invalid status values are rejected by the function
- [x] Add `SUPABASE_SECRET_KEY` to production before merging into main.

### Supabase / infra steps
- [x] Run `supabase/migrations/008_subscription_update_fn.sql` in SQL editor

---

## Task 2.6 — Polar.sh billing integration
**Date:** 2026-03-17
**Status:** Verified — 2026-03-26

### Prerequisites
- Polar sandbox account + org created at sandbox.polar.sh
- 3 products exist in sandbox: monthly ($5), yearly ($30), lifetime ($100), sponsor ($300)
- `.env.local` has all 5 env vars: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `NEXT_PUBLIC_POLAR_SERVER`, `NEXT_PUBLIC_POLAR_ORG_SLUG`, `SUPABASE_SECRET_KEY`
- Polar CLI installed (`npm install -g @anthropic-ai/polar-cli` or via Homebrew)

### Local testing (with `polar listen`)

**Setup:**
1. Start dev server: `npm run dev`
2. In a separate terminal, start webhook forwarding: `polar listen http://localhost:3000/api/webhooks/polar`
3. Copy the webhook secret from `polar listen` output if it differs from `.env.local` — restart dev server if updated

**Checkout flow (monthly/yearly subscription):**
- [x] Sign in, go to `/profile`, verify "Go Premium" card is visible with "$5/mo · $30/yr · $100 lifetime · $300 sponsor"
- [x] Click "Subscribe" — should open Polar hosted checkout at `sandbox.polar.sh/{org}/checkout?customerExternalId={your-uid}`
- [x] Verify your Supabase UID appears in the URL query string (`customerExternalId=...`)
- [x] Select a monthly plan, enter test card `4242 4242 4242 4242`, any future expiry, any CVC, any billing details
- [x] Complete checkout — Polar should redirect back to `/profile?checkout=success`
- [x] Verify the green "Payment received — your plan will update shortly" banner appears
- [x] Check `polar listen` terminal — should show `subscription.active` event received
- [x] In Supabase dashboard, check `rasikas` table: `subscription_status` should be `active`, `polar_customer_id` should be populated
- [x] Refresh `/profile` — should show emerald "Premium" card with "All tracks unlocked" and "Manage subscription" link

**Customer portal:**
- [x] Click "Manage subscription" on profile — should redirect to Polar's hosted customer portal
- [x] Verify the portal shows order history and payment method
- [x] Cancel the subscription via the portal
- [x] Check `polar listen` — should show `subscription.canceled` event
- [x] In Supabase: `subscription_status` should be `canceled`
- [x] Refresh `/profile` — should still show "Premium" card but with "Access continues until your billing period ends"
- [x] "Manage subscription" link should still be visible (rasika can resubscribe)

**Lifetime purchase:**
- [x] Reset your `subscription_status` to `free` in Supabase (for a clean test)
- [x] Go to `/profile`, click "Subscribe", select lifetime ($100) product
- [x] Complete checkout with test card
- [x] Check `polar listen` — should show `order.created` event with `billingReason: "purchase"`
- [x] In Supabase: `subscription_status` should be `lifetime`
- [x] Refresh `/profile` — should show emerald "Lifetime" card with "You have lifetime access to all tracks"
- [x] "Manage subscription" link should NOT appear for lifetime

**Edge cases:**
- [x] Open `/profile` in an incognito window (not logged in) — should redirect to `/auth`, never reach checkout
- [x] Manually visit `/api/portal` without being logged in — should redirect to `/profile` (not crash)
- [x] Manually visit `/api/portal` as a free user (no `polar_customer_id`) — should redirect to `/profile`

### Deployed testing (Vercel preview)

**Setup:**
1. Push `feat/polar-billing` branch — Vercel should auto-deploy a preview
2. Verify preview build succeeds (no prerender errors)
3. In Polar sandbox dashboard → Settings → Webhooks:
   - Add webhook URL: `https://{stable-branch-alias}.vercel.app/api/webhooks/polar` (use the stable branch alias, NOT the per-commit URL)
   - Subscribe to events: `subscription.active`, `subscription.canceled`, `subscription.revoked`, `order.created`
   - Copy the webhook secret and add it to Vercel preview env vars as `POLAR_WEBHOOK_SECRET`
4. Verify all 6 Polar + service role env vars are set in Vercel "Preview" environment

**Smoke test on preview:**
- [x] Sign in on the preview URL
- [x] Go to `/profile`, click "Subscribe"
- [x] Verify checkout URL points to `sandbox.polar.sh` (not production `polar.sh`)
- [x] Complete a test checkout
- [x] Verify redirect back to `/profile?checkout=success` on the preview URL (not localhost)
- [x] Check Supabase staging: `subscription_status` updated
- [x] Click "Manage subscription" — portal loads and returns to preview URL

### Webhook event → status mapping (reference)

| Polar event | `subscription_status` set to | Notes |
|---|---|---|
| `subscription.active` | `active` | Fires after payment clears |
| `subscription.canceled` | `canceled` | User canceled, access until period end |
| `subscription.revoked` | `expired` | Period ended after cancel |
| `subscription.past_due` | `past_due` | Payment failed, grace period |
| `order.created` (billingReason=`purchase`) | `lifetime` | One-time purchase |

---

## Server-side auth guards for /auth and /profile
**Date:** 2026-03-17
**Status:** Pending verification

### What changed
- `app/auth/page.tsx` → Server Component. Checks session via server Supabase client, redirects to `/` if logged in. Renders `<AuthForm />` if not.
- `app/auth/auth-form.tsx` → New client component. Contains the sign-in/sign-up form (extracted from old page). No auth checking.
- `app/profile/page.tsx` → Server Component. Checks session, redirects to `/auth` if not logged in. Renders `<ProfileClient user={user} />` if logged in.
- `app/profile/profile-client.tsx` → New client component. Contains all profile rendering (extracted from old page). Receives `user` as prop instead of reading from `useAuth()`. Still uses `useAuth()` for `signOut`.

### Manual checks
- [x] **Auth redirect (logged in):** Sign in, then navigate to `/auth` directly — should redirect to `/` instantly with no flash of the sign-in form
- [x] **Auth redirect (logged out):** Sign out, navigate to `/auth` — should show the sign-in form
- [x] **Auth form works:** Sign in with valid credentials — should redirect to `/`
- [x] **Auth sign-up works:** Sign up with new email — should show confirmation message
- [x] **Auth error handling:** Sign in with wrong password — should show error message
- [x] **Profile redirect (logged out):** Sign out, navigate to `/profile` directly — should redirect to `/auth` instantly with no flash of profile content
- [x] **Profile redirect (logged in):** Sign in, navigate to `/profile` — should show full profile with stats, defaults, journey
- [x] **Profile sign-out:** Click "Sign out" on profile — should redirect to `/`
- [x] **Profile checkout banner:** Navigate to `/profile?checkout=success` while logged in — should show the green "Payment received" banner
- [x] **Profile subscription card:** Verify the Plan section renders correctly (Go Premium for free users, Premium for active subscribers)
- [x] **Vercel build:** Push to branch, verify Vercel preview build succeeds (no more `useSearchParams` prerender error)
- [x] **No visual changes:** Both pages should look identical to before — same layout, same colors, same content

---

## Task 2.4 — Subscribe link in profile
**Commit:** (see below)
**Date:** 2026-03-11
**Status:** Pending verification

### Manual checks
- [x] App builds without errors (`npx tsc --noEmit`)
- [x] Profile page loads for logged-in rasika
- [x] Free rasika sees "Go Premium" card with amber border and "Coming soon" placeholder
- [x] Subscribed rasika sees "Premium" card with emerald border (test by setting `subscription_status = 'subscribed'` in Supabase)
- [x] Lifetime rasika sees "Lifetime" card with emerald border and lifetime-specific copy
- [x] Plan section appears between Default tracks and Sign out button
- [x] No visual regressions on other profile sections (account, stats, journey, defaults)

---

## Task 2.3 — Premium badge on track cards
**Commit:** (see below)
**Date:** 2026-03-11
**Status:** Pending verification

### Manual checks
- [ ] App builds without errors (`npx tsc --noEmit`)
- [ ] Tracks with `free: false` show a subtle "Premium" badge on track cards (amber pill)
- [ ] Tracks with `free: true` show no badge
- [ ] Badge appears on scenario track list pages (`/mode/focus`, `/mode/sleep`, `/mode/meditate`)
- [ ] Badge appears on explore page (`/explore`)
- [ ] Badge doesn't clash with heart/favorite icon (positioned inline with metadata)
- [ ] Badge is visible when not logged in (no auth required)
- [ ] Tapping a premium track still opens the session player (no access gating yet)

---

## Task 2.2 — Rename rasika_preferences → rasikas + subscription columns
**Commit:** (see below)
**Date:** 2026-03-11
**Status:** Pending verification

### Manual checks
- [ ] App builds without errors (`npx tsc --noEmit`)
- [ ] Homepage loads and shows quick play defaults (if any exist)
- [ ] Profile page loads and shows preferences, stats, listening journey
- [ ] Favoriting a track works (heart toggle on track card and session player)
- [ ] Setting a default track works (session player → set as default)
- [ ] Custom duration persists across reloads
- [ ] New rasika sign-up creates a row in `rasikas` table (not `rasika_preferences`)

### Supabase / infra steps
- [ ] Run `supabase/migrations/007_rename_rasikas_add_subscription.sql` on **staging** Supabase
- [ ] Run `supabase/migrations/007_rename_rasikas_add_subscription.sql` on **production** Supabase
- [ ] Verify `rasikas` table exists with `subscription_status` and `polar_customer_id` columns
- [ ] Verify old `rasika_preferences` table no longer exists
- [ ] Verify RLS policy "rasikas manage own record" is active

---

## Task 2.0b+c — Flexible timer: data layer + UI
**Commit:** (pending)
**Date:** 2026-03-04
**Status:** Pending verification

### Manual checks
- [ ] Session player shows 3 pills: 25m · 45m · … (when no custom value saved)
- [ ] Tapping "…" opens an inline number input (auto-focused)
- [ ] Entering a value (e.g. 90) and pressing Enter/blurring sets it as the duration and shows "90m" on the pill
- [ ] Values outside 1–120 are rejected (input has min/max)
- [ ] Custom value persists across page reloads (saved to Supabase)
- [ ] When returning to the session player, the custom pill shows the saved value (e.g. "90m")
- [ ] Selecting 25 or 45 after setting a custom value works — custom pill stays but isn't highlighted
- [ ] Setting custom to 1 works (QA shortcut for fast session testing)
- [ ] Starting a session with a custom duration works: timer counts down, completion fires, certification upserts
- [ ] "Set as default" on completion captures the custom duration correctly
- [ ] Homepage quick-play with a non-25/45 default pre-selects the custom pill on the session player
- [ ] Non-authenticated rasikas see 25m · 45m · … (custom saves silently fail, no crash)

---

## Task 2.0a — Schema: add custom_duration to rasika_preferences
**Commit:** 3066d20
**Date:** 2026-03-04
**Status:** Pending verification

### Manual checks
- [x] `custom_duration` column exists on `rasika_preferences` after running migration 006
- [x] Column is nullable integer, no default value
- [x] Existing rows unaffected (custom_duration is NULL)

### Supabase / infra steps
- [x] Run `supabase/migrations/006_custom_duration.sql` in staging SQL editor
- [x] Run `supabase/migrations/006_custom_duration.sql` in production SQL editor

---

## Task 1.6 — Cloud Storage: Cloudflare R2

**Commit:** (pending)
**Date:** 2026-02-20
**Status:** Pending verification

### Manual checks
- [ ] Audio plays in session player from R2 URL (local dev: `npm run dev`, open any track)
- [ ] Audio plays on Vercel preview deploy (after push to `dev`)
- [ ] No audio files in `public/audio/` (only README.md and empty subdirs)
- [ ] `.gitignore` blocks `*.m4a`, `*.mp3`, `*.flac`, `*.wav` under `public/audio/`
- [ ] `supabase/seed.sql` uses full R2 URLs (`https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/...`)

### Supabase / infra steps
- [ ] Run on **staging** Supabase: `UPDATE tracks SET audio_url = 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a';`
- [ ] Run on **production** Supabase: same UPDATE statement
- [ ] Verify R2 CORS allows playback from `localhost:3000`, `*.vercel.app`, and `ragaflow.io`
- [ ] After git history rewrite: confirm no audio files in old commits (`git log --all --diff-filter=A -- 'public/audio/*.m4a' 'public/audio/*.mp3'` returns nothing)

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
