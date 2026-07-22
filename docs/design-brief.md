# RagaFlow — Design Brief

**One line:** A curated listening app that uses Indian ragas for focus, sleep, and meditation. Creator-driven, not algorithm-driven.

**Platforms:** iOS (primary) + web (ragaflow.io). Same design language, both shipping.

## What makes it different

- Ragas are specific musical frameworks with intent — not generic ambient noise
- One creator's voice and curation, not a marketplace
- Rooted in carnatic/hindustani tradition, built for modern daily use
- Educational layer: ragas have meaning, and the app surfaces it (artist notes, ragam descriptions, evocative locations)

## Who it's for

- People who want music-for-purpose beyond lo-fi beats and rain sounds
- South Asian diaspora with cultural connection to classical music
- Intentional listeners, musicians, educators

## Palette direction

Open to exploration within these constraints:

- **Always dark, always warm** — no cool grays, no clinical whites
- Lean into earthen, natural tones — think clay, aged paper, candlelight, not neon or jewel tones
- Each scenario needs a distinct accent that reads clearly on dark backgrounds but doesn't scream
- The current accents (gold, terracotta, sage) are a starting point, not locked in
- Foreground text should feel warm cream, not pure white
- **Constraint:** must work across iOS and web with no light mode

**What to avoid:**

- Cool/blue-heavy palettes (too clinical, too "tech")
- High-saturation accents (too loud for a listening app)
- Pure black backgrounds (too harsh — warm near-black is the move)

## Design principles

1. **Minimal and intentional** — every element earns its place. No feature clutter.
2. **Warm, not sterile** — this isn't a hospital meditation room. Think candlelit, handmade, lived-in.
3. **The music is the product** — UI recedes when audio plays. The session player is the core screen.
4. **Curiosity over intimidation** — ragas are deep but the app shouldn't feel like a textbook. Invite exploration.
5. **Mobile-first** — one-thumb reach, minimal navigation depth.

## Typography

- **Display/headings:** Playfair Display — high-contrast serif with elegance and warmth. From Supriya's branding.
- **Body:** Geist Sans — clean, modern, lets the content breathe.
- **Data/mono:** Geist Mono — timers, durations, stats.

The serif/sans pairing gives the app a rooted-yet-modern feel — tradition in the headings, clarity in the body.

## Three modes, three moods

- **Focus** — sharp, alert, morning energy
- **Sleep** — soft, warm, winding down
- **Meditate** — still, grounded, contemplative

## Priority design problems

1. **Landing page** — currently scattered, needs a single clear story
2. **Auth flow** — first alpha feedback flagged sign-in/out friction
3. **Cross-platform coherence** — iOS has branding assets from Supriya; web needs to match

## What the designer should NOT do

- Add a light mode
- Use component libraries or stock UI patterns (Tailwind + SwiftUI only)
- Treat this like Calm/Headspace — it's smaller, sharper, more opinionated
- Over-design — the aesthetic is "musician's notebook," not "corporate wellness portal"
