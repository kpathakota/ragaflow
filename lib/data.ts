import type { Scenario, Ragam, Track } from "@/lib/types";
import { ragams as seedRagams, tracks as seedTracks } from "@/content/seed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function supabaseClient() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    return await createClient();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ragams
// ---------------------------------------------------------------------------

export async function getAllRagams(): Promise<Ragam[]> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("ragams").select("*");
    if (data && data.length > 0) return data as Ragam[];
  }
  return seedRagams;
}

export async function getRagamById(id: string): Promise<Ragam | undefined> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("ragams").select("*").eq("id", id).single();
    if (data) return data as Ragam;
  }
  return seedRagams.find((r) => r.id === id);
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export async function getAllTracks(): Promise<Track[]> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("tracks").select("*");
    if (data && data.length > 0) return data as Track[];
  }
  return seedTracks;
}

export async function getTracksByScenario(scenario: Scenario): Promise<Track[]> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb
      .from("tracks")
      .select("*")
      .contains("scenarios", [scenario]);
    if (data && data.length > 0) return data as Track[];
  }
  return seedTracks.filter((t) => t.scenarios.includes(scenario));
}

export async function getTrackById(id: string): Promise<Track | undefined> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("tracks").select("*").eq("id", id).single();
    if (data) return data as Track;
  }
  return seedTracks.find((t) => t.id === id);
}
