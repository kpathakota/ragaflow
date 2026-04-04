import { describe, it, expect } from "vitest";
import {
  scenarios,
  scenarioMap,
  validScenarios,
} from "@/components/scenario-config";
import type { Scenario } from "@/lib/types";

describe("scenario-config", () => {
  it("defines exactly 3 primary scenarios", () => {
    expect(scenarios).toHaveLength(3);
  });

  it("has focus, sleep, meditate as valid scenarios", () => {
    expect(validScenarios).toEqual(["focus", "sleep", "meditate"]);
  });

  it("each scenario has required accent colors", () => {
    for (const s of scenarios) {
      expect(s.accent).toHaveProperty("text");
      expect(s.accent).toHaveProperty("border");
      expect(s.accent).toHaveProperty("borderHover");
      expect(s.accent).toHaveProperty("bg");
    }
  });

  it("scenarioMap maps keys correctly", () => {
    const keys: Scenario[] = ["focus", "sleep", "meditate"];
    for (const key of keys) {
      expect(scenarioMap[key]).toBeDefined();
      expect(scenarioMap[key].key).toBe(key);
    }
  });

  it("focus uses warm amber/gold accent", () => {
    expect(scenarioMap.focus.accent.bg).toContain("D4A054");
  });

  it("sleep uses plum/mauve accent", () => {
    expect(scenarioMap.sleep.accent.bg).toContain("8B6F8E");
  });

  it("meditate uses sage/olive accent", () => {
    expect(scenarioMap.meditate.accent.bg).toContain("9CAF88");
  });

  it("each scenario has a label and subtitle", () => {
    for (const s of scenarios) {
      expect(s.label).toBeTruthy();
      expect(s.subtitle).toBeTruthy();
    }
  });
});
