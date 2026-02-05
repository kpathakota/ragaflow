# Ragaflow

Ragaflow is a web app that serves Indian classical ragas for focus, sleep, and meditation. Users select a mode, browse curated ragams, and play audio sessions.

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Fonts:** Geist Sans / Geist Mono (via next/font)

## Key files

- `content/ragams.json` — ragam catalog (id, name, mode, description, audioUrl)
- `public/audio/` — audio files organized by mode (`focus/`, `sleep/`, `meditate/`)
- `app/page.tsx` — homepage / mode selection
- `app/mode/[mode]/page.tsx` — ragam list per mode
- `app/globals.css` — global styles (always-dark theme)

## Routing

```
/                        → Mode selection (Focus, Sleep, Meditate)
/mode/focus              → Focus ragams list
/mode/sleep              → Sleep ragams list
/mode/meditate           → Meditate ragams list
/mode/[mode]/[ragamId]   → Session player (planned)
```

## Design principles

- Always dark — no light mode
- Mobile-first, minimal UI
- Tailwind only — no component libraries

## Process

- Commit and push after every task
- Update this file each conversation with new context
