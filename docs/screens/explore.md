# Screen: Explore

**Status:** `shipped` (web — PR #57, 2026-06-25); iOS follow-up queued
**Locked:** 2026-06-14

## Job to be Done

> I want to discover new tracks by browsing ragams or filtering by mood/tag.

## Primary user

Returning rasika exploring after a few sessions. A first-timer doesn't yet have intuition for which ragam fits which mood, but they're not the target — they're served by the Home scenario cards.

## Out of scope

- TBD

## Design philosophy (locked 2026-06-14)

**Don't dumb down the ragam framing.** Users have some intuition around what a raga is, and that intuition is built naturally by surfacing ragam meaning at the right moments throughout the app — *especially* via achievements: when a rasika has listened enough to a particular ragam to earn a silver/gold tier, that's the moment to surface deeper ragam context.

Implication for this screen: ragam names stay primary. Ragam descriptions can accompany them as mood hints, but should not replace them. Don't translate "Bhairavi" into "Evening calm" — surface both.

## Current state (from critique 2026-04-23)

- **Web** (`web/app/explore/`): grouped by ragam, tag filter, no search, no duration filter, no premium filter.
- **iOS** (`ios/Ragaflow/Views/Explore/ExploreView.swift`): grouped by ragam, tag pills (gold when selected), "Clear filters" button + selected tag count.
- Cross-platform: accent color differs (web=emerald, iOS=tan), tag pill style differs.

## Deltas to close (from beta-checklist)

- [x] Search bar (client-side fuzzy across titles, ragams, tags)
- [x] Make ragam descriptions more prominent as mood descriptors
- [x] Duration and free/premium filters
- [x] Fix back-button context when linking from Explore
- [x] Add "Clear filters" + selected tag count to web

## Notes

- The "make ragam descriptions more prominent as mood descriptors" delta needs careful execution per the design philosophy above. **Surface the description alongside the ragam name; don't rename it.**
- Cross-link: the Profile screen's achievements section is the *deep* place for ragam learning. Explore can hint at it ("Reach silver to learn more about this ragam") without overloading the browse experience.
- Web↔iOS feature parity gap on filter UX (web missing "Clear filters" + count). Part of this scope when this screen ships.
