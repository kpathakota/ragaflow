---
name: cleanup-branches
description: "Clean up git branches: delete merged/stale local and remote branches, remove orphaned worktrees, prune remote refs. Leaves only dev and main."
---

# Branch Cleanup

Removes all merged, stale, and orphaned branches — local and remote — leaving only `dev` and `main`.

## Arguments

- `$ARGUMENTS` — optional: `--dry-run` to list what would be deleted without deleting.

## Step 1: Inventory

1. Run `git fetch --prune origin` to sync remote tracking refs.
2. Run `git branch -a` to list all local and remote branches.
3. Run `git worktree list` to find any orphaned worktrees.
4. Categorize branches:
   - **Keep**: `dev`, `main`, and their remote counterparts.
   - **Delete candidates**: everything else.

## Step 2: Check for unmerged work

For each delete candidate:
1. Run `git log --oneline dev..<branch>` to check for commits not in `dev`.
2. If unmerged commits exist, check if a PR was merged on GitHub: `gh pr list --head <branch> --state merged`.
3. Classify each branch as:
   - **Safe to delete**: no unmerged commits, or PR already merged.
   - **Has unmerged work**: commits exist that aren't in `dev` and no merged PR found.

## Step 3: Present findings

Show the user a table:

| Branch | Type | Status | Action |
|--------|------|--------|--------|
| ... | local/remote | safe / has unmerged work | delete / needs decision |

If `--dry-run` was passed, stop here.

If any branches have unmerged work, ask the user what to do before proceeding.

## Step 4: Clean up worktrees

For each orphaned worktree (not the main working directory):
1. Run `git worktree remove <path> --force`.
2. The worktree branch will be deleted in the next step.

## Step 5: Delete branches

1. Delete local branches: `git branch -d <branch>` for merged, `git branch -D <branch>` for force-deletes the user approved.
2. Delete remote branches in a single push: `git push origin --delete <branch1> <branch2> ...`
3. Run `git fetch --prune origin` again to clean up any remaining stale refs.

## Step 6: Verify

1. Run `git branch -a` and confirm only `dev`, `main`, and their remote counterparts remain.
2. Run `git worktree list` and confirm only the main working directory exists.
3. Report the final state to the user.
