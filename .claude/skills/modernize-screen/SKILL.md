---
name: modernize-screen
description: "Autonomous screen-modernization worker: reads a locked screen spec, implements the web deltas with tests, captures before/after screenshots, and opens a PR against dev. The core of the beta automation loop (docs/archive/automation-rollout.md)."
---

# Modernize Screen Worker

The worker step of the beta automation loop (`docs/archive/automation-rollout.md`). Fired by
cron (3h cadence) or RemoteTrigger ("ship now" from the phone). It takes **one
screen**, ships its **web** deltas in a single PR against `dev`, and attaches
before/after screenshots so the PR can be reviewed entirely from GitHub mobile.

**Parity policy (A3): web leads, iOS follows.** This skill ships the *web* change.
After the web PR merges, it queues a matching iOS catch-up as a separate item — it
never blocks the web PR on iOS.

## Arguments

- `$ARGUMENTS` — optional screen name (`player`, `explore`, `track-list`, `profile`, `auth`).
  If omitted, pick the top `queued` screen from the A2 order (see Step 1).

## Locked decisions this worker honors

From `docs/archive/automation-rollout.md` (A2–A5, locked 2026-06-23):

- **A2 queue order:** Player → Explore → Track List → Profile → Auth. (Home already shipped.)
- **A3 parity:** web leads; open the iOS follow-up as a separate PR/issue after web merges.
- **A4 tier UX:** Profile work routes subscribe through a dedicated `/subscribe` page listing all 4 tiers ($5/mo, $30/yr "most popular", $100 lifetime, $300 sponsor).
- **A5 editor's pick:** Track List uses an `editors_pick boolean DEFAULT false` column on `tracks` (one migration in `supabase/migrations/`).
- **Auth (C1/C2):** Google/Apple OAuth needs Supabase provisioning first. If those aren't done, ship only the non-OAuth Auth deltas and note the blocked ones in the PR.

## Production safety (no staging — locked 2026-06-23)

Staging was removed; local dev, Vercel previews, and this worker now all hit the
**production** Supabase project (`mkikuyxvabhbaxspoiay`). Because there is no
throwaway environment, the worker must treat the database as live:

- **Screenshots are read-only.** The harness only loads pages; never sign in as a
  real user, start/seed sessions, or mutate rows just to populate a screenshot.
- **Migrations are gated.** If a delta needs a schema change (e.g. A5's
  `editors_pick` column), add the migration file and call it out in the PR — do
  **not** apply it to production automatically. The human runs it (see
  `feedback_sync_sql_file`: write SQL to `uploads/sync.sql`, never execute from the terminal).
- **No destructive or bulk writes** during a run. Reads for rendering are fine.
- **Never commit `.env.local`** or any pulled prod credentials.

## Screenshot hosting & cleanup (R2)

PR screenshots are hosted on the public R2 bucket (`ragaflow-audio`) under the
`screenshots/pr<N>/` prefix, because the GitHub repo is private and release/raw
URLs won't render inline. Two things keep this from accumulating:

- **Lifecycle rule (primary, set-and-forget):** the bucket has a lifecycle rule
  expiring everything under `screenshots/` after **14 days**. Screenshots only need
  to live as long as a PR is in review. One-time setup:
  ```bash
  npx wrangler r2 bucket lifecycle add ragaflow-audio \
    --prefix screenshots/ --expire-days 14 --name screenshots-expiry
  ```
- **Per-merge sweep (best-effort):** on entry (Step 0), the worker deletes the R2
  prefix for any screen PR that has since merged/closed:
  ```bash
  npx wrangler r2 object delete "ragaflow-audio/screenshots/pr<N>/<name>.png" --remote
  ```
  (R2 has no recursive prefix delete via wrangler — list the known asset names and
  delete each, or just rely on the lifecycle rule.)

Cost is negligible: ~1 MB per PR, R2 storage is $0.015/GB-month with **zero egress
fees**, so even hundreds of PRs cost fractions of a cent. The lifecycle rule means
it never grows unbounded regardless.

Requires `CLOUDFLARE_API_TOKEN` (R2 read/write) in the environment — wrangler's
interactive OAuth does not work in the non-interactive cron/worker context.

## Step 0: Early-exit + overlap lock (C5)

Before doing any expensive work, probe state and bail fast so cron noops are cheap (~30s):

1. **Overlap lock.** Check for a remote `automation/lock` branch:
   ```bash
   gh api repos/{owner}/{repo}/branches/automation/lock --jq .commit.commit.committer.date 2>/dev/null
   ```
   - If it exists and is **< 1h old**, another run is active → **exit**.
   - If it exists and is **> 1h old**, treat as a crashed run → delete it and continue.
   - If it doesn't exist, create it (commit a timestamp to an orphan ref) and continue.
2. **Work probe.** If no screen was passed as an argument:
   - `gh pr list --author @me --state open --base dev` — if an automation PR is open and **unresolved**, do NOT start a new screen. Instead jump to Step 6 (address review feedback) and exit.
   - Otherwise read the queue (Step 1). If nothing is `queued`, **exit** ("no work").
3. Always remove `automation/lock` at the end of the run (success or failure).

## Step 1: Pick the screen and read its contract

1. If `$ARGUMENTS` names a screen, use it. Otherwise pick the first screen with
   `status: queued` following the A2 order in `docs/screens/README.md`.
2. Read `docs/screens/<screen>.md` — the JTBD, current web/iOS state, and the
   **Deltas to close** checklist. This is the contract. Do not invent scope beyond it.
