import type { Track, Ragam } from "@/lib/types";

/**
 * Pure filter/search logic for the Explore screen. Kept free of React so it can
 * be unit-tested without rendering (mirrors lib/player.ts).
 */

/** Duration buckets (minutes), chosen to match the common session lengths. */
export type DurationFilter = "any" | "short" | "medium" | "long";

export const DURATION_FILTERS: { key: DurationFilter; label: string }[] = [
  { key: "any", label: "Any length" },
  { key: "short", label: "Under 20m" },
  { key: "medium", label: "20–40m" },
  { key: "long", label: "Over 40m" },
];

/** Free vs. premium access filter. */
export type AccessFilter = "all" | "free" | "premium";

export const ACCESS_FILTERS: { key: AccessFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "premium", label: "Premium" },
];

export function trackMatchesDuration(track: Track, filter: DurationFilter): boolean {
  if (filter === "any") return true;
  const minutes = track.duration / 60;
  if (filter === "short") return minutes < 20;
  if (filter === "medium") return minutes >= 20 && minutes <= 40;
  return minutes > 40; // "long"
}

export function trackMatchesAccess(track: Track, filter: AccessFilter): boolean {
  if (filter === "all") return true;
  if (filter === "free") return track.free;
  return !track.free; // "premium"
}

/**
 * Case-insensitive substring match across the track's title, its ragam's name
 * and description, the track description, and its tags. An empty/whitespace
 * query matches everything.
 */
export function trackMatchesQuery(
  track: Track,
  ragam: Ragam | undefined,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    track.title ?? "",
    ragam?.name ?? "",
    ragam?.description ?? "",
    track.description,
    ...track.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export type ExploreFilters = {
  query: string;
  tag: string | null;
  duration: DurationFilter;
  access: AccessFilter;
};

export const EMPTY_FILTERS: ExploreFilters = {
  query: "",
  tag: null,
  duration: "any",
  access: "all",
};

export function filterTracks(
  tracks: Track[],
  ragamMap: Map<string, Ragam>,
  filters: ExploreFilters
): Track[] {
  return tracks.filter(
    (t) =>
      (filters.tag === null || t.tags.includes(filters.tag)) &&
      trackMatchesDuration(t, filters.duration) &&
      trackMatchesAccess(t, filters.access) &&
      trackMatchesQuery(t, ragamMap.get(t.ragam_id), filters.query)
  );
}

/** Count of filters set away from their default — drives the "Clear filters" badge. */
export function activeFilterCount(filters: ExploreFilters): number {
  let n = 0;
  if (filters.query.trim()) n++;
  if (filters.tag !== null) n++;
  if (filters.duration !== "any") n++;
  if (filters.access !== "all") n++;
  return n;
}
