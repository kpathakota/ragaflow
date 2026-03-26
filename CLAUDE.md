# Ragaflow

Ragaflow is a web app that serves Indian classical ragas for focus, sleep, and meditation. Rasikas (users) select a scenario, browse tracks tagged to that scenario, and play audio sessions. Tracks belong to ragams (melodic frameworks) and are tagged with scenarios and emotions — not hard-mapped 1:1.

See `docs/spec.md` and `docs/dev-design.md` for the full product specification and development plan.

## Tech stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` syntax)
- **Language:** TypeScript
- **Fonts:** Geist Sans / Geist Mono (via next/font)
- **Auth & backend:** Supabase (auth, database, storage)
- **Supabase client:** `@supabase/supabase-js` + `@supabase/ssr`

## Supabase setup

Two Supabase projects: **production** and **staging**.

| Environment | Supabase project | How env vars are set |
|---|---|---|
| Local dev (`npm run dev`) | staging | `.env.local` |
| Vercel preview (branch pushes) | staging | Vercel "Preview" env vars |
| Vercel production (main) | production | Vercel "Production" env vars |

1. Copy `.env.local` from another dev or set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the staging project
2. Run all migrations in `supabase/migrations/` in order in the SQL editor
3. Run `supabase/seed.sql` to insert starter data
4. Supabase is required — without env vars the app renders empty (no local seed fallback)

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

Types defined in `lib/types.ts`. Seed data in `supabase/seed.sql`. Data access via `lib/data.ts` (Supabase only, returns empty arrays without connection).

## Key files

### Data layer
- `lib/types.ts` — TypeScript types for all entities
- `lib/data.ts` — async data access functions (Supabase only)
- `supabase/migrations/` — DDL + RLS policies (run in order)
- `supabase/seed.sql` — insert statements for Supabase (7 ragams, 30 tracks)

### Supabase
- `lib/supabase/client.ts` — browser client (returns null if env vars missing)
- `lib/supabase/server.ts` — server client (cookies adapter)
- `lib/supabase/session.ts` — session refresh logic (used by proxy)
- `proxy.ts` — Next.js 16 proxy (renamed from middleware.ts) calling Supabase session refresh

### Auth
- `lib/auth/auth-context.tsx` — `AuthProvider` + `useAuth()` hook
- `app/auth/page.tsx` — sign-in/sign-up form
- `app/auth/callback/route.ts` — email confirmation callback

### Features
- `lib/favorites.ts` — toggle favorite tracks/ragams (client-side)
- `lib/preferences.ts` — set default track per scenario (client-side)
- `lib/sessions.ts` — start/end listening session logging (client-side)

### Components
- `components/scenario-config.ts` — scenario labels, colors, subtitles (single source of truth)
- `components/track-card.tsx` — reusable track card with heart icon
- `components/nav-header.tsx` — reusable back-link + title header
- `components/user-badge.tsx` — top-right user initial badge linking to /profile

### Pages
- `app/page.tsx` — homepage (personalized defaults + scenario cards + explore + auth link + user badge)
- `app/profile/page.tsx` — profile page (account info, stats, defaults, sign-out)
- `app/mode/[scenario]/page.tsx` — track list per scenario (dynamic, force-dynamic)
- `app/mode/[scenario]/track-list-client.tsx` — client wrapper for track list with favorites
- `app/mode/[scenario]/[trackId]/page.tsx` — session player server page
- `app/mode/[scenario]/[trackId]/session-player.tsx` — client component: timer + audio + favorite + set-default
- `app/explore/page.tsx` — browse all tracks grouped by ragam with tag filter
- `app/explore/explore-client.tsx` — client wrapper for explore with tag filtering
- `app/globals.css` — global styles (always-dark theme)

## Routing

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
- Tailwind only — no component libraries
- Terminology: users are "rasikas", categories are "scenarios", content units are "tracks"

## Gotchas

- Supabase now uses **publishable keys** (`sb_publishable_...`) instead of the legacy "anon key". Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `ANON_KEY`. See: https://github.com/orgs/supabase/discussions/29260
- Ragam has no `tradition` column — intentionally removed. Don't re-add it.
- Dynamic route `params` is a `Promise` in Next.js 15+ — must `await params` before accessing fields
- Pages use `force-dynamic` since data comes from Supabase (no `generateStaticParams`)
- Audio files hosted on Cloudflare R2 (bucket: `ragaflow-audio`, public URL: `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/`). `audio_url` in the database is a full R2 URL. See `public/audio/README.md` for upload instructions.
- Session player is a server page wrapping a client `SessionPlayer` component (for interactivity)
- Timer uses `setInterval` in `useEffect`; audio uses `<audio loop>` with ref-based play/pause
- Supabase is required — without env vars the app renders empty (no local seed fallback)
- Supabase clients return `null` when env vars are missing — data functions return empty arrays
- RLS policies: ragams/tracks publicly readable; rasikas/listening_sessions/certifications owner-only

## Monetization model

- Streaming free (account required)
- Downloads paid (subscribers only)
- 10-hour cumulative listening gate → must subscribe to continue
- Tiers: $5/mo, $30/yr, $100 lifetime, $300 sponsor

## Process

See `docs/dev-design.md` § "Git & Pull Request Workflow" for the full branch/PR workflow.

- **Feature branches off `dev`** — create `fix/*` or `feat/*` branches, open PRs against `dev`
- **Never commit directly to `main` or `dev`** — all changes go through PRs (exception: trivial doc-only changes to `dev`)
- **One PR per logical task** — smaller PRs are easier to review and less likely to conflict
- **Human merges PRs** — Claude Code pushes branches and opens PRs; human reviews and merges
- **Production deploys from `main`** — human merges `dev` → `main` when ready
- **Clean up branches after merge** — `git fetch --prune origin`, then delete local branches marked `gone`
- **Rebase frequently** — rebase `dev` onto `main` every few tasks, not in big batches
- **Clean up large files at deletion time** — when removing binary files from the repo, run `git filter-repo` in the same task
- **Gitignore new tools immediately** — add local state directories to `.gitignore` before the first commit
- Update this file each conversation with new context
