# Screen: Scenario Track List

**Status:** `locked-jtbd` (next: `queued` → `active` → `shipped`)
**Locked:** 2026-06-14

## Job to be Done

> I've chosen my mode — now I want to pick a specific track to play.

## Primary user

Returning rasika who skipped Quick Play because they want to choose. A first-time visitor reaches this screen after picking a scenario card on Home, so the screen still has to work for them — but the choice mechanics are tuned for the returning case.

## Out of scope

- TBD

## Current state (from critique 2026-04-23)

- **Web** (`web/app/mode/[scenario]/`): flat list sorted newest-first, ragam name on each card; fires `scenario_view` analytics.
- **iOS** (`ios/Ragaflow/Views/Scenarios/TrackListView.swift`): same shape; does *not* fire `scenario_view` (cross-platform analytics gap).
- Cards are info-dense (6–7 data points); sorting by recording date is irrelevant to a new listener.

## Deltas to close (from beta-checklist)

- [ ] Pin "Editor's pick" badge to one track per scenario
- [ ] Collapse description to one line by default
- [ ] Add sort toggle (Newest / Popular)
- [ ] Show toast for unauthenticated heart taps (instead of silent redirect)

## Notes

- **Editor's pick mechanism is unblocked.** Worker cannot start the badge delta until A5 in `docs/automation-rollout.md` is decided: manual `editors_pick boolean` on `tracks`, per-scenario editorial table, or tag-based.
- **Analytics parity gap** (`scenario_view` on web but not iOS) is captured but tied to the A3 (parity policy) decision. Worker should add the iOS event when shipping this screen regardless of A3 — it's a one-line fix.
