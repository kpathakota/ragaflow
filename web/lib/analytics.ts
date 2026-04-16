import { createClient } from "@/lib/supabase/client";

// One anonymous ID per tab/session — generated on module load, lives in memory
const anonymousId = crypto.randomUUID();

export type AnalyticsEventType =
  | "app_open"
  | "scenario_view"
  | "auth_error"
  | "playback_error";

export function getAnonymousId(): string {
  return anonymousId;
}

export async function trackEvent(
  eventType: AnalyticsEventType,
  metadata: Record<string, unknown> = {},
  rasikaId?: string
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  await supabase.from("analytics_events").insert({
    anonymous_id: anonymousId,
    rasika_id: rasikaId ?? null,
    event_type: eventType,
    platform: "web",
    metadata,
  });
}
