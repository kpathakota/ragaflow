# Screen: Home

**Status:** `locked-jtbd` (next: `queued` → `active` → `shipped`)
**Locked:** 2026-06-14

## Job to be Done

> I want to start a listening session quickly, or choose a mode that fits my current need.

## Primary user

Returning rasika. Quick Play / featured track is the main payoff; new users get a softer fallback. Time-to-first-audio for a returning user should be 1 tap.

## Out of scope

- TBD

## Current state (from critique 2026-04-23)

- **Web** (`web/app/page.tsx`): redesigned — warm `#0F0B07` background + time-of-day candle glow, serif (Playfair) brand lockup, a single time-aware "Tonight" invitation card (featured track, or the rasika's saved default for the current scenario), serif scenario cards, two-up Explore/Favorites footer.
- **iOS** (`ios/Ragaflow/Views/Home/HomeView.swift`): brought to parity with the web redesign (system serif "New York" in place of Playfair). Collapsed the old QUICK PLAY + FEATURED lists into the single "Tonight" card to match web.

## Deltas to close (from beta-checklist)

- [x] Featured track card for 1-tap play (PR #48, #49)
- [x] Unify Explore accent color across platforms — both now use a neutral cream footer tile (the old iOS tan / web emerald scenario-style Explore card is gone)
- [ ] Time-aware greeting ("Good evening") instead of tagline — still open on **both** platforms (the time-aware label lives on the "Tonight" card eyebrow, not the greeting)
- [ ] Drop favorites count from Home (belongs on Profile) — still open on **both** platforms

## Notes

- Two remaining tweaks plus the cross-platform accent unification. The Explore accent inconsistency is part of the broader A3 (parity policy) decision but the call can be made screen-locally — pick one accent here when this screen ships.
