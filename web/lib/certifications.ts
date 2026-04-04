import { createClient } from "@/lib/supabase/client";
import type { Scenario } from "@/lib/types";

// --- Tier constants ---

const TIERS = [
  { level: 1 as const, label: "Bronze", threshold: 36_000 },
  { level: 2 as const, label: "Silver", threshold: 180_000 },
  { level: 3 as const, label: "Gold", threshold: 360_000 },
  { level: 4 as const, label: "Platinum", threshold: 900_000 },
] as const;

export function getTierColor(tierLabel: string | null): {
  bar: string;
  text: string;
  label: string;
} {
  switch (tierLabel) {
    case "Bronze":
      return { bar: "bg-[#B8860B]", text: "text-[#CD9B3A]", label: "text-[#D4A054]" };
    case "Silver":
      return { bar: "bg-slate-400", text: "text-slate-400", label: "text-slate-300" };
    case "Gold":
      return { bar: "bg-yellow-500", text: "text-yellow-500", label: "text-yellow-400" };
    case "Platinum":
      return { bar: "bg-purple-400", text: "text-purple-400", label: "text-purple-300" };
    default:
      return { bar: "bg-stone-500", text: "text-stone-500", label: "text-stone-500" };
  }
}

export function getTierInfo(totalSeconds: number): {
  currentLabel: string | null;
  currentLevel: 0 | 1 | 2 | 3 | 4;
  nextLabel: string | null;
  nextThreshold: number;
  progressPercent: number;
} {
  let currentIdx = -1;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalSeconds >= TIERS[i].threshold) {
      currentIdx = i;
      break;
    }
  }

  const currentLabel = currentIdx >= 0 ? TIERS[currentIdx].label : null;
  const currentLevel = (currentIdx >= 0 ? TIERS[currentIdx].level : 0) as 0 | 1 | 2 | 3 | 4;
  const nextIdx = currentIdx + 1;
  const nextLabel = nextIdx < TIERS.length ? TIERS[nextIdx].label : null;
  const nextThreshold = nextIdx < TIERS.length ? TIERS[nextIdx].threshold : TIERS[TIERS.length - 1].threshold;

  const bandStart = currentIdx >= 0 ? TIERS[currentIdx].threshold : 0;
  const bandEnd = nextIdx < TIERS.length ? TIERS[nextIdx].threshold : TIERS[TIERS.length - 1].threshold;

  const progressPercent =
    bandEnd === bandStart
      ? 100
      : Math.min(100, Math.round(((totalSeconds - bandStart) / (bandEnd - bandStart)) * 100));

  return { currentLabel, currentLevel, nextLabel, nextThreshold, progressPercent };
}

// --- Per-session counting rules ---

export function computeCountableSeconds(
  scenario: Scenario | string,
  durationSeconds: number,
  completed: boolean
): number {
  if (scenario === "focus") {
    return completed ? durationSeconds : 0;
  }
  if (scenario === "sleep") {
    return durationSeconds;
  }
  // meditate or other
  return durationSeconds >= 300 ? durationSeconds : 0;
}

// --- Aggregate: compute progress per ragam ---

type SessionRow = {
  track_id: string;
  scenario: string;
  duration_seconds: number;
  completed: boolean | null;
};

type TrackRow = {
  id: string;
  ragam_id: string;
};

export function computeRagamProgress(
  sessions: SessionRow[],
  tracks: TrackRow[]
): Map<string, number> {
  const trackToRagam = new Map<string, string>();
  for (const t of tracks) {
    trackToRagam.set(t.id, t.ragam_id);
  }

  const progress = new Map<string, number>();

  for (const s of sessions) {
    const ragamId = trackToRagam.get(s.track_id);
    if (!ragamId) continue;

    const counted = computeCountableSeconds(
      s.scenario,
      s.duration_seconds || 0,
      s.completed ?? false
    );
    if (counted <= 0) continue;

    progress.set(ragamId, (progress.get(ragamId) ?? 0) + counted);
  }

  return progress;
}

// --- Client-side upsert ---

export async function upsertCertificationClient(
  ragamId: string,
  additionalSeconds: number
): Promise<void> {
  if (additionalSeconds <= 0) return;

  const supabase = createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Read current row
  const { data: existing } = await supabase
    .from("certifications")
    .select("id, total_seconds, level")
    .eq("rasika_id", user.id)
    .eq("ragam_id", ragamId)
    .maybeSingle();

  const newTotal = (existing?.total_seconds ?? 0) + additionalSeconds;
  const { currentLevel } = getTierInfo(newTotal);
  const newLevel = Math.max(currentLevel, existing?.level ?? 0) as 1 | 2 | 3 | 4;

  if (existing) {
    await supabase
      .from("certifications")
      .update({ total_seconds: newTotal, level: newLevel || 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("certifications").insert({
      rasika_id: user.id,
      ragam_id: ragamId,
      total_seconds: newTotal,
      level: newLevel || 1,
    });
  }
}
