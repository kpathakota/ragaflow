# Beta Automation Rollout — Gap Punchlist

**Goal:** get to a state where you can sit in iMessage/Claude.app/GitHub mobile, review one PR per screen, and merge. Each PR ships the matched change to both web and iOS. TestFlight + Vercel previews come for free.

**This doc:** what's in the way of running that loop autonomously, grouped by who can clear it. The per-screen UX work is already enumerated in `beta-checklist.md` — that's the agent's job, not this list.

---

## The loop (target state)

```
[Trigger] — scheduled (cron) OR remote (Claude.app from phone, "ship next screen")
   ↓
[Pick] — read docs/screens/<next>.md (top of queue, status: ready)
   ↓
[Worker: /modernize-screen <name>]
   - reads the screen spec (JTBD + deltas locked)
   - implements web (Next.js) + iOS (SwiftUI) in one branch
   - runs web tests + iOS tests
   - captures before/after screenshots
   - commits, opens PR against dev
   ↓
[Auto-preview]
   - Vercel preview URL (already works)
   - Xcode Cloud TestFlight build (needs config — see Gap 3)
   - PR auto-comment: preview URL, TF build #, screenshots
   ↓
[Phone review]
   - You open PR on GitHub mobile
   - Tap Vercel preview, open TestFlight build
   - Squash-merge OR comment a change request
   ↓
[Merge → dev]
   - Vercel deploys dev preview, Xcode Cloud → TestFlight Dev Testing
   - Loop fires again, picks next screen
```

You stay in charge of: color tokens, fonts, image assets, copy approval, JTBD locks, queue order. Agent owns: structural implementation, tests, PR open.

---

## Why we're not there yet — gap categories

| \# | Category | Owner | Items |
| --- | --- | --- | --- |
| A | Strategic decisions only you can make | You | 5 |
| B | External coordination | You + others | 4 |
| C | Account / infra config the agent can't do | You | 5 |
| D | Plumbing the agent can build once you green-light | Me (Claude) | 6 |
| E | Cleanup (do today) | Either | 3 |

---

## A. Strategic decisions (you, 30–60 min total)

These lock the contract the worker agent operates from. Without them the agent will guess and you'll churn on PRs.

- [x] **A1. Lock the JTBD per screen.** *Done 2026-06-14.* Six files written under `docs/screens/`; see `docs/screens/README.md` for the index. Five JTBDs ratified verbatim from the critique; Auth tightened. Cross-screen principles also captured (ragam-learning-via-achievements, confirm-password kept, Player is highest-leverage).

