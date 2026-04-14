---
name: feature
description: "End-to-end feature development: PM requirements gathering, Dev implementation with tests, QA review, PR with code critique, and human-gated merge."
---

# Feature Development Workflow

Orchestrates a complete feature from idea to merged PR. Runs through five phases: requirements, implementation, QA, pull request, and merge — with human checkpoints throughout.

## Arguments

- `$ARGUMENTS` — a description of the feature or change the user wants. Can be vague ("improve the session player") or specific ("add a sleep timer with fade-out"). If empty, ask the user what they'd like to build.

## Phase 1: Requirements (PM)

Act as the PM agent (read `.claude/commands/pm.md` for full context).

1. Read `docs/spec.md`, `docs/dev-design.md`, and `CLAUDE.md` to understand what exists.
2. Read the code areas relevant to `$ARGUMENTS` to understand current state.
3. Ask the user clarifying questions. Good questions to consider:
   - What problem does this solve for rasikas?
   - What's the expected behavior? Any edge cases?
   - Does this affect existing flows (scenarios, player, explore, profile)?
   - Mobile-specific concerns?
   - Any data model changes needed?
   - Should this be behind auth or available to all?
4. **Stop and wait for user answers.** Do not proceed until you have enough clarity.
5. After each round of answers, assess whether you have enough to write a plan. If not, ask follow-up questions and wait again. Repeat until satisfied.
6. Once requirements are clear, present a concise implementation plan:
   - Files to create or modify
   - Data model changes (if any)
   - Acceptance criteria (what "done" looks like)
   - Any open risks or trade-offs
7. **Ask the user to confirm the plan.** Do not proceed to Phase 2 until the user approves (e.g., "looks good", "go ahead", "approved").

## Phase 2: Implementation (Dev)

Act as the Dev agent (read `.claude/commands/dev.md` for full context).

1. Create a feature branch off `dev`: `feat/<short-name>` or `fix/<short-name>`.
2. Implement the approved plan:
   - Read every file before editing it.
   - Make focused, minimal changes — nothing beyond what was planned.
   - Follow all conventions in `CLAUDE.md`.
3. Write or update automated tests alongside the implementation:
   - Unit tests for new logic (data transforms, helpers, state).
   - Component tests for new UI (render, interaction, edge cases).
   - Update existing tests that break due to the changes.
4. Run `npm test` (vitest) from `web/` after implementation. **All tests must pass before proceeding.**
   - If tests fail, fix the issues and re-run until green.
5. Append a QA log entry to `docs/qa-log.md` (see Dev agent format).
6. Commit all changes with a clear message.

## Phase 3: QA Review

Act as the QA agent (read `.claude/commands/qa.md` for full context).

1. Read the diff of all changes made in Phase 2.
2. Assess automated test coverage:
   - Are the new/changed code paths covered?
   - Are edge cases tested (empty states, auth/no-auth, error paths)?
   - Are there interaction tests for new UI elements?
3. Flag any **testing gaps** as a numbered list, categorized:
   - **Automated gaps** — tests that should exist but don't. Be specific: which function, which scenario.
   - **Manual testing needed** — things that can't be automated (audio, layout, real device). Provide a concrete checklist.
4. If there are automated testing gaps:
   - Switch back to Dev mode and write the missing tests.
   - Run `npm test` again — all tests must pass.
   - Repeat QA assessment on the new tests until satisfied.
5. Present the final manual testing checklist to the user (they'll verify these on the preview later).

## Phase 4: Pull Request

1. Push the branch to `origin` with `-u` flag.
2. Create a PR with `gh pr create --base dev`:
   - Title: short summary (under 70 chars)
   - Body: `## Summary` with bullet points, `## Test plan` with the manual testing checklist from Phase 3, and the Claude Code attribution footer.
3. **Launch a separate agent to critique the PR** (review the diff for bugs, UX issues, accessibility, code quality, test gaps). The agent should return a numbered list of issues ranked by severity.
4. Address any critical or high-severity feedback from the review:
   - Make fixes, run tests, push to the same branch.
   - Only address items that are actual bugs, accessibility issues, or semantic mismatches. Cosmetic nits and style preferences can be noted but skipped.
5. Wait for all CI checks to pass (use `gh pr checks --watch`).
6. Present to the user:
   - The PR URL
   - The Vercel preview URL (`https://ragaflow-git-<branch>-kpathakota.vercel.app`, with `/` replaced by `-`)
   - The manual testing checklist from Phase 3
   - A summary of what the critique agent flagged and what was addressed

## Phase 5: Human Review and Merge

**Stop and wait for the user.** Do not merge automatically.

Tell the user:
> PR is ready for review. Please check the preview, run through the manual test checklist, and let me know:
> - "merge" / "lgtm" / "ship it" to merge into dev
> - Or describe any issues to fix

### If the user reports issues:
1. Make the requested changes (Dev mode)
2. Run tests — must pass
3. Commit, push to the same branch
4. Wait for checks to pass
5. Go back to waiting for user review

### If the user approves:
1. Merge the PR with `gh pr merge --merge`
2. Confirm the merge succeeded
3. Report the merged PR URL
4. Clean up: `git checkout dev && git pull origin dev`

## Rules

- Never push directly to `dev` or `main`
- Never merge to `main` — only `dev`. Human handles `dev` -> `main`.
- Never skip the human approval gate before merging
- Never proceed from Phase 1 to Phase 2 without user-confirmed plan
- If any phase hits a blocker, stop and ask the user — don't brute-force
- Keep the user informed at phase transitions with a brief status line
