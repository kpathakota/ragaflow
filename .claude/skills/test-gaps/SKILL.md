---
name: test-gaps
description: "Analyze code diffs for test coverage gaps, write tests to fill them, then self-critique and fix before opening a PR."
---

# Test Gap Analysis & Coverage

Identifies untested code in a diff range, writes tests, self-critiques for quality, fixes issues, and opens a PR.

## Arguments

- `$ARGUMENTS` — optional: a git range like `main..dev` or a PR number. Defaults to `main..dev`.

## Step 1: Identify the diff

1. Parse `$ARGUMENTS`:
   - If a PR number (e.g., `#42`): use `gh pr diff <number>` to get the changes.
   - If a git range (e.g., `main..dev`): use `git diff <range>`.
   - If empty: default to `main..dev`.
2. List all changed source files (exclude test files, configs, docs, lockfiles).

## Step 2: Analyze coverage gaps

For each changed source file:
1. Read the source file to understand the full component/module.
2. Search for existing test files covering it (check `tests/`, `__tests__/`, and co-located `*.test.*` files).
3. Identify specific gaps:
   - New functions/components with no tests.
   - Changed behavior (conditionals, state transitions) not covered by existing tests.
   - New props/parameters not exercised.
   - Edge cases in new code paths.

## Step 3: Rank and present findings

Present a ranked list of gaps to the user:

| Priority | File | Gap | Why it matters |
|----------|------|-----|----------------|
| HIGH | ... | ... | ... |
| MEDIUM | ... | ... | ... |
| LOW | ... | ... | ... |

Wait for user approval before writing tests. The user may adjust priorities or skip items.

## Step 4: Write tests

For each approved gap:
1. Follow the existing test patterns in the repo (framework, mocking style, file naming).
2. Use behavioral assertions (aria-labels, text content, callback invocations) — never assert on CSS class names or DOM structure.
3. Ensure test isolation: no shared mutable state, `beforeEach` cleanup, no test ordering dependencies.
4. Name tests to describe behavior, not implementation (e.g., "redirects guest to auth on favorite click" not "calls router.push with /auth").

## Step 5: Run tests

1. Run the full test suite and confirm all tests pass.
2. Run the build (`next build` or equivalent) to confirm no type errors.
3. If any tests fail, fix them and re-run.

## Step 6: Self-critique

Send an agent to review the new tests for:
- **False positives**: tests that pass but don't verify what they claim.
- **Brittle assertions**: tests that break on innocent refactors (class names, DOM structure, exact copy).
- **Missing edge cases**: obvious scenarios the tests should cover but don't.
- **Mock correctness**: mocks that leak, don't match real signatures, or mask bugs.
- **Redundancy**: tests duplicating existing coverage.

## Step 7: Fix critique issues

Address every actionable item from the critique:
1. Remove or rewrite false positives.
2. Replace brittle assertions with behavioral ones.
3. Add missing edge cases.
4. Fix mock issues.
5. Re-run the full test suite to confirm everything passes.

## Step 8: Open PR

1. Create a branch (`test/<descriptive-name>`), commit, and push.
2. Open a PR against `dev` with:
   - Summary listing new test files and counts.
   - What gaps were covered.
   - Test plan confirming suite passes.
3. Wait for CI checks to pass.
4. Report the PR URL to the user.