- [x] **A2. Decide screen rollout order.** *Locked 2026-06-23: unblocked-first.* Order: **Player → Explore → Track List → Profile → Auth** (Home already shipped via PR #48/#49). Front-loads screens with zero external blockers so the loop never stalls; Auth is last because it waits on Google/Apple OAuth provisioning (C1/C2), which can proceed async.

- [x] **A3. Web↔iOS parity policy.** *Locked 2026-06-23: web-leads, iOS-follows.* Worker ships the web change first (instant Vercel preview for phone review), then queues a matching iOS PR. Aligns with C3 (iOS tested post-merge only, so it can't be reviewed on a PR anyway). The worker opens the iOS catch-up PR as a separate queue item.

- [x] **A4. Subscription tier UX.** *Locked 2026-06-23: tier-select page.* Dedicated `/subscribe` page listing all 4 tiers ($5/mo, $30/yr — "most popular", $100 lifetime, $300 sponsor), then checkout. Easiest to review on phone and gives room for 4 tiers with descriptions. Blocks Profile screen.

- [x] **A5. "Editor's pick" mechanism.** *Locked 2026-06-23: boolean column.* Add `editors_pick boolean DEFAULT false` to the `tracks` table (one migration). Clear semantics, trivial to query and to toggle in the upload flow; keeps curation separate from content `tags[]`. Blocks Track List screen.

## B. External coordination (asynchronous, start now)

- [ ] **B1. Color pass (do myself).** Beta checklist had this for April 25 weekend; today is 2026-06-09 — I still haven't done this, I'm going to wing it for the Beta and then see if I need to change it later. Supriya will find it easier with actually being on the Beta. Output: a locked palette in CSS custom props + Swift `Color` extension. Why: every screen modernization touches color tokens; redoing later = double work.

- [ ] **B2. Typography lock.** Playfair Display for display, Geist for body is the brief. Add `next/font` for Playfair on web; add font file + Info.plist on iOS. *Mostly Claude work once direction is confirmed.*

- [ ] **~~B3. Gautam check-in.~~** ~~Beta checklist flags: "does he have more material in progress?" More tracks = better variety per scenario for testers. Not a blocker for screens, but a blocker for invite quality.~~ Not a problem now, I've got all the content.

- [ ] **B4. Image assets brief.** You want to own this — define the slots (Home hero, scenario card backgrounds, Player ambient orb?) so screen PRs leave clean asset placeholders that you swap later.

## C. Account / infra config (you, \~2 hours one-time)

- [ ] **C1. Google OAuth provisioning.** `docs/google-auth-plan.md` lists the manual steps for both staging + prod Supabase projects. Do this once; the OAuth code PR is trivial after.

- [ ] **C2. Apple Sign-In provisioning.** Apple Developer → App ID → enable "Sign In with Apple"; Supabase → Auth → Providers → Apple. Same pattern as Google.

- [x] **C3. (not doing) Xcode Cloud per-PR builds.** Currently your two workflows only fire on `dev` and `main`. To get TestFlight previews on feature-branch PRs, add a 3rd workflow watching `feat/*` + `fix/*` branches with `Changes in ios/` start condition, archived to a "PR Previews" internal group. *Alternative: skip and accept that iOS testing happens only post-merge to dev — fewer round-trips on phone, slightly worse safety.* \[KP note\]: iOS testing only happens post-merge to dev. Screenshots and integration testing still gates the merge but real physical testing only happens on device post-merge.

- [ ] **C4. RemoteTrigger setup.** So you can fire the loop from Claude.app on your phone with one tap. Run `/update-config` to configure, or wire it manually.

- [x] **C5. Review cadence + scheduling.** *Locked:*
  - **3h cron cadence** — slow enough to avoid noop spam, fast enough that an evening review gets picked up same-night.
  - **Cheap early-exit on entry** — worker's first step is a state probe: `gh pr list --author @me --state open` + comment poll on open PR + merge check. Exit in ~30s if there's no work. Only the post-merge "open next screen PR" path is expensive.
  - **Overlap protection** — worker writes a sentinel branch (`automation/lock`) at start, checks for it on entry. Skip if present and < 1h old; treat as crashed if older and clear it.
  - **RemoteTrigger as complementary "ship now" button** — wire later (C4) for the post-review case where you don't want to wait 3h.

## D. Plumbing the agent will build (Claude, blocked on A+C)

These are queued. Don't do them yet — they depend on the decisions above. Listed so you see the path.

- [ ] **D1.** `docs/screens/` **directory.** One file per screen: JTBD (from A1), current state (web + iOS), gap to close, acceptance criteria, status (`queued | active | shipped`). This is the queue.

- [ ] **D2.** `/modernize-screen` **skill.** Args: screen name. Reads spec, implements web + iOS, runs tests, opens PR. Built once A1–A5 are locked.

- [ ] **D3. PR auto-comment workflow.** GH Action that posts Vercel preview URL + (optional) TF build # + before/after screenshots. Phone review hinges on this.

- [ ] **D4. Web visual snapshot harness.** Playwright script taking before/after screenshots of the changed screen at mobile + desktop widths, attached to the PR comment.

- [ ] **D5. Auto code review on PR + comment loop.** Run the standard `code-review` skill (not ultra) on every PR; findings post as inline comments. Worker must also pick up *your* GitHub comments on the next cron run and address them in follow-up commits. PR doesn't merge until all comments (auto + yours) are resolved. You merge manually.

- [ ] **D6. iOS test job in CI.** `.github/workflows/test.yml` runs web tests only. Add a macOS runner job for `cd ios && xcodebuild test`. Catches regressions before TestFlight wastes a build.

## E. Cleanup (do today, low effort)

- [x] **E1.** `.vercel.misplaced/` **moved to `web/.vercel/`** — was a `vercel link` run from the wrong directory; relocated to the monorepo Root Directory location. `.vercel` is already gitignored.
- [x] **E2.** `.gitignore` **diff verified** — adds `*` wildcard to xcconfig patterns (catches `Debug.xcconfig.bak` etc.) and adds `.vercel` to the ignore list. Ready to commit.
- [x] **E3.** **beta-checklist sequence rewritten** — removed the April 25 anchor; sequence now points at `docs/automation-rollout.md` for orchestration, defers Supriya color tuning to post-Beta when she can use the build.

---

## Suggested order of operations

1. **Today (1h):** Clear E1–E3. Decide A1–A5 in one sitting — I'll prep options for each, you pick.
2. **This week:** B1 (color session) + C1 + C2 (OAuth provisioning, async while waiting on Supriya).
3. **Once A+B+C done:** I build D1–D4 in a single PR; queue starts.
4. **First loop run:** I pick screen 1 from D1 queue, open PR, you review on phone.
5. **Iterate:** Each loop iteration is one screen, one PR. Six screens × \~2 days/screen = \~2 weeks to a Beta-ready surface area.

---

## Out of scope for this doc

- Per-screen UX changes — see `docs/beta-checklist.md` for the running list (22 items across 6 screens).
- Landing page — separate effort, blocks on B1 (color pass).
- Invite email — separate effort, blocks on landing page.
- iOS payments (StoreKit 2) — Phase 3, post-beta.

---

## Open questions — resolved

1. **RemoteTrigger vs cron.** *Cron primary (3h), RemoteTrigger as complementary "ship now" button.* See C5.
2. **PR auto-review (D5).** *Yes — auto-review every PR. Your GitHub comments must also be picked up and addressed before merge. You merge manually.* See D5.
3. **Xcode Cloud per-PR builds (C3).** *Skip. Accept post-merge-only TF builds.*
4. **Worker autonomy.** *Yes — worker commits to feature branches and opens PRs autonomously. Review happens solely on GitHub.*