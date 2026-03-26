import { createClient } from "@/lib/supabase/client";
import { ensureRasika } from "@/lib/ensure-rasika";
import type { Rasika } from "@/lib/types";

export async function getPreferencesClient(): Promise<Rasika | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("rasikas")
    .select("*")
    .eq("rasika_id", user.id)
    .single();

  return (data as Rasika) ?? null;
}

export async function toggleFavoriteTrackClient(
  trackId: string
): Promise<string[] | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const prefs = await ensureRasika(supabase, user.id);
  const current = prefs.favorite_tracks ?? [];
  const updated = current.includes(trackId)
    ? current.filter((id) => id !== trackId)
    : [...current, trackId];

  await supabase
    .from("rasikas")
    .update({ favorite_tracks: updated })
    .eq("rasika_id", user.id);

  return updated;
}

export async function toggleFavoriteRagamClient(
  ragamId: string
): Promise<string[] | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const prefs = await ensureRasika(supabase, user.id);
  const current = prefs.favorite_ragams ?? [];
  const updated = current.includes(ragamId)
    ? current.filter((id) => id !== ragamId)
    : [...current, ragamId];

  await supabase
    .from("rasikas")
    .update({ favorite_ragams: updated })
    .eq("rasika_id", user.id);

  return updated;
}
