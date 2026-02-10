# Ragaflow

Ragaflow is a web app that serves Indian classical ragas for focus, sleep, and meditation. Users select a mode, browse curated ragams, and play audio sessions.

## Tech stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` syntax)
- **Language:** TypeScript
- **Fonts:** Geist Sans / Geist Mono (via next/font)

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

## Design principles

- Always dark — no light mode
- Mobile-first, minimal UI
- Tailwind only — no component libraries

## Gotchas

- Dynamic route `params` is a `Promise` in Next.js 15+ — must `await params` before accessing fields
- `generateStaticParams` pre-renders mode routes at build time — add new entries when adding modes
- Audio files go in `public/audio/{mode}/` matching `audioUrl` paths in ragams.json
- Session player is a server page (for `generateStaticParams`) wrapping a client `SessionPlayer` component (for interactivity)
- Timer uses `setInterval` in `useEffect`; audio uses `<audio loop>` with ref-based play/pause

## Process

- Commit and push after every task
- Update this file each conversation with new context
