import { createClient } from "@/lib/supabase/client";
import type { Scenario } from "@/lib/types";

const scenarioToTrackColumn: Record<Scenario, string> = {
  focus: "default_focus_track",
  sleep: "default_sleep_track",
  meditate: "default_meditate_track",
};

const scenarioToDurationColumn: Record<Scenario, string> = {
  focus: "default_focus_duration",
  sleep: "default_sleep_duration",
  meditate: "default_meditate_duration",
};

export async function setDefaultTrackClient(
  scenario: Scenario,
  trackId: string,
  durationSeconds?: number
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const trackColumn = scenarioToTrackColumn[scenario];
  const durationColumn = scenarioToDurationColumn[scenario];
  const updateData: Record<string, string | number | null> = {
    [trackColumn]: trackId,
    [durationColumn]: durationSeconds ?? null,
  };

  // Ensure preferences row exists
  const { data: existing } = await supabase
    .from("rasikas")
    .select("id")
    .eq("rasika_id", user.id)
    .single();

  if (existing) {
    await supabase
      .from("rasikas")
      .update(updateData)
      .eq("rasika_id", user.id);
  } else {
    await supabase
      .from("rasikas")
      .insert({ rasika_id: user.id, ...updateData });
  }

  return true;
}

export async function setCustomDurationClient(
  minutes: number
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from("rasikas")
    .select("id")
    .eq("rasika_id", user.id)
    .single();

  if (existing) {
    await supabase
      .from("rasikas")
      .update({ custom_duration: minutes })
      .eq("rasika_id", user.id);
  } else {
    await supabase
      .from("rasikas")
      .insert({ rasika_id: user.id, custom_duration: minutes });
  }

  return true;
}
