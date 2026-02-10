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

1. Create a Supabase project
2. Copy `.env.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Run `supabase/migrations/001_initial_schema.sql` in SQL editor
4. Run `supabase/seed.sql` to insert starter data
5. Without env vars, app gracefully falls back to local seed data in `content/seed.ts`

## Data model (Phase 1 — current)

**Ragam** — a melodic framework, no scenario binding:
- id, name, description, time_of_day

**Track** — a recorded session, the atomic content unit:
- id, title, ragam_id, scenarios[], tags[], description, duration, audio_url, download_url, free, created_at

**RasikaPreferences** — per-user favorites and defaults:
- rasika_id, favorite_tracks[], favorite_ragams[], default_focus_track, default_sleep_track, default_meditate_track

**ListeningSession** — per-play log:
- rasika_id, track_id, scenario, started_at, ended_at, duration_seconds

**Certification** — per ragam per rasika achievement:
- rasika_id, ragam_id, level (1–4), total_seconds

Types defined in `lib/types.ts`. Local seed data in `content/seed.ts`. Data access via `lib/data.ts` (Supabase-first, falls back to seed).

## Key files

- `content/ragams.json` — ragam catalog (id, name, mode, description, audioUrl)
- `public/audio/` — audio files organized by mode (`focus/`, `sleep/`, `meditate/`)
- `app/page.tsx` — homepage / mode selection
- `app/mode/[mode]/page.tsx` — ragam list per mode (cards link to session player)
- `app/mode/[mode]/[ragamId]/page.tsx` — session player server page (params validation + static generation)
- `app/mode/[mode]/[ragamId]/session-player.tsx` — client component with Pomodoro timer + looping audio
- `app/globals.css` — global styles (always-dark theme)

## Routing

```
/                        → Mode selection (Focus, Sleep, Meditate)
/mode/focus              → Focus ragams list
/mode/sleep              → Sleep ragams list
/mode/meditate           → Meditate ragams list
/mode/[mode]/[ragamId]   → Session player (timer + audio)
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
- Audio files go in `public/audio/{scenario}/` matching `audio_url` paths in seed/database
- Session player is a server page wrapping a client `SessionPlayer` component (for interactivity)
- Timer uses `setInterval` in `useEffect`; audio uses `<audio loop>` with ref-based play/pause
- Supabase clients return `null` when env vars are missing — all code handles this gracefully
- RLS policies: ragams/tracks publicly readable; rasika_preferences/listening_sessions/certifications owner-only

## Monetization model

- Streaming free (account required)
- Downloads paid (subscribers only)
- 10-hour cumulative listening gate → must subscribe to continue
- Tiers: $5/mo, $30/yr, $100 lifetime, $300 sponsor

## Gotchas

- Dynamic route `params` is a `Promise` in Next.js 15+ — must `await params` before accessing fields
- `generateStaticParams` pre-renders mode routes at build time — add new entries when adding modes
- Audio files go in `public/audio/{mode}/` matching `audioUrl` paths in ragams.json
- Session player is a server page (for `generateStaticParams`) wrapping a client `SessionPlayer` component (for interactivity)
- Timer uses `setInterval` in `useEffect`; audio uses `<audio loop>` with ref-based play/pause

## Process

- Commit and push after every task
- Update this file each conversation with new context
