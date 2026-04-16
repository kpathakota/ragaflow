import { createClient } from "@/lib/supabase/client";
import type { AnalyticsEventType } from "@/lib/types";

// One anonymous ID per tab/session — generated on module load, lives in memory
const anonymousId = crypto.randomUUID();

export type { AnalyticsEventType };

export function getAnonymousId(): string {
  return anonymousId;
}

export async function trackEvent(
  eventType: AnalyticsEventType,
  metadata: Record<string, unknown> = {},
  rasikaId?: string
): Promise<void> {
  try {
    const supabase = createClient();
    if (!supabase) return;

    const { error } = await supabase.from("analytics_events").insert({
      anonymous_id: anonymousId,
      rasika_id: rasikaId ?? null,
      event_type: eventType,
      platform: "web",
      metadata,
    });

    if (error) console.warn("[analytics]", error.message);
  } catch (e) {
    console.warn("[analytics]", e);
  }
}
