# Screen: Auth

**Status:** `locked-jtbd` (next: `queued` → `active` → `shipped`)
**Locked:** 2026-06-14

## Job to be Done

> I need to log in so the app is personalized for me (favorites, defaults, achievements).

## Primary user

New visitor. Sign-up is the hard case; sign-in is mechanical.

## Out of scope

- TBD

## Current state (from critique 2026-04-23)

- **Web** (`web/app/auth/`): email + password sign-in/sign-up, email confirmation callback.
- **iOS** (`ios/Ragaflow/Views/Auth/AuthView.swift`): email + password with confirm-password field on signup.

## Deltas to close (from beta-checklist)

- [ ] Google/Apple OAuth (biggest auth conversion lever)
- [ ] "Continue without account" link explaining what they miss
- [ ] iOS: change blue submit button to match earth-tone palette

## Notes

- **Confirm-password is intentional.** The critique recommended removing it; the product call is to keep it as a familiar sign-up pattern. Worker should not propose removal again.
- Google OAuth needs Supabase provider provisioning (see `docs/google-auth-plan.md` + C1 in `docs/archive/automation-rollout.md`). Apple Sign-In needs Apple Developer + Supabase provider provisioning (C2).
- The two OAuth deltas can't be implemented until provisioning is done. Worker should check for `auth.providers.google` / `auth.providers.apple` before opening a PR that adds the buttons.
