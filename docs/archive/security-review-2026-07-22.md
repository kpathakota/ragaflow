# Security Review — 2026-07-22

**Branch:** `dev` (commit: 49eeeb6)
**Scope:** full

## Summary

- Dependencies: 21 total (21 required, 0 reducible, 0 unused)
- Trust flags: 1 dependency needs manual review (`@polar-sh/nextjs` — below download threshold, accepted with rationale)
- Vulnerabilities: 9 packages flagged (0 critical, 7 high, 1 moderate, 1 low) — only `next` is a direct dependency; patch available
- Code issues: 1 HIGH, 4 MEDIUM (3 web + 1 iOS), 4 LOW, 5 INFO

## Action Items

### Immediate (do now)
- [ ] **H1 — lock down `rasikas` subscription columns** (migration 013: revoke table-wide UPDATE/INSERT from `authenticated`, grant back preference columns only). Closes entitlement self-escalation, the delete-409 bypass, and cross-customer Polar portal access.
- [ ] Upgrade `next` 16.2.2 → 16.2.11 (`npm audit fix` / `npm update next`) — 24 advisories in range (middleware/proxy bypass, cache poisoning, SSRF, DoS). Within the `^16.2.2` semver range.
- [ ] Re-run `npm audit` after the upgrade — most transitive flags ride along; all have in-range fixes.

### Flagged for Manual Review
- [ ] iOS MEDIUM — App Review credentials hardcoded in 4 committed UI test files; live prod account, weak password. Move to env/launch-argument injection and **rotate the password after App Review** (already planned — this makes it enforceable).
- [ ] `@polar-sh/nextjs` — ~25k weekly downloads (below 50k threshold). Mitigants: Polar org-published (already in the payments trust boundary), sibling SDK ~250k/wk, signatures verified. Keep; re-check each upgrade.
- [ ] M3 — `/api/checkout` has no rate limit or already-subscribed check (duplicate purchase possible).

### Recommended (non-urgent)
- [ ] M1 — premium audio URLs are public; must move to signed URLs **before premium launch** (fine while fully free)
- [ ] M2 — anon `analytics_events` inserts unthrottled; add WAF rate limit or server proxy; treat metrics as untrusted
- [ ] L1 CORS allowlist on edge function · L2 baseline CSP · L3 server-side 10h-gate note for Task 2.5
- [ ] Delete `ios/Ragaflow/Configuration/Debug.xcconfig.staging-backup` (dead staging key, untracked)
- [ ] Major-version updates (non-security): `@testing-library/jest-dom` 7, `@types/node` 26, `eslint` 10, `typescript` 7 — batch separately.

## Phase 1 — Dependency Necessity Audit

All 21 dependencies verified as imported/referenced. No unused, no reducible.

| Dependency | Classification | Evidence |
|---|---|---|
| `@polar-sh/nextjs` | REQUIRED | checkout/portal/webhook API routes |
| `@polar-sh/sdk` | REQUIRED | `lib/polar/client.ts`, webhook payload types |
| `@supabase/ssr` | REQUIRED | `lib/supabase/{server,session,client}.ts` |
| `@supabase/supabase-js` | REQUIRED | data layer, auth context, admin client |
| `next`, `react`, `react-dom` | REQUIRED | framework |
| `@tailwindcss/postcss`, `tailwindcss` | REQUIRED | `postcss.config.mjs`, `globals.css` |
| `@testing-library/jest-dom` | REQUIRED | `tests/setup.ts` |
| `@testing-library/react` | REQUIRED | component tests |
| `@types/node`, `@types/react`, `@types/react-dom` | REQUIRED | TS for installed runtimes |
| `@playwright/test` | REQUIRED | `scripts/screenshot.mjs` (PR screenshot harness) |
| `@vitejs/plugin-react` | REQUIRED | `vitest.config.ts` |
| `eslint`, `eslint-config-next` | REQUIRED | lint script |
| `jsdom` | REQUIRED | vitest environment |
| `typescript` | REQUIRED | build |
| `vitest` | REQUIRED | test runner |

