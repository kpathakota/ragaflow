# Screen: Session Player

**Status:** `shipped` (web — PR feat/screen-player, 2026-06-24); iOS follow-up queued
**Locked:** 2026-06-14

## Job to be Done

> I want to listen to this track for a set duration, then optionally save it as my default.

## Primary user

Returning rasika mid-session. The user spends 25–45 minutes here per session — the running state matters more than the setup state.

## Out of scope

- TBD

## Current state (from critique 2026-04-23)

- **Web** (`web/app/mode/[scenario]/[trackId]/session-player.tsx`): timer + audio + favorite, inline favorite, no volume control, no sleep fade.
- **iOS** (`ios/Ragaflow/Views/Player/SessionPlayerView.swift`): timer + audio + favorite in toolbar, remote command center (earbuds/lock screen), sleep volume fade over last 120s, "Back to list" on completion.
- Running state is "nearly empty" — tiny grey timer, static blurred orb. Users stare at this for 25–45 minutes.

## Deltas to close (from beta-checklist)

- [x] Larger timer (`text-5xl`) in accent color during playback *(web)*
- [x] Show track title + ragam name below timer during running/paused *(web)*
- [x] Circular progress ring around play/pause button *(web)*
- [x] Breathing animation on background orb (meditate/sleep) *(web; respects `prefers-reduced-motion`)*
- [ ] 3-second crossfade on loop restart — **deferred**: needs a dual-`<audio>` element implementation + real-device audio verification (can't be validated in CI). Tracked for a follow-up.
- [x] Port sleep volume fade to web *(web; `sleepFadeVolume` in `lib/player.ts`)*
- [x] Add "Back to list" to web session player completion state *(already present; confirmed)*
- [x] Unify favorite button placement *(web favorite is top-right, matching iOS toolbar; iOS parity confirmed in the iOS follow-up)*

## Notes

- **This is the highest-leverage screen.** The user's attention budget here is an order of magnitude larger than any other screen. Worker should treat polish here as load-bearing, not cosmetic.
- Sleep fade currently lives only on iOS. Web parity is part of this scope.
- Several deltas are iOS→web ports (sleep fade, "Back to list"). One is web→iOS (consistency in favorite placement — direction TBD).
- The "ambient orb" breathing animation is the kind of thing that benefits from a real visual designer pass. Ship structure first, polish second.
