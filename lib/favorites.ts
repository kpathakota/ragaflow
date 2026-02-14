import { createClient } from "@/lib/supabase/client";
import type { RasikaPreferences } from "@/lib/types";

export async function getPreferencesClient(): Promise<RasikaPreferences | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("rasika_preferences")
    .select("*")
    .eq("rasika_id", user.id)
    .single();

  return (data as RasikaPreferences) ?? null;
}

async function ensurePreferences(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string
): Promise<RasikaPreferences> {
  const { data: existing } = await supabase
    .from("rasika_preferences")
    .select("*")
    .eq("rasika_id", userId)
    .single();

  if (existing) return existing as RasikaPreferences;

  const { data: created } = await supabase
    .from("rasika_preferences")
    .insert({ rasika_id: userId })
    .select()
    .single();

  return created as RasikaPreferences;
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

  const prefs = await ensurePreferences(supabase, user.id);
  const current = prefs.favorite_tracks ?? [];
  const updated = current.includes(trackId)
    ? current.filter((id) => id !== trackId)
    : [...current, trackId];

  await supabase
    .from("rasika_preferences")
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

  const prefs = await ensurePreferences(supabase, user.id);
  const current = prefs.favorite_ragams ?? [];
  const updated = current.includes(ragamId)
    ? current.filter((id) => id !== ragamId)
    : [...current, ragamId];

  await supabase
    .from("rasika_preferences")
    .update({ favorite_ragams: updated })
    .eq("rasika_id", user.id);

  return updated;
}
