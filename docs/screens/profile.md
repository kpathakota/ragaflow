# Screen: Profile

**Status:** `locked-jtbd` (next: `queued` → `active` → `shipped`)
**Locked:** 2026-06-14

## Job to be Done

> I want to see my listening progress, manage my account, or check my subscription.

## Primary user

Returning rasika auditing their own state. This is a destination screen, not a browse screen — users come here with intent.

## Out of scope

- TBD

## Current state (from critique 2026-04-23)

**This screen has the biggest cross-platform inconsistency of any in the app.**

- **Web** (`web/app/profile/page.tsx`): account info, listening stats, certifications, **default tracks**, sign-out, subscription card (basic).
- **iOS** (`ios/Ragaflow/Views/Profile/ProfileView.swift`): account info, stats, **certifications grid with progress bars**, **subscription section with status badges and pricing tiers**, no defaults management.

Neither platform has both defaults *and* full subscription/certification UX. A user on both sees a disjointed experience.

## Deltas to close (from beta-checklist)

- [ ] Feature parity across web and iOS (defaults + certs + subscription on both)
- [ ] Tier selection before "Subscribe" (currently one-click, no tier choice)
- [ ] "Clear" action for default tracks
- [ ] "Recent sessions" mini-list (last 5) below stats
- [ ] Link favorites count to a filtered Explore view

## Notes

- **Subscription tier UX is unblocked.** Worker cannot start the "tier selection before Subscribe" delta until A4 in `docs/automation-rollout.md` is decided (tier-select modal vs. tier-select page vs. status quo).
- **Web↔iOS parity policy is unblocked.** This screen is the canonical test case for A3 in `docs/automation-rollout.md`. The PR that ships this screen will set the implicit precedent for every other screen, so A3 should be decided before this one is picked off the queue.
- **Cross-link from Explore design philosophy:** the certifications grid is the *deep* place for ragam learning. When a rasika hits silver/gold tier on a ragam, surface richer ragam context (history, time-of-day, evocative description, signature recordings) — this is the payoff for sustained listening.
