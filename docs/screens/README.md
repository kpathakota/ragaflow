# Screens

Locked JTBDs for the six Ragaflow screens. Each file is the **contract** the worker agent (`/modernize-screen`) builds against — JTBD, primary user, current state, deltas to close.

Status lifecycle: `locked-jtbd` → `queued` → `active` → `shipped`.

**Locked:** 2026-06-14 (A1 from `docs/automation-rollout.md`)

## Queue order

**Locked 2026-06-23 (A2): unblocked-first.** Home is already shipped (PR #48/#49). Remaining order:

1. **Player** — running-state upgrade *(no blockers; highest attention budget per session)*
2. **Explore** — search bar *(no blockers)*
3. **Track List** — editor's pick + decision-fatigue cleanup *(A5 resolved: `editors_pick` boolean column)*
4. **Profile** — parity + tier selection *(A3/A4 resolved: web-leads parity, `/subscribe` tier page)*
5. **Auth** — Google/Apple OAuth *(last; waits on C1/C2 OAuth provisioning, which proceeds async)*

Parity policy (A3): **web leads, iOS follows.** The worker ships each screen's web change first, then queues a matching iOS PR as a separate item.

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

| Delta | Blocked on | Status |
|---|---|---|
| Track List editor's pick badge | A5 (mechanism decision) | ✅ resolved — `editors_pick` boolean column |
| Profile tier selection before subscribe | A4 (UX decision) | ✅ resolved — `/subscribe` tier-select page |
| Profile parity rollout | A3 (parity policy) | ✅ resolved — web leads, iOS follows |
| Auth Google button | C1 (Google OAuth provisioning) | ⏳ pending — manual Supabase setup |
| Auth Apple button | C2 (Apple Sign-In provisioning) | ⏳ pending — manual Supabase setup |
