# Account Deletion Design (iOS + Web)

Pre-submission requirement (App Store Guideline 5.1.1(v)): apps that offer
account creation must let users initiate account deletion **in the app**.
Deletion currently exists nowhere — this doc covers the user flow and dev
design for both platforms. See `docs/beta-checklist.md` for how this gates
submission.

## User flow

### Web (`/profile`)

1. Below the existing **Sign out** button, a red **Delete account** button
   (destructive styling: red border/text, same rounded-xl shape as Sign out).
2. Tapping it does **not** delete anything — it reveals an inline warning
   panel (red-tinted card, same pattern as the checkout error banner):

   > **Delete your account?**
   > This permanently deletes your account and all of your data — favorites,
   > listening history, certifications, and default tracks. This cannot be
   > undone.

   Two buttons: **Cancel** (highlighted, dismisses the panel) and **Permanently delete**
   (bordered-red, destructive).
3. On confirm: button shows "Deleting…" (disabled), the client invokes the
   backend, then signs out locally and redirects to `/` in the signed-out
   state.
4. Error paths:
   - **Active subscription (409):** "You have an active subscription. Please
     cancel it first, then delete your account." with a link to
     `/api/portal` (Manage subscription).
   - **Anything else:** "Something went wrong. Please try again, or email
     support@ragaflow.io." The account is left intact.

### iOS (Profile view)

1. Below **Sign Out**, a **Delete Account** button — `role: .destructive`,
   red text, same card styling as Sign Out.
2. Tapping presents a standard destructive `.alert`:

   > **Delete your account?**
   > This permanently deletes your account and all of your data — favorites,
   > listening history, certifications, and default tracks. This cannot be
   > undone.

   Buttons: **Cancel** (`.cancel`) and **Delete Account** (`.destructive`).
3. On confirm: progress indicator, invoke the backend, sign out locally,
   dismiss to the signed-out Home.
4. Error paths:
   - **409 (active subscription):** possible on iOS too — a web subscriber
     can be signed in on iOS. Alert: "You have an active subscription.
     Please cancel it first, then try again." **No URL and no mention of
     web checkout** — linking out to subscription management risks a
     Guideline 3.1.1 conversation; neutral copy is safe.
   - **Anything else:** alert with retry + support@ragaflow.io.

Copy note: the warning must name the concrete losses (favorites, listening
history, certifications, defaults) — "all your data" alone doesn't land.

## What gets deleted

Deleting the `auth.users` row is the single destructive operation; the
schema cascades from there:

| Data | FK behavior today | Outcome |
|---|---|---|
| `auth.users` row | — | Deleted (email freed for re-registration) |
| `rasikas` | `on delete cascade` | Deleted (favorites, defaults, subscription status) |
| `listening_sessions` | `on delete cascade` | Deleted |
| `certifications` | `on delete cascade` | Deleted |
| `analytics_events` | **no `on delete` clause (RESTRICT)** | **Blocks deletion — migration required.** Change to `on delete set null` |
| Polar customer + payment records | external | Retained by Polar (merchant of record, legal/tax requirement) — privacy policy already needs to say this |
| Audio on R2 | shared content | Untouched |

**Decision — `analytics_events` rows are anonymized, not deleted:**
`rasika_id` becomes null via `on delete set null`. The column comment
already frames null as "anonymous visit", DAU/error metrics stay intact,
and the rows no longer reference any personal identifier (`anonymous_id`
is a random per-session UUID). This migration is a hard prerequisite —
with the current RESTRICT default, `deleteUser` fails for any rasika who
has ever fired an authenticated analytics event.

## Decision — active subscriptions block deletion

If `rasikas.subscription_status` is `active` or `past_due`, the backend
refuses with 409 and the client directs the rasika to cancel first.

| Status | Deletion allowed? | Why |
|---|---|---|
| `free`, none | Yes | Nothing to unwind |
| `canceled` | Yes | Already canceled; remaining paid period is forfeited (warning copy covers "cannot be undone") |
| `lifetime` | Yes | One-time purchase, nothing recurring to orphan. Access is forfeited permanently |
| `active`, `past_due` | **No — 409** | Deleting would orphan a live Polar subscription that keeps billing a customer whose account no longer exists |

