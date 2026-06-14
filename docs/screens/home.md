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

- **Web** (`web/app/page.tsx`): personalized defaults + scenario cards + Explore link + user badge. Featured track card shipped (PR #48, #49).
- **iOS** (`ios/Ragaflow/Views/Home/HomeView.swift`): same shape.

## Deltas to close (from beta-checklist)

- [x] Featured track card for 1-tap play (PR #48, #49)
- [ ] Time-aware greeting ("Good evening") instead of tagline
- [ ] Drop favorites count from Home (belongs on Profile)
- [ ] Unify Explore accent color across platforms (web=emerald, iOS=tan)

## Notes

- Two remaining tweaks plus the cross-platform accent unification. The Explore accent inconsistency is part of the broader A3 (parity policy) decision but the call can be made screen-locally — pick one accent here when this screen ships.