3. Read `docs/beta-checklist.md` for any extra per-screen notes.
4. Set the spec's status to `active` (edit the `**Status:**` line in `docs/screens/<screen>.md`).

## Step 2: Capture "before" screenshots

The harness (D4) needs a running server with Supabase env (from `web/.env.local`).

```bash
cd web && npm run dev &          # start server (staging Supabase)
# wait for http://localhost:3000 to respond, then:
npm run screenshot -- --screen <screen> --out ../.automation/shots/before
```

Capture **on the current `dev` state before editing** so "before" reflects the
baseline. (If you've already started editing, stash first, capture, then unstash.)
First run only: `npx playwright install chromium`.

## Step 3: Implement the web deltas

1. Work through the spec's **Deltas to close** checklist for **web only**.
   - Web player: `web/app/mode/[scenario]/[trackId]/session-player.tsx`
   - Explore: `web/app/explore/`
   - Track list: `web/app/mode/[scenario]/`
   - Profile: `web/app/profile/` (+ `/subscribe` page per A4)
   - Auth: `web/app/auth/`
2. Honor the locked decisions (A4 `/subscribe` page, A5 `editors_pick` column + migration).
3. Keep colors/fonts as tokens — do not hardcode new palette values (B1 color pass is the user's, still pending). Leave clean placeholders for image slots (B4).
4. Match existing code style: Tailwind only, dark theme, the conventions in `CLAUDE.md`.
5. Tick the delta checkboxes in `docs/screens/<screen>.md` as you complete each.

## Step 4: Test

1. `cd web && npm test` — all vitest suites must pass.
2. Add/extend tests for new behavior (mirror the patterns in `web/tests/`). New
   logic without coverage should not ship — see the `test-gaps` skill.
3. `npm run lint` must be clean.
4. If you added a migration, it must be ordered correctly in `supabase/migrations/`
   and idempotent-safe; note in the PR that it needs to be run in staging + prod.

## Step 5: Capture "after", upload, and open the PR

1. **After screenshots:** with the server running on your branch:
   ```bash
   npm run screenshot -- --screen <screen> --out ../.automation/shots/after
   ```
2. **Branch + commit + PR** (follow the `deploy` skill workflow): create
   `feat/screen-<name>` off `dev`, commit, push, `gh pr create --base dev`.
   - Title: `feat: modernize <screen> (web)`
   - Body: `## Summary` (deltas closed), `## Test plan`, a `## Deltas` checklist
     mirroring the spec showing done vs deferred, and the Claude Code footer.
   - Include the marker `<!-- screen: <name> -->` in the body so the loop can map
     the PR back to its screen.
3. **Upload screenshots to R2**, then embed the public URLs in a PR comment.
   **Do NOT use GitHub release assets or committed `raw` URLs** — this repo is
   **private**, so those 404 through GitHub's image proxy (camo) and render blank.
   R2 is a public bucket, so its URLs render inline (works on phone). Requires
   `CLOUDFLARE_API_TOKEN` in the env (wrangler can't use interactive OAuth in the
   autonomous loop — see Screenshot hosting & cleanup below).
   - Upload each PNG under a per-PR prefix:
     ```bash
     npx wrangler r2 object put "ragaflow-audio/screenshots/pr<N>/<name>.png" \
       --file <path> --content-type image/png --remote
     ```
   - Public URL: `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/screenshots/pr<N>/<name>.png`
   - Capture both **running** and **idle** states (the player's key deltas are in the
     running state). Post a before/after table per viewport:
     ```
     ## Before / After — <screen>
     | | Before | After |
     |---|---|---|
     | Mobile  | ![](.../before-running-mobile.png)  | ![](.../after-running-mobile.png)  |
     | Desktop | ![](.../before-running-desktop.png) | ![](.../after-running-desktop.png) |
     ```
   - Do NOT commit PNGs to the repo (`.automation/` is gitignored).
   - The D3 workflow (`pr-preview-comment.yml`) auto-posts the Vercel preview URL
     separately; don't duplicate it.
4. Set the spec status to `shipped` once the PR is open (it still needs human merge).

## Step 6: Address review feedback (next loop run)

When a prior automation PR is open with unresolved comments (auto or human):

1. Read all PR review comments: `gh pr view <n> --comments`.
2. Address each in follow-up commits on the same branch; push (PR updates).
3. Re-run tests, re-capture "after" screenshots if the UI changed, update the
   screenshot comment.
4. Reply to each thread noting how it was addressed. **Never merge** — the human
   merges from GitHub. After pushing fixes, exit.

## Step 7: Queue the iOS follow-up (A3)

After the web PR is opened (web leads), create the iOS catch-up item so it isn't
lost — open a tracking issue (or a stub `feat/screen-<name>-ios` branch) titled
`iOS catch-up: <screen>` referencing the web PR and the same spec deltas. iOS is
tested post-merge to `dev` (C3), so it does not gate the web PR.

## Notes

- **Web only per PR.** Never block the web change on iOS.
- **One screen per run.** Don't batch screens into one PR.
- **Never merge.** Push branches, open PRs, address comments — the human merges to `dev`; `dev` → `main` is also human.
- **Always release the `automation/lock`** at the end, even on failure.
- **Stay inside the spec.** The deltas in `docs/screens/<screen>.md` are the scope; surface anything bigger as a note in the PR rather than expanding the diff.
- If Supabase env is missing locally, screenshots render empty — fix `web/.env.local` before capturing (see `CLAUDE.md` → Supabase setup).