Auto-canceling via the Polar API during deletion was considered and
rejected for v1: more code, more failure modes (partial states where the
account is gone but the subscription isn't, or vice versa), and the iOS
beta is fully free anyway. Revisit if support tickets show friction.

## Architecture — Supabase Edge Function (decided in beta checklist)

```
Profile → Delete account → confirm
  → client invokes edge function `delete-account` (user JWT attached)
  → function resolves uid FROM THE JWT (never from request body)
  → service role: read rasikas.subscription_status
      → active/past_due → 409 { error: "active_subscription" }
  → service role: auth.admin.deleteUser(uid)
      → cascades rasikas / listening_sessions / certifications
      → analytics_events.rasika_id → null (after migration 011)
  → 200 → client signs out locally → signed-out Home
```

Why an edge function over a Next.js API route (which could reuse
`web/lib/supabase/admin.ts`):

| Option | Pros | Cons |
|---|---|---|
| **Edge function (chosen)** | Platform-neutral — both clients invoke via `functions.invoke()` with the JWT attached automatically; lives with the database; survives web outages and the domain split (iOS never depends on a Vercel URL); service role key auto-injected | New tooling (`supabase functions deploy`), Deno runtime |
| Next.js route (`/api/account/delete`) | Reuses existing admin-client + route patterns, one deploy pipeline | iOS account deletion (an App Review requirement) would depend on the web app's deployment and URL, which is about to change with the domain split |

The clincher: account deletion is the one flow Apple will test. It should
not break because a Vercel deploy or domain migration did.

**Security invariants:**
- `verify_jwt` stays on (default) — unauthenticated calls get 401 before
  the function runs.
- The uid to delete comes only from the verified JWT. There is no
  user-supplied id anywhere, so "delete someone else's account" is
  structurally impossible.
- CORS headers required (browser calls from the web app; handle `OPTIONS`).

## Implementation plan

### PR 1 — backend (`feat/account-deletion-backend`)
- `supabase/migrations/011_analytics_events_set_null.sql`:
  drop + re-add the `analytics_events.rasika_id` FK with
  `on delete set null`. Apply via `uploads/sync.sql` in the SQL editor
  (per workflow — never executed from the terminal). Safe to apply ahead
  of everything else; no behavior change until deletion exists.
- `supabase/functions/delete-account/index.ts` (Deno):
  auth check → subscription guard → `admin.deleteUser` → 200/401/409/500.
  Deploy with `supabase functions deploy delete-account`.

### PR 2 — web (`feat/account-deletion-web`)
- `web/app/profile/profile-client.tsx`: red button below Sign out,
  inline confirm panel, `supabase.functions.invoke("delete-account")`,
  then `signOut({ scope: "local" })` (a global sign-out would fail — the
  user no longer exists) and `router.push("/")`.
- Privacy page + `docs/privacy-policy.md`: "delete your account in the
  app (Profile → Delete account), or email support@ragaflow.io".
- `/support` page: add a "How do I delete my account?" entry.
- Vitest coverage for the confirm-panel state machine (reveal, cancel,
  409 message, generic error leaves account intact) with the invoke
  mocked. Run `/test-gaps` on the diff before the PR; `/pr-screenshots`
  for the new UI states.

### PR 3 — iOS (`feat/account-deletion-ios`)
- `SupabaseService.deleteAccount()`:
  `client.functions.invoke("delete-account")`, then local-scope sign-out
  (ignore sign-out errors — the server session is already gone).
- `ProfileView` + `ProfileViewModel`: destructive button, `.alert`
  confirmation, in-flight state, error alerts, dismiss to signed-out Home.
- Requires a new Xcode Cloud build — this feature gates App Store
  submission, so it must be in the submitted build.

### Rollout order
1. Migration 011 (prod SQL editor, via `uploads/sync.sql`)
2. Deploy edge function
3. Merge web PR → verify on prod web
4. Merge iOS PR → TestFlight build → verify
5. Check off the beta-checklist item; update `CLAUDE.md` key files

## Test matrix (prod-only Supabase — throwaway accounts, no bulk writes)

Create fresh `kpathakota+del-test-*@gmail.com` accounts per run:

- [ ] Delete a rasika with favorites, sessions, certs, and analytics events
      → all owned rows gone; `analytics_events.rasika_id` nulled, rows kept
- [ ] Deleted credentials can no longer sign in
- [ ] Same email can re-register fresh (clean rasika, no ghost data)
- [ ] Unauthenticated invoke → 401, nothing deleted
- [ ] Signed-in user A cannot cause deletion of user B (no id parameter
      exists — verify the function ignores any request body)
- [ ] Web: post-deletion lands signed-out on `/`; `/profile` redirects
      to `/auth`
- [ ] iOS: post-deletion lands signed-out Home; no stale session/crash
- [ ] 409 path: account with `subscription_status = 'active'` (flip the
      column on a throwaway account via SQL editor rather than making a
      real purchase) → deletion refused, correct message on both platforms
- [ ] `lifetime` and `canceled` statuses → deletion allowed

Do **not** run any of this against the real `kpats` account or the
App Review demo account (`kpathakota+alt@gmail.com` must survive review).
