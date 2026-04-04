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
      text: "text-[#D4A054]",
      border: "border-[#D4A054]/30",
      borderHover: "hover:border-[#D4A054]/50",
      bg: "bg-[#D4A054]",
    },
  },
  {
    key: "sleep",
    label: "Sleep",
    subtitle: "Drift into rest with soothing evening ragas",
    accent: {
      text: "text-[#8B6F8E]",
      border: "border-[#8B6F8E]/30",
      borderHover: "hover:border-[#8B6F8E]/50",
      bg: "bg-[#8B6F8E]",
    },
  },
  {
    key: "meditate",
    label: "Meditate",
    subtitle: "Find stillness with ragas for contemplation",
    accent: {
      text: "text-[#9CAF88]",
      border: "border-[#9CAF88]/30",
      borderHover: "hover:border-[#9CAF88]/50",
      bg: "bg-[#9CAF88]",
    },
  },
];

export const scenarioMap: Record<Scenario, ScenarioConfig> = Object.fromEntries(
  scenarios.map((s) => [s.key, s])
) as Record<Scenario, ScenarioConfig>;

export const validScenarios = scenarios.map((s) => s.key);
