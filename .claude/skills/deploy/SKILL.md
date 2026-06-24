---
name: deploy
description: "Deploy current work: create feature branch, push, open PR against dev with Vercel preview, wait for approval, then merge."
---

# Deploy Workflow

Automates the Ragaflow git workflow: feature branch → PR against `dev` → Vercel preview → human review → merge.

## Arguments

- `$ARGUMENTS` — optional commit message override. If not provided, generate one from the changes.

## Step 1: Ensure clean feature branch

1. Check `git status`. If there are uncommitted changes, stage and commit them with a descriptive message (or `$ARGUMENTS` if provided).
2. Check the current branch name:
   - If on `dev` or `main`: create a new feature branch (`feat/` or `fix/` based on changes) off the current branch, move the commits there.
   - If already on a `feat/*` or `fix/*` branch: stay on it.
3. The branch must have at least one commit ahead of `dev`.

## Step 2: Push and open PR

1. Push the branch to `origin` with `-u` flag.
2. Check if a PR already exists for this branch → `dev` using `gh pr view`.
3. If no PR exists, create one with `gh pr create --base dev`:
   - Title: short summary of changes (under 70 chars)
   - Body: `## Summary` with bullet points, `## Test plan` with checklist, and the Claude Code attribution footer.
4. Output the PR URL.

## Step 2.5: Attach screenshots (default for UI changes)

If the diff touches UI (`web/` or `ios/` view code), run the **`pr-screenshots`**
skill to capture the changed surface running (web via Playwright, iOS via the
simulator) and post them as a PR comment. This is the default — every UI PR
should show the change running, not just describe it.

Skip only when the diff is docs/config/tests with no UI change (the skill
self-detects this and no-ops). If screenshot capture fails (e.g. no simulator or
missing Supabase env), surface the failure to the user rather than silently
opening the PR without them.

## Step 3: Get Vercel preview URL

1. The Vercel preview URL follows the pattern: `https://ragaflow-git-<branch-name>-kpathakota.vercel.app` (branch name with `/` replaced by `-`).
2. Present the preview URL to the user.
3. **Important for monorepo:** Remind the user that Vercel must have Root Directory set to `web` in project settings, if this hasn't been configured yet.

## Step 4: Wait for human review

Tell the user:
- The PR URL
- The Vercel preview URL
- Ask them to review the preview and report back with approval or comments

Then **stop and wait for the user's response**. Do not proceed until the user responds.

## Step 5: Address feedback or merge

Based on the user's response:

### If the user reports issues or comments:
1. Make the requested changes
2. Commit with a descriptive message
3. Push to the same branch (the PR updates automatically)
4. Give the user the updated preview URL
5. Wait for another round of review (go back to Step 4)

### If the user approves (e.g., "looks good", "lgtm", "ship it", "merge it"):
1. Merge the PR into `dev` using `gh pr merge --squash --delete-branch`
2. Confirm the merge succeeded
3. Report the merged PR URL

## Notes

- Never push directly to `dev` or `main`
- Never merge to `main` — only merge to `dev`. The human handles `dev` → `main` separately.
- If the build fails on Vercel, check the build logs and fix before asking for review.
- The web app is in `web/` and the iOS skeleton is in `ios/` (monorepo).
