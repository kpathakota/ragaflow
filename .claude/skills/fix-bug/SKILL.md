---
name: fix-bug
description: "The standard protocol for fixing a bug — especially one the user caught manually. Root-cause, fix, then write a regression test that provably fails on the unfixed code and passes on the fix. Use this any time a bug is reported, not just when explicitly invoked."
---

# Bug-Fix Protocol

Whenever a bug is found — **especially one the user caught manually during testing**
— don't stop at the fix. A fix without a regression test means the same bug can
silently come back. Follow these steps every time.

## Step 1: Find the root cause (don't patch symptoms)

1. Reproduce the bug or trace it in the code until you can explain **why** it
   happens in one sentence, not just where.
2. Note what introduced it (which commit / change) when it's a regression — it
   sharpens the fix and the test.

## Step 2: Fix it

1. Make the smallest change that addresses the root cause.
2. Prefer the fix that the regression test in Step 3 can actually pin down.

## Step 3: Write a regression test that would have caught it

This is the non-negotiable part. The test must **fail on the unfixed code and
pass on the fix** — and you must *prove* it, not assume it.

1. **Write the test** targeting the exact behavior/property that broke.
2. **Prove it catches the bug:** temporarily revert the fix, run the test, and
   confirm it fails. Restore the fix and confirm it passes. (A quick `sed` swap +
   `git`-restore, or stash, works — never leave the fix reverted.)
3. If a test you'd expect to catch this **already exists and stayed green**
   through the bug, that's a signal the test type is blind to this failure mode —
   pick a different mechanism (see below) rather than adding a near-duplicate.

### Pick a test mechanism that can actually see the bug

The failure mode dictates the test type. Common traps:

- **CSS / layout / hit-testing bugs** (overlays intercepting clicks,
  `pointer-events`, z-order, overflow clipping): **jsdom can't catch these.**
  jsdom has no layout engine, and `fireEvent`/`userEvent` dispatch straight to the
  target node — an overlay that would swallow a real click is invisible to them.
  Either:
  - assert the **structural property** that broke (e.g. the overlapping element
    has `pointer-events-none`), in the existing vitest suite; or
  - write a **real-browser Playwright** check that clicks at coordinates with true
    hit-testing (heavier — needs a running server).
  Document *why* the structural assertion exists so nobody "simplifies" it into a
  `fireEvent.click` test that catches nothing. (See the player progress-ring
  regression in `web/tests/session-player.test.tsx`.)
- **Timing / async / race bugs:** use fake timers or awaited state, assert the
  ordering — not just the end state.
- **Data / serialization bugs:** test the boundary value that broke (null, 0,
  empty array, the off-by-one index), not a happy-path value.
- **Logic bugs:** prefer a pure-function unit test on the extracted helper
  (`web/lib/`), which is the cheapest and most durable guard.

## Step 4: Verify the whole suite

1. `cd web && npm test` — full suite green (new test included).
2. `npm run lint` — clean for files you touched (pre-existing unrelated lint debt
   in other files is not introduced by your change; don't fix it here).

## Step 5: Commit

1. Commit the fix and the regression test. Separate commits are fine and often
   clearer (fix first, then `test:` guard) — reference the fix commit in the test
   commit message.
2. The test commit message should state that reverting the fix makes it fail
   (proof it's a real guard), and why this test mechanism was chosen if it's
   non-obvious (e.g. "fireEvent can't catch overlay interception").
3. Follow the repo PR workflow (`deploy` skill) — branch off `dev`, PR against
   `dev`, never commit to `dev`/`main`, never merge.

## Notes

- **Every manually-caught bug gets a test.** If the user found it by hand, the
  automated suite missed it — closing that gap is the point.
- **Prove the test fails without the fix.** An unproven regression test is just a
  test; it may be asserting something the bug never touched.
- **Don't expand scope.** Fix the one bug, guard the one bug. Surface anything
  bigger you notice as a separate task (`spawn_task`) rather than growing the diff.
