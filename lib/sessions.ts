import { createClient } from "@/lib/supabase/client";
import type { Scenario } from "@/lib/types";

export async function startListeningSession(
  trackId: string,
  scenario: Scenario
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("listening_sessions")
    .insert({
      rasika_id: user.id,
      track_id: trackId,
      scenario,
    })
    .select("id")
    .single();

  return data?.id ?? null;
}

export async function endListeningSession(
  sessionId: string,
  durationSeconds: number
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  await supabase
    .from("listening_sessions")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", sessionId);
}
