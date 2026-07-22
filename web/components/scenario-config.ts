import type { Scenario } from "@/lib/types";

export type ScenarioConfig = {
  key: Scenario;
  label: string;
  subtitle: string;
  accent: {
    hex: string;
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
      hex: "#C9A54C",
      text: "text-[#C9A54C]",
      border: "border-[#C9A54C]/30",
      borderHover: "hover:border-[#C9A54C]/50",
      bg: "bg-[#C9A54C]",
    },
  },
  {
    key: "sleep",
    label: "Sleep",
    subtitle: "Drift into rest with soothing evening ragas",
    accent: {
      hex: "#B08878",
      text: "text-[#B08878]",
      border: "border-[#B08878]/30",
      borderHover: "hover:border-[#B08878]/50",
      bg: "bg-[#B08878]",
    },
  },
  {
    key: "meditate",
    label: "Meditate",
    subtitle: "Find stillness with ragas for contemplation",
    accent: {
      hex: "#8A9B72",
      text: "text-[#8A9B72]",
      border: "border-[#8A9B72]/30",
      borderHover: "hover:border-[#8A9B72]/50",
      bg: "bg-[#8A9B72]",
    },
  },
];

export const scenarioMap: Record<Scenario, ScenarioConfig> = Object.fromEntries(
  scenarios.map((s) => [s.key, s])
) as Record<Scenario, ScenarioConfig>;

export const validScenarios = scenarios.map((s) => s.key);
