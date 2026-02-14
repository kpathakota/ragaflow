import { notFound } from "next/navigation";
import { getTracksByScenario } from "@/lib/data";
import { scenarioMap, validScenarios } from "@/components/scenario-config";
import { NavHeader } from "@/components/nav-header";
import { TrackListClient } from "./track-list-client";
import type { Scenario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario } = await params;

  if (!validScenarios.includes(scenario as Scenario)) {
    notFound();
  }

  const s = scenario as Scenario;
  const config = scenarioMap[s];
  const tracks = await getTracksByScenario(s);

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <NavHeader backHref="/" title={config.label} titleClass={config.accent.text} />

      <main className="flex w-full max-w-sm flex-col gap-3">
        <TrackListClient tracks={tracks} scenario={s} />
      </main>
    </div>
  );
}
