import type { Scenario } from "@/lib/types";

export type ScenarioConfig = {
  key: Scenario;
  label: string;
  subtitle: string;
  accent: {
    text: string;
    border: string;
    borderHover: string;
    bg: string;
  };
};

export const scenarios: ScenarioConfig[] = [
  {
    key: "focus",
    label: "Focus",
    subtitle: "Sharpen your mind with ragas for deep work",
    accent: {
      text: "text-[#D4A24E]",
      border: "border-[#D4A24E]/30",
      borderHover: "hover:border-[#D4A24E]/50",
      bg: "bg-[#D4A24E]",
    },
  },
  {
    key: "sleep",
    label: "Sleep",
    subtitle: "Drift into rest with soothing evening ragas",
    accent: {
      text: "text-[#B07D7D]",
      border: "border-[#B07D7D]/30",
      borderHover: "hover:border-[#B07D7D]/50",
      bg: "bg-[#B07D7D]",
    },
  },
  {
    key: "meditate",
    label: "Meditate",
    subtitle: "Find stillness with ragas for contemplation",
    accent: {
      text: "text-[#92B892]",
      border: "border-[#92B892]/30",
      borderHover: "hover:border-[#92B892]/50",
      bg: "bg-[#92B892]",
    },
  },
];

export const scenarioMap: Record<Scenario, ScenarioConfig> = Object.fromEntries(
  scenarios.map((s) => [s.key, s])
) as Record<Scenario, ScenarioConfig>;

export const validScenarios = scenarios.map((s) => s.key);
