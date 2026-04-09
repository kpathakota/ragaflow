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

  it("focus uses warm gold accent", () => {
    expect(scenarioMap.focus.accent.bg).toContain("C9A54C");
  });

  it("sleep uses clay rose accent", () => {
    expect(scenarioMap.sleep.accent.bg).toContain("B08878");
  });

  it("meditate uses olive sage accent", () => {
    expect(scenarioMap.meditate.accent.bg).toContain("8A9B72");
  });

  it("each scenario has a label and subtitle", () => {
    for (const s of scenarios) {
      expect(s.label).toBeTruthy();
      expect(s.subtitle).toBeTruthy();
    }
  });
});
