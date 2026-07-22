import { describe, it, expect } from "vitest";
import { getTimeOfDay, getTimeConfig, TIME_CONFIG } from "@/lib/time-of-day";

describe("getTimeOfDay", () => {
  it("returns morning for hours 5–11", () => {
    expect(getTimeOfDay(5)).toBe("morning");
    expect(getTimeOfDay(8)).toBe("morning");
    expect(getTimeOfDay(11)).toBe("morning");
  });

  it("returns midday for hours 12–16", () => {
    expect(getTimeOfDay(12)).toBe("midday");
    expect(getTimeOfDay(14)).toBe("midday");
    expect(getTimeOfDay(16)).toBe("midday");
  });

  it("returns evening for hours 17–20", () => {
    expect(getTimeOfDay(17)).toBe("evening");
    expect(getTimeOfDay(19)).toBe("evening");
    expect(getTimeOfDay(20)).toBe("evening");
  });

  it("returns night for hours 21–4", () => {
    expect(getTimeOfDay(21)).toBe("night");
    expect(getTimeOfDay(23)).toBe("night");
    expect(getTimeOfDay(0)).toBe("night");
    expect(getTimeOfDay(3)).toBe("night");
    expect(getTimeOfDay(4)).toBe("night");
  });

  it("boundary: 5 is morning not night", () => {
    expect(getTimeOfDay(5)).toBe("morning");
  });

  it("boundary: 12 is midday not morning", () => {
    expect(getTimeOfDay(12)).toBe("midday");
  });

  it("boundary: 17 is evening not midday", () => {
    expect(getTimeOfDay(17)).toBe("evening");
  });

  it("boundary: 21 is night not evening", () => {
    expect(getTimeOfDay(21)).toBe("night");
  });
});

describe("TIME_CONFIG", () => {
  it("morning maps to focus scenario with correct label", () => {
    expect(TIME_CONFIG.morning.label).toBe("This morning");
    expect(TIME_CONFIG.morning.scenario).toBe("focus");
  });

  it("midday maps to meditate scenario", () => {
    expect(TIME_CONFIG.midday.label).toBe("A pause");
    expect(TIME_CONFIG.midday.scenario).toBe("meditate");
  });

  it("evening maps to sleep scenario with Tonight label", () => {
    expect(TIME_CONFIG.evening.label).toBe("Tonight");
    expect(TIME_CONFIG.evening.scenario).toBe("sleep");
  });

  it("night maps to sleep scenario with Wind down label", () => {
    expect(TIME_CONFIG.night.label).toBe("Wind down");
    expect(TIME_CONFIG.night.scenario).toBe("sleep");
  });

  it("each config has accent and accentLight hex values", () => {
    for (const config of Object.values(TIME_CONFIG)) {
      expect(config.accent).toMatch(/^#[A-Fa-f0-9]{6}$/);
      expect(config.accentLight).toMatch(/^#[A-Fa-f0-9]{6}$/);
    }
  });
});

describe("getTimeConfig", () => {
  it("returns the matching config for a given hour", () => {
    expect(getTimeConfig(8)).toEqual(TIME_CONFIG.morning);
    expect(getTimeConfig(14)).toEqual(TIME_CONFIG.midday);
    expect(getTimeConfig(19)).toEqual(TIME_CONFIG.evening);
    expect(getTimeConfig(23)).toEqual(TIME_CONFIG.night);
  });
});
