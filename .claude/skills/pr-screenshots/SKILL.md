---
name: pr-screenshots
description: "Capture screenshots of the changed surface running (web via Playwright, iOS via simulator) and attach them to a PR. Run by default for every PR that touches UI; invoked automatically by the deploy skill."
---

# PR Screenshots

Every PR that changes UI should show the change **running** — web screens via the
Next.js dev server, iOS screens via the simulator. This skill detects which
surface changed, captures the relevant screens, hosts them on the public R2
bucket, and posts them as a PR comment.

This is the default for PRs with UI changes. The `deploy` skill calls it
automatically; you can also run it standalone against an open PR.

## Arguments

- `$ARGUMENTS` — optional. A PR number and/or an explicit screen list, e.g.
  `54 player` or `55 home`. If omitted, infer the PR from the current branch
  (`gh pr view --json number`) and the screens from the diff (Step 2).

## Step 0: Preconditions

- An open PR for the current branch (`gh pr view`). If none, open one first
  (use the `deploy` skill) — screenshots attach to a PR comment.
- Supabase must be populated, or screens render empty:
  - **Web:** `web/.env.local` present (see CLAUDE.md → Supabase setup).
  - **iOS:** `ios/Ragaflow/Configuration/Debug.xcconfig` pointing at production
    (it does as of 2026-06-24).
- **R2 hosting** needs `CLOUDFLARE_API_TOKEN`. It's in `web/.env.local`:
  ```bash
  export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' web/.env.local | cut -d= -f2- | tr -d '"')
  ```

## Step 1: Determine which surface(s) changed

```bash
git diff --name-only origin/dev...HEAD
```

- Paths under `web/` → **web** surface.
- Paths under `ios/` → **iOS** surface.
- Both → capture both.
- Neither touches UI (docs/config/tests only) → skip; tell the user no UI
  changed so no screenshots were captured.

## Step 2: Map changed files → screens

Only capture screens whose code actually changed (plus `home` as a safe default
if the mapping is ambiguous). Both surfaces use the same screen names.

| Changed path contains | Screen |
|---|---|
| `Home/`, `page.tsx` (root), `ScenarioCard`, `tonight-invitation`, `time-of-day` | `home` |
| `auth` | `auth` *(web only)* |
| `Scenarios/`, `mode/[scenario]/page`, `track-list` | `track-list` |
| `Player/`, `session-player`, `SessionPlayer` | `player` |
| `Explore/`, `explore` | `explore` |
| `Profile/`, `profile`, `subscribe` | `profile` |

Shared components (e.g. a card used everywhere) → capture `home` plus the most
affected screen. When unsure, capture more rather than fewer.

## Step 3: Capture

### Web

```bash
cd web
npm run dev &                       # starts on http://localhost:3000 (prod Supabase)
# wait until the server responds, then per screen:
npm run screenshot -- --screen <screen> --out /tmp/web-shots
# repeat for each changed screen, or --all
kill %1                             # stop the dev server when done
```

`scripts/screenshot.mjs` captures **mobile + desktop** widths. Valid screens:
`home, auth, explore, track-list, player, profile`. First run only:
`npx playwright install chromium`.

### iOS

```bash
ios/scripts/screenshot.sh --screen <screen> --out /tmp/ios-shots
# or: ios/scripts/screenshot.sh --all --out /tmp/ios-shots
# profile is auth-gated — add --sign-in to capture it
```

`ios/scripts/screenshot.sh` boots/uses a simulator, runs the matching
`RagaflowUITests/ScreenshotTests` method, and extracts the PNGs. Valid screens:
`home, track-list, player, explore, profile`. The `player` screen yields two
files (`player-idle.png`, `player-running.png`). Auto-picks a booted simulator,
else the first available iPhone (override with `--device <udid|name>`).

**Sanity-check every PNG before uploading** (Read the image): if a screen is
blank, Supabase env is wrong — fix it and recapture, don't post empty shots.

## Step 4: Host on R2 (NOT GitHub release assets)

The repo is **private**, so GitHub release/raw URLs 404 through GitHub's camo
image proxy and render blank. Use the public R2 bucket instead.

```bash
export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' web/.env.local | cut -d= -f2- | tr -d '"')
cd web
# per file, under a per-PR prefix (prefix with platform when both surfaces exist):
npx wrangler r2 object put "ragaflow-audio/screenshots/pr<N>/<name>.png" \
  --file <path> --content-type image/png --remote
```

Public URL: `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/screenshots/pr<N>/<name>.png`

A lifecycle rule expires everything under `screenshots/` after 14 days, so no
cleanup is required (see the `modernize-screen` skill for the rule + per-merge
sweep). Never commit PNGs to the repo.

## Step 5: Post the PR comment

Embed the R2 URLs in one comment. Prefer a table for multi-state/multi-viewport.

- Use `gh pr comment <N> --body "..."`.
- If this skill already posted a screenshot comment on this PR, update it with
  `gh pr comment <N> --edit-last` instead of stacking a new one.
- Note the platform, device/viewport, and any important state in the comment.

Example (iOS player):

```markdown
## iOS simulator screenshots

Captured on iPhone 16 Pro via `ScreenshotTests` (Debug → production Supabase).

| Idle | Running |
|---|---|
| ![idle](.../pr<N>/player-idle.png) | ![running](.../pr<N>/player-running.png) |
```

## Notes

- The web `pr-preview-comment.yml` workflow auto-posts the Vercel **preview URL**
  separately — that's a live link, not a screenshot; this skill complements it.
- Screenshots are **read-only**: load pages, don't seed/mutate prod rows to
  populate a shot.
- Capture stateful screens in their meaningful state (e.g. the player **running**,
  not just idle — the timer/ring deltas only show while running).
