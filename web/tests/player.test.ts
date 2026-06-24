import { describe, it, expect } from "vitest";
import { sleepFadeVolume, progressFraction, SLEEP_FADE_SECONDS } from "@/lib/player";

describe("sleepFadeVolume", () => {
  it("is full volume for non-sleep scenarios regardless of remaining", () => {
    expect(sleepFadeVolume("focus", 0)).toBe(1);
    expect(sleepFadeVolume("focus", 30)).toBe(1);
    expect(sleepFadeVolume("meditate", 5)).toBe(1);
  });

  it("is full volume for sleep before the fade window", () => {
    expect(sleepFadeVolume("sleep", SLEEP_FADE_SECONDS)).toBe(1);
    expect(sleepFadeVolume("sleep", SLEEP_FADE_SECONDS + 100)).toBe(1);
  });

  it("ramps down linearly inside the sleep fade window", () => {
    expect(sleepFadeVolume("sleep", 60)).toBeCloseTo(0.5, 5);
    expect(sleepFadeVolume("sleep", 30)).toBeCloseTo(0.25, 5);
  });

  it("is silent at and below zero remaining for sleep", () => {
    expect(sleepFadeVolume("sleep", 0)).toBe(0);
    expect(sleepFadeVolume("sleep", -10)).toBe(0);
  });

  it("respects a custom fade window", () => {
    expect(sleepFadeVolume("sleep", 30, 60)).toBeCloseTo(0.5, 5);
    expect(sleepFadeVolume("sleep", 60, 60)).toBe(1);
  });
});

describe("progressFraction", () => {
  it("returns 0 at the start of a session", () => {
    expect(progressFraction(1500, 1500)).toBe(0);
  });

  it("returns 0.5 at the halfway point", () => {
    expect(progressFraction(1500, 750)).toBeCloseTo(0.5, 5);
  });

  it("returns 1 when complete", () => {
    expect(progressFraction(1500, 0)).toBe(1);
  });

  it("clamps to [0,1] for out-of-range remaining", () => {
    expect(progressFraction(1500, 2000)).toBe(0);
    expect(progressFraction(1500, -50)).toBe(1);
  });

  it("returns 0 for a non-positive total", () => {
    expect(progressFraction(0, 0)).toBe(0);
    expect(progressFraction(-1, 0)).toBe(0);
  });
});
