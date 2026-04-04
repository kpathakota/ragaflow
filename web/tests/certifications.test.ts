import { describe, it, expect } from "vitest";
import {
  getTierInfo,
  getTierColor,
  computeCountableSeconds,
  computeRagamProgress,
} from "@/lib/certifications";

// -----------------------------------------------------------------------
// getTierInfo
// -----------------------------------------------------------------------
describe("getTierInfo", () => {
  it("returns no tier for 0 seconds", () => {
    const info = getTierInfo(0);
    expect(info.currentLabel).toBeNull();
    expect(info.currentLevel).toBe(0);
    expect(info.nextLabel).toBe("Bronze");
  });

  it("returns Bronze at 10 hours (36000s)", () => {
    const info = getTierInfo(36_000);
    expect(info.currentLabel).toBe("Bronze");
    expect(info.currentLevel).toBe(1);
    expect(info.nextLabel).toBe("Silver");
  });

  it("returns Silver at 50 hours (180000s)", () => {
    const info = getTierInfo(180_000);
    expect(info.currentLabel).toBe("Silver");
    expect(info.currentLevel).toBe(2);
    expect(info.nextLabel).toBe("Gold");
  });

  it("returns Gold at 100 hours (360000s)", () => {
    const info = getTierInfo(360_000);
    expect(info.currentLabel).toBe("Gold");
    expect(info.currentLevel).toBe(3);
    expect(info.nextLabel).toBe("Platinum");
  });

  it("returns Platinum at 250 hours (900000s)", () => {
    const info = getTierInfo(900_000);
    expect(info.currentLabel).toBe("Platinum");
    expect(info.currentLevel).toBe(4);
    expect(info.nextLabel).toBeNull();
    expect(info.progressPercent).toBe(100);
  });

  it("calculates progress within a tier band", () => {
    // Halfway between 0 and Bronze (36000)
    const info = getTierInfo(18_000);
    expect(info.currentLabel).toBeNull();
    expect(info.progressPercent).toBe(50);
  });

  it("progress is 0 at start of a band", () => {
    // Just reached Bronze, progress toward Silver starts at 0%
    const info = getTierInfo(36_000);
    expect(info.progressPercent).toBe(0);
  });

  it("handles values between tiers", () => {
    // Between Bronze (36000) and Silver (180000)
    const info = getTierInfo(108_000);
    expect(info.currentLabel).toBe("Bronze");
    expect(info.nextLabel).toBe("Silver");
    expect(info.progressPercent).toBe(50);
  });

  it("returns 100% progress when Platinum is reached", () => {
    const info = getTierInfo(1_200_000);
    expect(info.currentLabel).toBe("Platinum");
    expect(info.progressPercent).toBe(100);
  });
});

// -----------------------------------------------------------------------
// getTierColor
// -----------------------------------------------------------------------
describe("getTierColor", () => {
  it("returns warm gold colors for Bronze", () => {
    const colors = getTierColor("Bronze");
    expect(colors.bar).toContain("B8860B");
    expect(colors.text).toContain("CD9B3A");
  });

  it("returns slate colors for Silver", () => {
    const colors = getTierColor("Silver");
    expect(colors.bar).toContain("slate");
  });

  it("returns yellow colors for Gold", () => {
    const colors = getTierColor("Gold");
    expect(colors.bar).toContain("yellow");
  });

  it("returns purple colors for Platinum", () => {
    const colors = getTierColor("Platinum");
    expect(colors.bar).toContain("purple");
  });

  it("returns stone colors for null/unknown tier", () => {
    const colors = getTierColor(null);
    expect(colors.bar).toContain("stone");
  });
});