## Phase 2 — Dependency Trust Validation

- **Registry integrity:** `npm audit signatures` — all 472 installed packages have verified registry signatures; 99 have provenance attestations. No typosquat-suspicious names in the dependency list.
- **Download counts (weekly):** next ~48.4M, `@supabase/supabase-js` ~21.4M, `@supabase/ssr` ~5.7M, `@polar-sh/sdk` ~250k, `@polar-sh/nextjs` **~25k ⚠️**.
- **Flag — `@polar-sh/nextjs` (~25k/wk, below 50k threshold):** org-published by Polar (the app's merchant of record, already trusted with payments), thin adapter over the 10×-more-used `@polar-sh/sdk`, signatures verified. **Action: keep; re-review at each version bump.**
- All other dependencies are top-tier ecosystem packages (Vercel, Supabase, OpenJS, testing-library) with org backing and active maintenance.

## Phase 3 — Vulnerability Scan

`npm audit`: 9 flagged packages — 0 critical / 7 high / 1 moderate / 1 low. Fixes available for **all**.

| Package | Direct? | Severity | Notable advisories | Fix |
|---|---|---|---|---|
| `next` (16.2.2) | **yes** | high | middleware/proxy bypass (×5), SSRF (×3), cache poisoning (×4), DoS (×5), XSS (×2), server-function disclosure | **16.2.11** (in `^` range) |
| `sharp` | no (next image opt) | high | inherited libvips CVEs | rides with next update |
| `undici` | no | high | TLS validation bypass (SOCKS5), header injection, response-queue poisoning | in-range update |
| `vite` | no (vitest, dev-only) | high | dev-server path traversal / file read | in-range update |
| `ws` | no (dev-only) | high | memory disclosure, fragment DoS | in-range update |
| `js-yaml` | no (dev-only) | high | quadratic-CPU DoS | in-range update |
| `brace-expansion` | no (dev-only) | high | exponential-time DoS | in-range update |
| `postcss` | no | moderate | XSS via unescaped `</style>` | in-range update |
| `@babel/core` | no (dev-only) | low | arbitrary file read via sourceMappingURL | in-range update |

**Production-relevant subset:** `next` + its runtime deps (`sharp`, `undici`, `postcss`). The middleware/proxy-bypass advisories deserve attention even though `web/proxy.ts` only refreshes sessions (page-level checks do the auth gating): the cache-poisoning and SSRF classes apply to any deployed App Router app. The rest of the flags are dev-tooling only (vitest/eslint/babel chains) — no production exposure, still worth clearing.

`npm-check-updates`: security-relevant target is `next`/`eslint-config-next` 16.2.11. Major bumps available for `@testing-library/jest-dom` (7), `@types/node` (26), `eslint` (10), `typescript` (7) — routine maintenance, not security.

## Phase 4 — Web Code Security Findings

### HIGH

**H1 — Authenticated users can write their own `subscription_status` / `polar_customer_id` (entitlement self-escalation + Polar portal cross-customer access).**
`supabase/migrations/007_rename_rasikas_add_subscription.sql:7-11` scopes `rasikas` with `FOR ALL TO authenticated USING (auth.uid() = rasika_id)` — RLS limits *which rows*, not *which columns*. Any signed-in user can run `supabase.from("rasikas").update({ subscription_status: "lifetime", polar_customer_id: "<any id>" })` on their own row with the public publishable key. The 008/012 SECURITY DEFINER lockdown protects only the RPC path.
- **Exploit — entitlement:** self-set `lifetime`/`active` → Premium UI today, bypasses every future premium/10h-gate check reading this column. Conversely a live subscriber can self-set `free` to slip past the delete-account 409 guard and deliberately orphan a Polar subscription.
- **Exploit — cross-customer:** `web/app/api/portal/route.ts:28-38` trusts the user-writable `polar_customer_id` to mint a Polar customer-portal session — any obtained Polar customer ID yields that customer's billing portal (invoices, payment method, cancel).
- **Fix:** column-level grants — `REVOKE UPDATE, INSERT ON rasikas FROM authenticated;` then `GRANT UPDATE (favorite_tracks, favorite_ragams, default_focus_track, default_sleep_track, default_meditate_track, default_focus_duration, default_sleep_duration, default_meditate_duration, custom_duration, display_name)` (and the matching column INSERT grant) — leaving `subscription_status`/`polar_customer_id` service-role-only. Alternative: separate service-role-only table or a BEFORE UPDATE trigger.

#### H1 root cause & fix plan (analysis 2026-07-22)

**The Polar webhook does NOT depend on this policy** — it writes via the service role (`web/lib/supabase/admin.ts` → `update_rasika_subscription`, migration 008), which bypasses RLS. Locking authenticated users out of the subscription columns costs the webhook nothing.

**Root cause is historical:** the table began as `rasika_preferences` (001) — client-managed prefs where owner-scoped `FOR ALL` was correct. 007 renamed it and added `subscription_status`/`polar_customer_id` onto the same table; the billing columns inherited the client-writable surface as a side effect.

**Fix plan (migration 013 + one iOS change):**
1. `REVOKE INSERT, UPDATE ON rasikas FROM authenticated;`
2. `GRANT INSERT (rasika_id, favorite_tracks, favorite_ragams) ON rasikas TO authenticated;`
3. `GRANT UPDATE (favorite_tracks, favorite_ragams, default_focus_track, default_sleep_track, default_meditate_track, default_focus_duration, default_sleep_duration, default_meditate_duration, custom_duration, display_name) ON rasikas TO authenticated;`
4. SELECT stays untouched — clients still read their own `subscription_status` for the Plan card.
5. **iOS:** drop `subscription_status: "free"` from `ensureRasika`'s insert (`ios/Ragaflow/Services/SupabaseService.swift` `NewRasika`) — redundant since the column is `DEFAULT 'free' NOT NULL` (007). Until this ships, new-user sign-up on existing iOS builds would fail at row creation (existing users unaffected; only the owner is on TestFlight today). Web already inserts `{ rasika_id }` only — no change.
6. Verify: as an authenticated user, `update({subscription_status})` and `update({polar_customer_id})` must fail; favorites/defaults updates and fresh sign-up row creation must succeed on both clients.

### MEDIUM

**M1 — Premium track audio publicly accessible.** `tracks` is world-readable including `audio_url`/`download_url` for `free = false` tracks, and the R2 bucket is public. Fine while the app is fully free; unenforceable paid-download model later. **Fix (before premium launch):** signed/expiring URLs + exclude `download_url` from anon reads.

**M2 — Unauthenticated, unlimited `analytics_events` inserts.** Anon inserts with no rate limit (bounded only by the 4 KB metadata cap); `anonymous_id` spoofable → table flooding + metric pollution. **Fix:** WAF/edge rate limit or server-route proxy with throttling; scheduled prune; treat metrics as untrusted.

**M3 — No rate limiting or duplicate-purchase check on `/api/checkout`.** Every authenticated GET mints a new Polar checkout session; already-active subscribers can double-purchase. **Fix:** refuse when status already grants access; add rate limiting.

### LOW

**L1 — Edge function CORS wildcard.** `Access-Control-Allow-Origin: *` on delete-account; exploitation needs the victim's JWT so practical risk is low. **Fix:** reflect an origin allowlist.

**L2 — No CSP header** (X-Frame-Options/nosniff/Referrer-Policy present; React escaping + zero `dangerouslySetInnerHTML` today). **Fix:** baseline CSP as defense-in-depth; verify HSTS on the custom domain.

**L3 — Listening stats client-asserted.** Owner-only rows, harmless now — but the future 10h gate and certifications become gameable. **Fix note for Task 2.5:** compute the gate server-side or accept soft enforcement.

### INFO

- **I1:** webhook route relies on `POLAR_WEBHOOK_SECRET!` non-null assertion; prefer an explicit fail-closed check at module load.
- **I2:** raw Supabase auth error strings flow into analytics metadata — no PII today, keep an eye on the channel.
- **I3:** checkout→webhook deletion race is documented and detected (migration 012 zero-row logging); no further action.

### Checked and clean (web)
- No hardcoded secrets in source or **full git history** (`.env*`/xcconfig audit; only empty-valued example files ever committed); `.gitignore` covers env/xcconfig/uploads/pem
- No SQL injection surface: all queries parameterized builder calls; single `.rpc()` passes typed params to a status-validated function
- Zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`; no open redirect in auth callback; proxy host-split uses env-configured hosts
- API routes use server-side cookie client; admin (service-role) client only in the webhook route, key server-only
- Polar webhook signature verification via the SDK helper before any handler runs
- RLS enabled on all 6 tables, row scoping correct (column issue is H1); SECURITY DEFINER functions locked to service_role with pinned search_path
- Edge function: uid from verified JWT only, body ignored, 401/405 guards
- Tokens via Supabase SSR cookies; no tokens/PII in localStorage; analytics carries no emails/names, per-tab UUID only

## Phase 5 — iOS Security Findings

### MEDIUM — Live production credentials hardcoded in committed UI test files
The App Review account `kpathakota+alt@gmail.com` / `alt123` is hardcoded and committed in:
- `ios/RagaflowUITests/AuthFlowTests.swift:10-11`
- `ios/RagaflowUITests/FavoriteFlowTests.swift:8-9`
- `ios/RagaflowUITests/PlayerFlowTests.swift:8-9`
- `ios/RagaflowUITests/ScreenshotTests.swift:18-19`
- doc comment in `ios/RagaflowUITests/RagaflowUITests.swift:5`

This is a real account on the **production** Supabase project (the only project), with a trivially guessable 6-char password, and Gmail plus-addressing points at the owner's real inbox. Mitigants: private repo; RLS owner-scoping limits compromise to that one rasika's data. Risk grows with repo access (collaborators, CI logs, any future open-sourcing).
**Fix:** inject credentials via `ProcessInfo.processInfo.environment` / launch arguments from the test scheme or a gitignored xcconfig; **rotate the password after App Review** (already planned — enforce it); `git filter-repo` if the repo is ever opened up.

### LOW — Stale staging credentials in untracked backup file
`ios/Ragaflow/Configuration/Debug.xcconfig.staging-backup` holds the deleted staging project's URL + publishable key. Never committed (verified via `git log -S`), gitignored, and the staging project is gone — the credential is dead. **Fix:** delete the file.

### INFO — No privacy screen on backgrounding
The app-switcher snapshot can capture the Profile screen's account email. Acceptable at this sensitivity; optional redaction overlay on `scenePhase == .background`.

### INFO — Keychain accessibility
supabase-swift 2.43.1 stores the session in the Keychain with `kSecAttrAccessibleAfterFirstUnlock` — appropriate for background audio/session refresh. No change.

### Checked and clean (iOS)
- Supabase config only via `Bundle.main.infoDictionary` reads backed by xcconfig build settings; no inline secrets in `Info.plist`/`project.yml`
- `ci_post_clone.sh` builds xcconfigs purely from Xcode Cloud env vars
- xcconfig hygiene: only the placeholder `Secrets.xcconfig.example` tracked; real configs gitignored (both root and `ios/.gitignore`)
- Git history: no real key was ever committed (`git log -S` on both prod and staging keys)
- ATS: zero exceptions, zero `http://` URLs — all endpoints HTTPS
- Session storage: Keychain (`KeychainLocalStorage` default, verified in the resolved 2.43.1 SPM checkout), not UserDefaults
- Zero `UserDefaults`/`UIPasteboard` use; zero logging statements in app code (no token/email leak path)
- Password fields are `SecureField` with correct `textContentType`
- Entitlements minimal; delete-account path sends no client-supplied uid
