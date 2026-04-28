import type { Scenario } from "@/lib/types";

export type TimeOfDay = "morning" | "midday" | "evening" | "night";

export type TimeConfig = {
  label: string;
  scenario: Scenario;
  accent: string;
  accentLight: string;
};

export const TIME_CONFIG: Record<TimeOfDay, TimeConfig> = {
  morning: { label: "This morning", scenario: "focus", accent: "#C9A54C", accentLight: "#D9B866" },
  midday: { label: "A pause", scenario: "meditate", accent: "#8A9B72", accentLight: "#A2B48A" },
  evening: { label: "Tonight", scenario: "sleep", accent: "#B08878", accentLight: "#C49C8B" },
  night: { label: "Wind down", scenario: "sleep", accent: "#B08878", accentLight: "#C49C8B" },
};

export function getTimeOfDay(hour?: number): TimeOfDay {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "midday";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export function getTimeConfig(hour?: number): TimeConfig {
  return TIME_CONFIG[getTimeOfDay(hour)];
}