// -----------------------------------------------------------------------
// computeCountableSeconds — listening time counting rules
// -----------------------------------------------------------------------
describe("computeCountableSeconds", () => {
  describe("focus scenario", () => {
    it("counts full duration when completed", () => {
      expect(computeCountableSeconds("focus", 1500, true)).toBe(1500);
    });

    it("counts 0 when not completed (incomplete focus sessions don't count)", () => {
      expect(computeCountableSeconds("focus", 1200, false)).toBe(0);
    });
  });

  describe("sleep scenario", () => {
    it("always counts all time (falling asleep = success)", () => {
      expect(computeCountableSeconds("sleep", 3600, false)).toBe(3600);
      expect(computeCountableSeconds("sleep", 3600, true)).toBe(3600);
    });

    it("counts even short sleep sessions", () => {
      expect(computeCountableSeconds("sleep", 60, false)).toBe(60);
    });
  });

  describe("meditate scenario", () => {
    it("counts time when >= 5 minutes (300s)", () => {
      expect(computeCountableSeconds("meditate", 300, false)).toBe(300);
      expect(computeCountableSeconds("meditate", 600, true)).toBe(600);
    });

    it("does not count time when < 5 minutes", () => {
      expect(computeCountableSeconds("meditate", 299, false)).toBe(0);
      expect(computeCountableSeconds("meditate", 120, true)).toBe(0);
    });
  });

  describe("other/unknown scenario", () => {
    it("uses meditate rules (>= 5 min counts)", () => {
      expect(computeCountableSeconds("explore", 300, false)).toBe(300);
      expect(computeCountableSeconds("explore", 100, false)).toBe(0);
    });
  });
});

// -----------------------------------------------------------------------
// computeRagamProgress — aggregate sessions into per-ragam totals
// -----------------------------------------------------------------------
describe("computeRagamProgress", () => {
  const tracks = [
    { id: "track-1", ragam_id: "ragam-a" },
    { id: "track-2", ragam_id: "ragam-a" },
    { id: "track-3", ragam_id: "ragam-b" },
  ];

  it("aggregates completed focus sessions by ragam", () => {
    const sessions = [
      { track_id: "track-1", scenario: "focus", duration_seconds: 1500, completed: true },
      { track_id: "track-2", scenario: "focus", duration_seconds: 2700, completed: true },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    expect(progress.get("ragam-a")).toBe(4200);
  });

  it("does not count incomplete focus sessions", () => {
    const sessions = [
      { track_id: "track-1", scenario: "focus", duration_seconds: 1500, completed: false },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    expect(progress.has("ragam-a")).toBe(false);
  });

  it("counts all sleep sessions regardless of completion", () => {
    const sessions = [
      { track_id: "track-3", scenario: "sleep", duration_seconds: 3600, completed: false },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    expect(progress.get("ragam-b")).toBe(3600);
  });

  it("counts meditate sessions >= 5 minutes", () => {
    const sessions = [
      { track_id: "track-1", scenario: "meditate", duration_seconds: 600, completed: false },
      { track_id: "track-1", scenario: "meditate", duration_seconds: 120, completed: false },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    // Only the 600s session counts (>= 300s)
    expect(progress.get("ragam-a")).toBe(600);
  });

  it("ignores sessions with unknown track_id", () => {
    const sessions = [
      { track_id: "unknown-track", scenario: "sleep", duration_seconds: 3600, completed: true },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    expect(progress.size).toBe(0);
  });

  it("handles empty sessions array", () => {
    const progress = computeRagamProgress([], tracks);
    expect(progress.size).toBe(0);
  });

  it("handles null completed field", () => {
    const sessions = [
      { track_id: "track-1", scenario: "focus", duration_seconds: 1500, completed: null },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    // null completed treated as false → focus doesn't count
    expect(progress.has("ragam-a")).toBe(false);
  });

  it("accumulates multiple sessions for the same ragam", () => {
    const sessions = [
      { track_id: "track-1", scenario: "sleep", duration_seconds: 1800, completed: false },
      { track_id: "track-2", scenario: "sleep", duration_seconds: 1200, completed: false },
    ];
    const progress = computeRagamProgress(sessions, tracks);
    // Both tracks belong to ragam-a
    expect(progress.get("ragam-a")).toBe(3000);
  });
});
