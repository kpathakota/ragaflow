# Ragaflow — GA Backlog (first draft, 2026-09-28)

State of the codebase as of `dev` @ `f0ccdc8`, plus the gaps between the PRD
(`spec.md`, `dev-design.md`, `beta-checklist.md`, `docs/screens/*`) and what is
actually in `web/` and `ios/`. Stack-ranked to get from "iOS 1.0 submitted, free"
to **GA = a marketed, paid product on both platforms**.

Sizes: **S** < 1 day · **M** 1–3 days · **L** 1–2 weeks. Platform: **W** web ·
**I** iOS · **B** backend (Supabase) · **X** both clients.

---

## 1. Where things are

**Shipped and working**

- Core loop on both clients: scenario → track list → session player (timer, wall-clock
  accurate, sleep fade, progress ring, breathing orb, completion screen, set-as-default).
- Auth (email/password + confirm), rasika provisioning, favorites (tracks), defaults,
  session logging, certifications ("Listening Journey"), Explore (search + tag/duration/
  free filters + ragam grouping), Profile, account deletion (edge function, both clients).
- Home: time-of-day "Tonight" card, featured tracks, scenario cards.
- Legal/marketing pages (`/landing`, `/privacy`, `/terms`, `/support`); domain split
  built but not flipped (`MARKETING_HOST` unset).
