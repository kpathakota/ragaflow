# Screens

Locked JTBDs for the six Ragaflow screens. Each file is the **contract** the worker agent (`/modernize-screen`) builds against — JTBD, primary user, current state, deltas to close.

Status lifecycle: `locked-jtbd` → `queued` → `active` → `shipped`.

**Locked:** 2026-06-14 (A1 from `docs/automation-rollout.md`)

## Queue order

Not yet decided (A2). Critique's "Top 5 Priorities" suggests:

1. Home — featured track for 1-tap play *(largely shipped via PR #48, #49 — confirm and close out)*
2. Player — running-state upgrade *(highest attention budget per session)*
3. Track List — editor's pick + decision-fatigue cleanup *(blocked on A5)*
4. Auth — Google/Apple OAuth *(blocked on C1/C2 provisioning)*
5. Explore — search bar

Profile is the canonical test case for A3 (parity policy), so it should be ordered after that's decided.

## Screens

| Screen | JTBD (one-line) | File |
|---|---|---|
| Home | Start a session quickly, or pick a mode. | [home.md](home.md) |
| Auth | Log in so the app is personalized for me. | [auth.md](auth.md) |
| Track List | Pick a specific track in this scenario. | [track-list.md](track-list.md) |
| Player | Listen for N minutes, maybe save as default. | [player.md](player.md) |
| Explore | Discover tracks by ragam, mood, tag. | [explore.md](explore.md) |
| Profile | Audit my progress, account, subscription. | [profile.md](profile.md) |

## Cross-screen principles (captured during lock session)

- **Ragam learning is built via achievements, not Explore translation.** Don't replace ragam names with mood labels. Surface ragam descriptions alongside, never instead. The Profile certifications grid is the *deep* place for ragam context — payoff for sustained listening. (See `explore.md` and `profile.md`.)
- **Confirm-password is intentional** on Auth. (See `auth.md`.)
- **The Player screen is the highest-leverage screen** — 25-45 min of user attention per session. Treat polish here as load-bearing. (See `player.md`.)

## Open dependencies that block specific deltas

| Delta | Blocked on |
|---|---|
| Track List editor's pick badge | A5 (mechanism decision) |
| Profile tier selection before subscribe | A4 (UX decision) |
| Profile parity rollout | A3 (parity policy) |
| Auth Google button | C1 (Google OAuth provisioning) |
| Auth Apple button | C2 (Apple Sign-In provisioning) |
