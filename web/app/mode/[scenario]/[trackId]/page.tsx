import { notFound } from "next/navigation";
import { getTrackById, getRagamById } from "@/lib/data";
import { validScenarios } from "@/components/scenario-config";
import { SessionPlayer } from "./session-player";
import type { Scenario } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenario: string; trackId: string }>;
  searchParams: Promise<{ d?: string; autoplay?: string; from?: string }>;
}) {
  const { scenario, trackId } = await params;
  const { d, autoplay, from } = await searchParams;

  if (!validScenarios.includes(scenario as Scenario)) notFound();

  const track = await getTrackById(trackId);
  if (!track) notFound();

  const ragam = await getRagamById(track.ragam_id);
  const initialDuration = d ? parseInt(d, 10) : undefined;

  // Back returns to wherever the player was opened from. Explore links carry
  // ?from=explore; everything else falls back to the scenario track list.
  const backHref = from === "explore" ? "/explore" : `/mode/${scenario}`;

  return (
    <SessionPlayer
      track={track}
      ragam={ragam}
      scenario={scenario as Scenario}
      initialDuration={initialDuration && !isNaN(initialDuration) ? initialDuration : undefined}
      autoplay={autoplay === "1"}
      backHref={backHref}
    />
  );
}