- **Web payments plumbing is live**: Polar checkout, customer portal, webhooks → `rasikas.subscription_status`.
- iOS 1.0 submitted **fully free** (Premium card + badges stripped, PR #60); Xcode Cloud →
  TestFlight; background audio + lock screen controls.
- Content: 13 tracks in production (`supabase/tracks.csv` is the source of truth);
  `/upload-tracks` skill for the R2 + CSV → SQL pipeline. No admin UI.

**The uncomfortable truth about monetization today**

- Nothing is gated. `free=false` tracks play for everyone, signed in or not, on both
  platforms. The "Premium" badge on web is cosmetic. The 10-hour gate (Task 2.5) was
  never built. Audio is served from public R2 URLs.
- Web checkout works but there is **no reason for anyone to pay** and no tier selection
  (one "Subscribe" button hands all product IDs to Polar).
- iOS has **zero** payments code (no StoreKit, no products, no entitlement sync).
- Subscription status is a single column written by Polar webhooks only. There is no
  design yet for how a StoreKit purchase and a Polar purchase coexist on one rasika.

**The uncomfortable truth about marketing today**

- iOS sends **no analytics events at all**. Web sends four (`app_open`, `scenario_view`,
  `auth_error`, `playback_error`). Neither logs sign-up, session start/complete,
  favorite, checkout, or subscribe. There is no funnel to measure a campaign against.
- No error/crash reporting on either platform.
- No Google/Apple sign-in and **no password reset** on either platform (locked-out
  users have no recovery path).
- SEO basics missing: no OG image, sitemap, robots, or per-page metadata.
- Supabase default mailer is still in use (rate-limited; fine for 30 people, not for a push).

---

## 2. Parity matrix — web vs iOS

| Area | Web | iOS | Notes |
|---|---|---|---|
| Email/password auth + confirm password | ✅ | ✅ | iOS sign-up sets no `redirectTo`; confirmation link lands on the web site URL |
| Google OAuth | ❌ | ❌ | `docs/google-auth-plan.md` still "Planning"; Supabase provider not provisioned (C1/C2) |
| Sign in with Apple | ❌ | ❌ | Becomes **mandatory** on iOS the moment Google is added |
| Password reset | ❌ | ❌ | No `resetPasswordForEmail` anywhere |
| Deep/universal links (auth callback, share) | n/a | ❌ | No URL scheme, no associated domains |
| Display name edit | ❌ (read only) | ❌ (read only) | Column exists (migration 010) |
| Home "Tonight" card + featured | ✅ | ✅ | Web computes hour **server-side (UTC on Vercel)** → wrong card for US users. iOS picks oldest featured track (`created_at asc`) |
| One-tap play of defaults | partial | partial | Both: card opens idle player; `autoplay` path is dead code on both |
| Favorites count tile | ✅ → links to unfiltered Explore | ✅ → same | No favorites list screen on either platform |
| Track list: featured pinning | ✅ | ✅ | |
| Track list: Premium badge | ✅ | ❌ (stripped for 1.0) | Re-add with IAP |
| Track list: sort / editor's pick / description collapse | ❌ | ❌ | `docs/screens/track-list.md` open |
| Heart when signed out | redirects to `/auth?reason=favorites` | **bug**: heart shown, tap returns `[]` and clears local set, no prompt | |
| Timer presets 25/45/custom/full | ✅ | ✅ | iOS never writes `custom_duration` back; full-track floors minutes |
| Sleep fade | ✅ | ✅ | |
| Loop crossfade | ❌ | ❌ (gapless via `AVPlayerLooper`) | Deferred in player spec |
| Background completion | ❌ (no `visibilitychange`/Notification) | n/a (audio keeps process alive) | |
| Lock screen / Media Session | ❌ (`navigator.mediaSession` unused) | partial | iOS: no artwork, pause not reflected, remote commands never unregistered |
| Audio interruption / route change | n/a | ❌ | Phone call or unplug → timer keeps counting |
| Playback error UX | logs event, shows nothing | silent | |
| Leaving the player mid-session | unmount kills audio, **session row left open** | **audio + timer keep running with no UI** | |
| Explore: search/tags/duration/free filter | ✅ (single tag) | ✅ | Ragam order differs (web: newest, iOS: alphabetical) |
| Favorite ragams | ❌ (helper exists, no UI) | ❌ (same) | Spec §4 |
| Profile: stats + certifications | ✅ | ✅ | |
| Profile: defaults view / clear | view only | ❌ | |
| Profile: plan card / manage subscription | ✅ | ❌ (stripped) | |
| Profile: recent sessions | ❌ | ❌ | |
| Account deletion | ✅ | ✅ | |
| Payments | Polar (live) | none | |
| 10-hour gate | ❌ | ❌ | |
| Offline downloads | ❌ | ❌ | `download_url` unused |
| Analytics events | 4 types | **none** | Shared table exists (migration 009) |
| Crash / error reporting | ❌ | ❌ | |
| Notifications / reminders | ❌ | ❌ | Spec "Notifications" section |
| PWA / install / offline | ❌ | n/a | |
| Tests in CI | ✅ vitest (25 files) | ❌ (SPM + Xcode tests exist, not run in CI) | No lint/typecheck/build step in CI |

---

## 3. Bugs found in code (fix regardless of roadmap)

These all touch **listening-time accounting**, which is the 10-hour gate metric and
the certification metric. If sessions under-count, the gate never trips and nobody
is asked to pay.

| # | Platform | Bug | Where |
|---|---|---|---|
| B1 | W | "reset" button calls `restart()`, which never calls `endListeningSession`. `stop()` (which does) is dead code. Every reset/navigate-away mid-session leaves a `listening_sessions` row with `ended_at = null`, `duration_seconds = 0`. | `session-player.tsx:138-163` |
| B2 | X | On natural completion both clients credit `duration*60` to certification **without** `computeCountableSeconds` — a completed 3-min meditate session counts, contradicting the ≥5-min rule. | web `session-player.tsx:190`; iOS `SessionPlayerViewModel.swift:~233` |
| B3 | I | Leaving `SessionPlayerView` only tears down remote commands; the timer `Task` and audio keep running headless (strong `self` after `guard let`). Session completes with no UI; lock-screen pause stops syncing. | `SessionPlayerView.swift:74-76`, `SessionPlayerViewModel.swift:189-192` |
| B4 | W | Home time-of-day uses `new Date().getHours()` on the server (UTC) — the "Tonight" hook shows the wrong scenario for most users. | `app/page.tsx`, `lib/time-of-day.ts` |
| B5 | I | Signed-out heart tap: `toggleFavoriteTrack` returns `[]`, local favorites set is wiped, no sign-in prompt. | `SupabaseService.swift:173`, `TrackListView.swift:36`, `ExploreView.swift:213` |
| B6 | W | Webhook ignores `subscription.uncanceled` and `subscription.updated`; a rasika who un-cancels stays `canceled`. Portal errors silently redirect to `/profile` (issues.md 2026-07-22). | `api/webhooks/polar/route.ts`, `api/portal/route.ts` |
| B7 | I | No `AVAudioSession` interruption/route-change observers — after a call the VM stays `.running`. | `AudioService.swift` |
| B8 | I | Custom duration is read from `rasikas.custom_duration` but never saved; full-track minutes floored (a <60s track completes instantly). | `SessionPlayerViewModel.swift:98, 266-280` |
| B9 | X | Certification totals have two sources of truth (client-upserted `certifications` table vs. profile recomputation from `listening_sessions`) and can drift. | `lib/certifications.ts`, `SupabaseService.swift:287-329` |
| B10 | W | Support page says "an account is required" and "Ragaflow is free right now" — both false/soon false. | `app/support/page.tsx:41-49` |
| B11 | I | Demo/review credentials hard-coded in UI tests (prod account, 6-char password). Rotate after App Review; inject via env. | `AuthFlowTests`, `ScreenshotTests`, `FavoriteFlowTests` |

---

## 4. Stack-ranked backlog to GA

Ranking logic: (1) anything that makes *charging* possible and honest, (2) anything
that makes *marketing* measurable and lets new users get in, (3) reliability of the
core screen, (4) parity/polish, (5) spec items that don't move revenue or retention.

### P0 — Blocks charging anyone

| # | Item | Plat | Size | Why / notes |
|---|---|---|---|---|
| 1 | **Entitlement design: one status, two stores.** Decide how `rasikas.subscription_status` is owned when Polar (web) and StoreKit (iOS) can both write it: precedence, `apple_original_transaction_id` column, expiry handling, restore. Write it up like `payments-design.md`. Also decide: keep the 10h gate metric as raw total seconds (spec says yes) and whether premium R2 objects need signed URLs for GA (currently public). | B | S | Everything in P0 below depends on this. Half a day of decisions, saves rework. |
| 2 | **Fix session accounting (B1, B2, B3, B8, B9)** | X | M | The gate metric is `sum(duration_seconds)`. Today web resets and iOS back-navigation both under-count. Add tests that provably fail on the old code (`/fix-bug`). Consider a `listening_sessions` sweeper for orphaned rows. |
| 3 | **Web: 10-hour gate (Task 2.5)** — premium tracks greyed with subscribe CTA after 36,000 s for non-subscribers; player refuses to play a premium track while gated; free tracks always open. Statuses with access: `active`, `lifetime`, `canceled`, `past_due`. | W | M | This is the *reason to pay*. Fix B10 copy in the same PR. |
| 4 | **Web: `/subscribe` tier page** (A4 resolved) — $5/mo, $30/yr, $100 lifetime as explicit choices → per-product checkout. Fix Subscribe hover state. | W | S | Currently one button with all product IDs; conversion needs the choice on our page. |
| 5 | **Webhook + portal hardening (B6)** — handle `uncanceled`/`updated`; map sponsor product explicitly; portal error banner (`/profile?portal=error`). | W | S | Cheap; avoids support tickets from paying users. |
| 6 | **iOS: StoreKit 2 IAP (M4)** — ASC products + subscription group (`io.ragaflow.monthly/yearly/lifetime`), `StoreService` (products, purchase, `Transaction.updates`, `finish`, `AppStore.sync()` restore), `.storekit` test config, re-add Go Premium card + Premium badge + status display (kept `ProfileViewModel.subscriptionStatus`). | I | L | Largest single item. v1.1 submission (Guideline 3.1.1 now satisfied). |
| 7 | **iOS entitlement sync (server-side)** — App Store Server Notifications V2 → Supabase edge function (JWS verification) → `update_rasika_subscription`; client-side write as fallback per item 1. | B/I | M | Client-only sync is spoofable and loses renewals/expiry when the app isn't open. |
| 8 | **iOS: 10-hour gate** — mirror item 3 (shared rule; consider a `rasika_listening_totals` view or RPC so both clients read one number). | I | S–M | Ships with the v1.1 IAP build. |

### P1 — Blocks marketing effectively (measure, convert, not lose users)

| # | Item | Plat | Size | Why / notes |
|---|---|---|---|---|
| 9 | **Analytics funnel events on both clients** — add `sign_up`, `session_start`, `session_complete`, `favorite`, `checkout_start`, `subscribe`, `gate_hit`; iOS currently sends **nothing**. Extend the CHECK constraint (migration 013) + `analytics-queries.sql` with funnel queries (visit → signup → first session → 10h → paid, by platform, by UTM). Capture `utm_*` / referrer in web `app_open`. | X/B | M | You can't market against a funnel you can't see. Keep the home-grown table; add PostHog only if dashboards become a time sink. |
| 10 | **Error/crash reporting** — Sentry (or equivalent) on web + iOS; surface `playback_error` to the user with a retry on both. | X | S | Marketing brings strangers; strangers don't email you when audio fails. |
| 11 | **Password reset** — `resetPasswordForEmail` + `/auth/reset` page (web); iOS link to web reset. | X | S | Missing entirely. Guaranteed support load otherwise. |
| 12 | **Google OAuth (web)** per `google-auth-plan.md`, after C1 provisioning. Then **iOS Google + Sign in with Apple** (Apple becomes required). Add associated domains / URL scheme for the callback. | W→I | M (web S, iOS M) | Biggest auth-conversion lever per design critique. |
| 13 | **Fix Home time-of-day (B4)** — compute on the client or pass the timezone; make iOS pick a scenario-matched featured track, not the oldest. | X | S | The homepage hook is wrong for most of the day for most users. |
| 14 | **Flip the domain split + landing copy pass** — run `domain-split-runbook.md`; landing gets a real story (design-brief priority #1), OG image, `sitemap.ts`, `robots.ts`, `generateMetadata` for track/ragam pages, App Store badge + smart banner, canonical URLs. | W | M | This *is* the marketing surface; the runbook is already verified. |
| 15 | **Email deliverability** — custom SMTP (Resend/Postmark) for Supabase auth mail; branded confirmation/reset templates; confirm `support@` alias. | B | S | Supabase default mailer is rate-limited; a campaign will hit it. Doc says "before 300 people". |
| 16 | **iOS player robustness (B3, B7)** — interruption + route-change handling, Now Playing artwork + correct pause state, unregister remote commands, surface load/playback errors, keep audio alive across navigation (or explicit mini-player decision). | I | M | App Store ratings come from the 45-minute session, not the home screen. |
| 17 | **Web mobile-Safari session UX** — `navigator.mediaSession` (lock-screen controls + metadata), `visibilitychange` completion catch-up, optional Notification on completion (Tasks 2.4a-2/-3). | W | S–M | Most shared links open on a phone browser first. |
| 18 | **CI hardening** — add `lint` + `tsc` + `next build` to `test.yml`; add an iOS job (`swift test` for the SPM models at minimum; `xcodebuild test` on a macOS runner if budget allows); rotate the review account password and inject test creds via env (B11). | X | S | Prevents the "green CI, broken build" class; closes the security-review item. |

### P2 — Parity and polish (finish the locked screen specs)

| # | Item | Plat | Size | Source |
|---|---|---|---|---|
| 19 | Profile parity: defaults **view + clear** (both), plan card on iOS (with item 6), recent-sessions mini list, display-name edit, favorites tile → a real favorites view (or Explore favorites filter). | X | M | `screens/profile.md`, `home.md` |
| 20 | Track list: editor's pick badge (`editors_pick` column, A5), one-line description, Newest/Popular sort, toast for signed-out heart taps (fix B5 on iOS). | X | M | `screens/track-list.md` |
| 21 | Auth screen: "Continue without account" explainer; iOS submit button to earth-tone palette. | X | S | `screens/auth.md` |
| 22 | Home: time-aware greeting ("Good evening") replacing "Welcome"; drop favorites count from Home; make the Tonight card actually one-tap (wire the dead `autoplay` path, respect `?d=`). | X | S | `screens/home.md` |
| 23 | Explore: multi-tag selection; favorite ragams UI (spec §4); unify ragam order across platforms. | X | S | issues.md 2026-03-17 |
| 24 | Loop crossfade (dual `<audio>` / `AVPlayerLooper` fade) — needs real-device verification. | X | M | `screens/player.md` |
| 25 | Certification visual pass — real badges, tier-colored progress bars, better word than "Certifications" (issues.md 2026-02-25). | X | M | Retention payoff, also shareable (P3 item 30). |
| 26 | Content ops: keep `/upload-tracks` as the pipeline but add a `featured`/`editors_pick`/`free` column to `tracks.csv` so the artists control merchandising without SQL; Track of the Day (spec §5, `track_of_the_day` table + home card) as the "liveness" beat for marketing. | B/X | M | 13 tracks is thin; cadence is a marketing asset. |
| 27 | Data hygiene: `rasika_listening_totals` RPC/view so gate + profile + certifications read one number; `certifications` becomes derived (fixes B9). | B | S | Follow-on from item 2. |

### P3 — After GA (spec items that don't move revenue/retention yet)

| # | Item | Plat | Size |
|---|---|---|---|
| 28 | Offline downloads for subscribers (M5) — the natural *premium-only* perk once IAP exists. | I (then web PWA) | L |
| 29 | Notifications: gentle reminders, achievement unlocks, new-release pushes (spec "Notifications"). Requires APNs + `UNUserNotificationCenter` + a send path. | I/B | M |
| 30 | Social sharing of certifications / session cards (spec §3; growth loop). | X | M |
| 31 | PWA basics on web (manifest, install prompt). | W | S |
| 32 | Journal / mood check-in (spec §7), adaptive playback (§6), educational layer (§8). | X | L each |
| 33 | Wake Up / Energize / Relax scenarios, Apple Watch, CarPlay, drone tuning, Google Drive sync (Tasks 1.3–1.5), transcoding pipeline. | X | L |
| 34 | Docs cleanup: `ios/README.md` is stale (milestone numbering, "M0 ← current", non-existent views). | I | S |

---

## 5. Suggested sequencing (one PR per row, `feat/*` or `fix/*` against `dev`)

1. **Week 1 — make the numbers true.** Item 1 (design), item 2 (accounting bugs), item 13 (time-of-day), item 5 (webhook). Ship a `dev → main` so web is honest before any gate.
2. **Week 2 — web can charge.** Items 3, 4, and the copy fix; item 9 web half (funnel events) so the first paying users are measurable.
3. **Weeks 3–5 — iOS can charge.** Items 6, 7, 8 as the v1.1 build; item 9 iOS half; item 16 in the same TestFlight cycle (reviewers will exercise the player).
4. **In parallel (small, independent):** items 10, 11, 15, 18 — each is < 1 day and none touch the player.
5. **Marketing switch-on:** item 14 (domain flip + landing + SEO) and item 12 (Google, then Apple sign-in) right before the first campaign, so signup friction and attribution are both handled.
6. **Then P2** in screen-spec order (Profile → Track List → Auth → Home), web leads, iOS follows (A3).

## 6. Decisions needed from you (not engineering)

- **D1** Precedence rule when a rasika has both a Polar and an Apple subscription (item 1).
- **D2** Signed R2 URLs for premium audio at GA, or accept that the gate is UX-only for now.
- **D3** Keep the 10-hour gate, or gate on *days* / *sessions* now that real usage data exists? (Check `analytics-queries.sql` session-quality numbers first.)
- **D4** Home-grown analytics table vs. PostHog for funnels/dashboards (item 9).
- **D5** Sponsor tier ($300): stays off-app, or becomes a Polar product that maps to `lifetime`?
- **D6** iOS pricing: `$4.99/$29.99/$99.99` per `ios-plan.md` vs. web `$5/$30/$100` — align copy.
