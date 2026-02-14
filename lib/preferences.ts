import { createClient } from "@/lib/supabase/client";
import type { Scenario } from "@/lib/types";

const scenarioToColumn: Record<Scenario, string> = {
  focus: "default_focus_track",
  sleep: "default_sleep_track",
  meditate: "default_meditate_track",
};

export async function setDefaultTrackClient(
  scenario: Scenario,
  trackId: string
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const column = scenarioToColumn[scenario];

  // Ensure preferences row exists
  const { data: existing } = await supabase
    .from("rasika_preferences")
    .select("id")
    .eq("rasika_id", user.id)
    .single();

  if (existing) {
    await supabase
      .from("rasika_preferences")
      .update({ [column]: trackId })
      .eq("rasika_id", user.id);
  } else {
    await supabase
      .from("rasika_preferences")
      .insert({ rasika_id: user.id, [column]: trackId });
  }

  return true;
}
