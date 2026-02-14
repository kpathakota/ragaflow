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
      text: "text-blue-400",
      border: "border-blue-500/40",
      borderHover: "hover:border-blue-400/60",
      bg: "bg-blue-500",
    },
  },
  {
    key: "sleep",
    label: "Sleep",
    subtitle: "Drift into rest with soothing evening ragas",
    accent: {
      text: "text-indigo-400",
      border: "border-indigo-500/40",
      borderHover: "hover:border-indigo-400/60",
      bg: "bg-indigo-500",
    },
  },
  {
    key: "meditate",
    label: "Meditate",
    subtitle: "Find stillness with ragas for contemplation",
    accent: {
      text: "text-amber-400",
      border: "border-amber-500/40",
      borderHover: "hover:border-amber-400/60",
      bg: "bg-amber-500",
    },
  },
];

export const scenarioMap: Record<Scenario, ScenarioConfig> = Object.fromEntries(
  scenarios.map((s) => [s.key, s])
) as Record<Scenario, ScenarioConfig>;

export const validScenarios = scenarios.map((s) => s.key);
