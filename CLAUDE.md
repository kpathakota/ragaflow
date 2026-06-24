# Ragaflow

Ragaflow is a web + iOS app that serves Indian classical ragas for focus, sleep, and meditation. Rasikas (users) select a scenario, browse tracks tagged to that scenario, and play audio sessions. Tracks belong to ragams (melodic frameworks) and are tagged with scenarios and emotions — not hard-mapped 1:1.

See `docs/spec.md` and `docs/dev-design.md` for the full product specification and development plan. See `docs/ios-plan.md` for the iOS app implementation plan.

## Monorepo structure

```
ragaflow/
├── web/          ← Next.js web app (deployed to Vercel)
├── ios/          ← SwiftUI iOS app (deployed via Xcode Cloud / TestFlight)
├── docs/         ← Shared docs (spec, dev design, iOS plan)
├── supabase/     ← Shared database (migrations, seed)
└── CLAUDE.md
```

Both clients share the same Supabase backend. No shared code between web and iOS — just the same database and API.

## Tech stack

### Web (`web/`)
- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` syntax)
- **Language:** TypeScript
- **Fonts:** Geist Sans / Geist Mono (via next/font)
- **Auth & backend:** Supabase (auth, database, storage)
- **Supabase client:** `@supabase/supabase-js` + `@supabase/ssr`
- **Payments:** Polar.sh (merchant of record, web only)

### iOS (`ios/`)
- **Framework:** SwiftUI (iOS 17+)
- **Language:** Swift
- **Audio:** AVFoundation (M2)
- **Auth & backend:** Supabase via `supabase-swift` SPM package
- **Payments:** StoreKit 2 (M4, Apple IAP)

## Supabase setup

**Single Supabase project: production** (`mkikuyxvabhbaxspoiay`). The staging project was removed 2026-06-23 — everything points at production now, including local dev and Vercel previews. There is no throwaway DB; treat the database as live (no bulk/destructive test writes).

| Environment | Supabase project | How env vars are set |
|---|---|---|
| Web local dev (`cd web && npm run dev`) | production | `web/.env.local` (pull with `vercel env pull .env.local --environment=production`) |
| Vercel preview (branch pushes) | production | Vercel "Preview" env vars |
| Vercel production (main) | production | Vercel "Production" env vars |
| iOS debug | production | `ios/Ragaflow/Configuration/Debug.xcconfig` (gitignored — copy from another dev, or fill `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` from `web/.env.local`) |
| iOS release | production | `ios/Ragaflow/Configuration/Release.xcconfig` |

1. Pull `web/.env.local` from Vercel: `cd web && vercel env pull .env.local --environment=production` (or copy from another dev)
2. Migrations in `supabase/migrations/` are mostly applied on production. `010_featured_and_display_name.sql` was applied 2026-06-24 (prod `tracks` now has `featured`/`featured_scenarios`, `rasikas` has `display_name`; 5 tracks featured, 2 sleep-featured for the Home "Tonight" card). When a migration is pending, run it in the SQL editor (see `feedback_sync_sql_file` — write to `uploads/sync.sql`, don't execute from terminal)
3. Supabase is required — without env vars the app renders empty (no local seed fallback)

## Data model (Phase 1 — current)

**Ragam** — a melodic framework, no scenario binding:
- id, name, description, time_of_day

**Track** — a recorded session, the atomic content unit:
- id, title (nullable), ragam_id, scenarios[], tags[], description, artist_note, recorded_date, location, duration, audio_url, download_url, free, created_at

**Rasika** (table: `rasikas`) — per-user record with favorites, defaults, and subscription:
- rasika_id, favorite_tracks[], favorite_ragams[], default_focus_track, default_sleep_track, default_meditate_track, subscription_status, polar_customer_id

**ListeningSession** — per-play log:
- rasika_id, track_id, scenario, started_at, ended_at, duration_seconds

**Certification** — per ragam per rasika achievement:
- rasika_id, ragam_id, level (1–4), total_seconds

**AnalyticsEvent** — general-purpose event log (shared by web + iOS):
- anonymous_id (per-session UUID), rasika_id (nullable), event_type, platform (web/ios), metadata (jsonb), created_at
- Event types: `app_open`, `scenario_view`, `auth_error`, `playback_error`

Types defined in `web/lib/types.ts` (web) and `ios/Ragaflow/Models/` (iOS). Seed data in `supabase/seed.sql`. Data access via `web/lib/data.ts` (web) and `ios/Ragaflow/Services/SupabaseService.swift` (iOS).

## Key files

### Shared
- `supabase/migrations/` — DDL + RLS policies (run in order)
- `supabase/seed.sql` — insert statements for Supabase (7 ragams, 30 tracks)
- `supabase/analytics-queries.sql` — ad-hoc SQL queries for analytics (DAU/WAU, errors, session quality)
- `docs/spec.md` — product specification
- `docs/dev-design.md` — development design & execution plan
- `docs/ios-plan.md` — iOS implementation plan (milestones M0–M5)
- `docs/payments-design.md` — Polar.sh payments design (web)

### Web data layer
- `web/lib/types.ts` — TypeScript types for all entities
- `web/lib/data.ts` — async data access functions (Supabase only)

### Web Supabase
- `web/lib/supabase/client.ts` — browser client (returns null if env vars missing)
- `web/lib/supabase/server.ts` — server client (cookies adapter)
- `web/lib/supabase/session.ts` — session refresh logic (used by proxy)
- `web/proxy.ts` — Next.js 16 proxy (renamed from middleware.ts) calling Supabase session refresh

### Web auth
- `web/lib/auth/auth-context.tsx` — `AuthProvider` + `useAuth()` hook
- `web/app/auth/page.tsx` — sign-in/sign-up form
- `web/app/auth/callback/route.ts` — email confirmation callback

### Web payments (Polar.sh)
- `web/lib/polar/client.ts` — Polar SDK client factory
- `web/lib/supabase/admin.ts` — service role client (bypasses RLS for webhook writes)
- `web/app/api/checkout/route.ts` — server-side checkout session creation + redirect
- `web/app/api/portal/route.ts` — customer portal redirect (manage subscription)
- `web/app/api/webhooks/polar/route.ts` — webhook handler (subscription events → Supabase)
- `supabase/migrations/008_subscription_update_fn.sql` — SECURITY DEFINER function for webhook writes

### Web features
- `web/lib/favorites.ts` — toggle favorite tracks/ragams (client-side)
- `web/lib/preferences.ts` — set default track per scenario (client-side)
- `web/lib/sessions.ts` — start/end listening session logging (client-side)
- `web/lib/analytics.ts` — event tracking with per-session anonymous UUID (client-side)

### Web components
- `web/components/scenario-config.ts` — scenario labels, colors, subtitles (single source of truth)
- `web/components/track-card.tsx` — reusable track card with heart icon
- `web/components/nav-header.tsx` — reusable back-link + title header
- `web/components/user-badge.tsx` — top-right user initial badge linking to /profile
- `web/components/analytics-provider.tsx` — fires `app_open` event on page load

### Web pages
- `web/app/page.tsx` — homepage (personalized defaults + scenario cards + explore + auth link + user badge)
- `web/app/profile/page.tsx` — profile page (account info, stats, defaults, sign-out)
- `web/app/mode/[scenario]/page.tsx` — track list per scenario (dynamic, force-dynamic)
- `web/app/mode/[scenario]/track-list-client.tsx` — client wrapper for track list with favorites
- `web/app/mode/[scenario]/[trackId]/page.tsx` — session player server page
- `web/app/mode/[scenario]/[trackId]/session-player.tsx` — client component: timer + audio + favorite + set-default
- `web/app/explore/page.tsx` — browse all tracks grouped by ragam with tag filter
- `web/app/explore/explore-client.tsx` — client wrapper for explore with tag filtering
- `web/app/globals.css` — global styles (always-dark theme)

### iOS
- `ios/Ragaflow/Models/` — Swift structs mirroring web types
- `ios/Ragaflow/Services/SupabaseService.swift` — all data access (auth, CRUD, favorites, sessions, certs)
- `ios/Ragaflow/Views/` — SwiftUI views by feature (Home, Auth, Scenarios, Player, Explore, Profile)
- `ios/Ragaflow/Components/` — reusable UI (ScenarioCard, TrackCard, UserBadge)
- `ios/Ragaflow/Configuration/` — xcconfig files for Supabase env vars (gitignored)

## Routing (web)

```
/                              → Home (personalized if rasika has defaults, otherwise scenario selection)
/mode/focus                    → Focus tracks list
/mode/sleep                    → Sleep tracks list
/mode/meditate                 → Meditate tracks list
/mode/[scenario]/[trackId]     → Session player (timer + audio + ♡ favorite + set-default)
/explore                       → All tracks — browse by ragam, tag, or mood
/profile                       → Profile (account info, stats, certifications, defaults, sign out)
/auth                          → Sign in / sign up
/auth/callback                 → Email confirmation redirect
```

## Scenarios

Four entry points (3 primary + 1 catch-all):
- **Focus** (blue) — deep work, concentration
- **Sleep** (indigo) — winding down, rest
- **Meditate** (amber) — contemplation, breathwork
- **Explore** (emerald) — browse everything by ragam/tag/mood

Tracks appear under scenarios via their `scenarios[]` array — a track can appear under multiple scenarios.

## Design principles

- Always dark — no light mode
- Mobile-first, minimal UI
- Web: Tailwind only — no component libraries
- iOS: SwiftUI only — no UIKit unless necessary
- Terminology: users are "rasikas", categories are "scenarios", content units are "tracks"

## Gotchas

- Supabase now uses **publishable keys** (`sb_publishable_...`) instead of the legacy "anon key". Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `ANON_KEY`. See: https://github.com/orgs/supabase/discussions/29260
- Ragam has no `tradition` column — intentionally removed. Don't re-add it.
- Dynamic route `params` is a `Promise` in Next.js 15+ — must `await params` before accessing fields
- Pages use `force-dynamic` since data comes from Supabase (no `generateStaticParams`)
- Audio files hosted on Cloudflare R2 (bucket: `ragaflow-audio`, public URL: `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/`). `audio_url` in the database is a full R2 URL. See `web/public/audio/README.md` for upload instructions.
- Session player is a server page wrapping a client `SessionPlayer` component (for interactivity)
- Timer uses `setInterval` in `useEffect`; audio uses `<audio loop>` with ref-based play/pause
- Supabase is required — without env vars the app renders empty (no local seed fallback)
- Supabase clients return `null` when env vars are missing — data functions return empty arrays
- RLS policies: ragams/tracks publicly readable; rasikas/listening_sessions/certifications owner-only

## Monetization model

- Streaming free (account required)
- Downloads paid (subscribers only, deferred — iOS M4)
- 10-hour cumulative listening gate → must subscribe to continue (Task 2.5, not yet enforced)
- Tiers: $5/mo, $30/yr, $100 lifetime, $300 sponsor
- Web payments: Polar.sh (merchant of record) ✅ — checkout, webhooks, portal all live
- iOS payments: Apple IAP via StoreKit 2 (planned, M4)
- Subscriber access: all premium tracks unlocked, no 10h gate. Statuses with access: `active`, `lifetime`, `canceled` (until period ends), `past_due` (grace period)

## Vercel deployment

Vercel must be configured to use `web/` as the root directory:
- Project Settings → General → Root Directory → `web`
- Framework Preset: Next.js (auto-detected)

## Process

See `docs/dev-design.md` § "Git & Pull Request Workflow" for the full branch/PR workflow.

- **Feature branches off `dev`** — create `fix/*` or `feat/*` branches, open PRs against `dev`
- **Never commit directly to `main` or `dev`** — all changes go through PRs (exception: trivial doc-only changes to `dev`)
- **One PR per logical task** — smaller PRs are easier to review and less likely to conflict
- **Human merges PRs** — Claude Code pushes branches and opens PRs; human reviews and merges
- **Production deploys from `main`** — human merges `dev` → `main` when ready
- **Clean up branches after merge** — use `/cleanup-branches` skill
- **Rebase frequently** — rebase `dev` onto `main` every few tasks, not in big batches
- **Clean up large files at deletion time** — when removing binary files from the repo, run `git filter-repo` in the same task
- **Gitignore new tools immediately** — add local state directories to `.gitignore` before the first commit
- **Test coverage for diffs** — use `/test-gaps` skill to analyze and fill coverage gaps before merging
- Update this file each conversation with new context

## No one-off work

You are not allowed to do one-off work. If I ask you to do something and it's the kind of thing that will need to happen again, you must:

1. Do it manually the first time on 3 to 10 items
2. Show me the output
3. If I approve, codify it into a skill file
