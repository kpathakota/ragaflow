import type { Scenario } from "@/lib/types";

/** Seconds over which the sleep scenario fades audio out at the end of a session
 * (ported from iOS SessionPlayerView). */
export const SLEEP_FADE_SECONDS = 120;

/**
 * Audio volume (0..1) for the current moment of a session. The `sleep` scenario
 * ramps to silence over the final `fadeSeconds`; every other scenario stays at
 * full volume. Pure so it can be unit-tested without an audio element.
 */
export function sleepFadeVolume(
  scenario: Scenario,
  remaining: number,
  fadeSeconds: number = SLEEP_FADE_SECONDS
): number {
  if (scenario !== "sleep") return 1;
  if (remaining >= fadeSeconds) return 1;
  if (remaining <= 0) return 0;
  return Math.max(0, Math.min(1, remaining / fadeSeconds));
}

/**
 * Fraction (0..1) of a session that has elapsed, for the circular progress ring.
 * Returns 0 for a non-positive total so the ring renders empty rather than NaN.
 */
export function progressFraction(totalSeconds: number, remaining: number): number {
  if (totalSeconds <= 0) return 0;
  const done = (totalSeconds - remaining) / totalSeconds;
  return Math.max(0, Math.min(1, done));
}
