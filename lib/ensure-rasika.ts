import { createClient } from "@/lib/supabase/client";
import type { Rasika } from "@/lib/types";

/**
 * Ensures a rasikas row exists for the given user. Selects first, inserts only
 * if missing. Safe to call on every sign-in — idempotent.
 */
export async function ensureRasika(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string
): Promise<Rasika> {
  const { data: existing } = await supabase
    .from("rasikas")
    .select("*")
    .eq("rasika_id", userId)
    .single();

  if (existing) return existing as Rasika;

  const { data: created } = await supabase
    .from("rasikas")
    .insert({ rasika_id: userId })
    .select()
    .single();

  return created as Rasika;
}
