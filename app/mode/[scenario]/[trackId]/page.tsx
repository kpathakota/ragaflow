import { notFound } from "next/navigation";
import { getTrackById } from "@/lib/data";
import { validScenarios } from "@/components/scenario-config";
import { SessionPlayer } from "./session-player";
import type { Scenario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ scenario: string; trackId: string }>;
}) {
  const { scenario, trackId } = await params;

  if (!validScenarios.includes(scenario as Scenario)) notFound();

  const track = await getTrackById(trackId);
  if (!track) notFound();

  return <SessionPlayer track={track} scenario={scenario as Scenario} />;
}
