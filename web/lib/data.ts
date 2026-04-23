import type { Scenario, Ragam, Track } from "@/lib/types";

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
  return [];
}

export async function getRagamById(id: string): Promise<Ragam | undefined> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("ragams").select("*").eq("id", id).single();
    if (data) return data as Ragam;
  }
  return undefined;
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
  return [];
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
  return [];
}

export async function getFeaturedTracks(): Promise<Track[]> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("tracks").select("*").eq("featured", true);
    if (data && data.length > 0) return data as Track[];
  }
  return [];
}

export async function getTrackById(id: string): Promise<Track | undefined> {
  const sb = await supabaseClient();
  if (sb) {
    const { data } = await sb.from("tracks").select("*").eq("id", id).single();
    if (data) return data as Track;
  }
  return undefined;
}
