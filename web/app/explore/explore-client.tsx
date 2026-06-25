"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { Track, Ragam } from "@/lib/types";
import { TrackCard } from "@/components/track-card";
import { useAuth } from "@/lib/auth/auth-context";
import { getPreferencesClient, toggleFavoriteTrackClient } from "@/lib/favorites";
import {
  ACCESS_FILTERS,
  DURATION_FILTERS,
  EMPTY_FILTERS,
  activeFilterCount,
  filterTracks,
  type AccessFilter,
  type DurationFilter,
} from "@/lib/explore";

const PILL_BASE =
  "rounded-full px-3 py-1 text-xs font-medium transition-colors";
const PILL_ON = "bg-[#B8845A] text-white";
const PILL_OFF = "bg-stone-800 text-stone-300 hover:bg-stone-700";

export function ExploreClient({
  tracks,
  ragams,
}: {
  tracks: Track[];
  ragams: Ragam[];
}) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationFilter>("any");
  const [access, setAccess] = useState<AccessFilter>("all");

  const [tagsExpanded, setTagsExpanded] = useState(false);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPreferencesClient().then((prefs) => {
      if (prefs) setFavoriteIds(prefs.favorite_tracks);
    });
  }, [user]);

  const handleToggleFavorite = useCallback(
    async (trackId: string) => {
      if (!user) return;
      const updated = await toggleFavoriteTrackClient(trackId);
      if (updated) setFavoriteIds(updated);
    },
    [user]
  );

  // Collect all tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tracks.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tracks]);

  const ragamMap = useMemo(() => {
    const map = new Map<string, Ragam>();
    ragams.forEach((r) => map.set(r.id, r));
    return map;
  }, [ragams]);

  const filters = useMemo(
    () => ({ query, tag: selectedTag, duration, access }),
    [query, selectedTag, duration, access]
  );
  const activeCount = activeFilterCount(filters);

  const clearFilters = useCallback(() => {
    setQuery(EMPTY_FILTERS.query);
    setSelectedTag(EMPTY_FILTERS.tag);
    setDuration(EMPTY_FILTERS.duration);
    setAccess(EMPTY_FILTERS.access);
  }, []);

  // Check if tags container overflows beyond 2 rows (~72px)
  const COLLAPSED_HEIGHT = 72;
  useEffect(() => {
    const el = tagsContainerRef.current;
    if (el) {
      setNeedsCollapse(el.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, [allTags]);

  const filtered = useMemo(
    () => filterTracks(tracks, ragamMap, filters),
    [tracks, ragamMap, filters]
  );

  const grouped = useMemo(() => {
    const groups: { ragam: Ragam; tracks: Track[] }[] = [];
    const byRagam = new Map<string, Track[]>();
    filtered.forEach((t) => {
      const arr = byRagam.get(t.ragam_id) || [];
      arr.push(t);
      byRagam.set(t.ragam_id, arr);
    });
    byRagam.forEach((groupTracks, ragamId) => {
      const ragam = ragamMap.get(ragamId);
      if (ragam) {
        const sorted = groupTracks.sort((a, b) => {
          if (!a.recorded_date && !b.recorded_date) return 0;
          if (!a.recorded_date) return 1;
          if (!b.recorded_date) return -1;
          return b.recorded_date.localeCompare(a.recorded_date);
        });
        groups.push({ ragam, tracks: sorted });
      }
    });
    return groups;
  }, [filtered, ragamMap]);

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ragams, titles, moods…"
          aria-label="Search tracks"
          className="w-full rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-2.5 text-sm text-stone-200 placeholder:text-stone-500 transition-colors focus:border-[#B8845A] focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="mb-5 space-y-3">
        {/* Tag filter */}
        <div>
          <div
            ref={tagsContainerRef}
            className="flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{
              maxHeight: tagsExpanded || !needsCollapse ? "none" : `${COLLAPSED_HEIGHT}px`,
            }}
          >
            <button
              onClick={() => setSelectedTag(null)}
              className={`${PILL_BASE} ${selectedTag === null ? PILL_ON : PILL_OFF}`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`${PILL_BASE} ${selectedTag === tag ? PILL_ON : PILL_OFF}`}
              >
                {tag}
              </button>
            ))}
          </div>
          {needsCollapse && (
            <button
              onClick={() => setTagsExpanded((prev) => !prev)}
              className="mt-2 text-xs text-stone-400 transition-colors hover:text-stone-200"
            >
              {tagsExpanded ? "Show fewer tags" : "Show all tags"}
            </button>
          )}
        </div>

        {/* Duration + access */}
        <div className="flex flex-wrap gap-2">
          {DURATION_FILTERS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDuration(d.key)}
              className={`${PILL_BASE} ${duration === d.key ? PILL_ON : PILL_OFF}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ACCESS_FILTERS.map((a) => (
            <button
              key={a.key}
              onClick={() => setAccess(a.key)}
              className={`${PILL_BASE} ${access === a.key ? PILL_ON : PILL_OFF}`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Active filter count + clear */}
        {activeCount > 0 && (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs text-stone-500">
              {activeCount} filter{activeCount === 1 ? "" : "s"} active
            </span>
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-[#B8845A] transition-colors hover:text-[#d09e6f]"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Grouped by ragam */}
      {grouped.map(({ ragam, tracks: groupTracks }) => (
        <section key={ragam.id} className="mb-8">
          <h2 className="text-lg font-medium text-stone-200">{ragam.name}</h2>
          {ragam.time_of_day && (
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">
              {ragam.time_of_day}
            </p>
          )}
          <p className="mb-3 mt-1.5 font-serif text-[13px] italic leading-relaxed text-stone-400">
            {ragam.description}
          </p>
          <div className="flex flex-col gap-3">
            {groupTracks.map((t) => (
              <TrackCard
                key={t.id}
                track={t}
                scenario={t.scenarios[0]}
                favoriteTrackIds={favoriteIds}
                onToggleFavorite={user ? handleToggleFavorite : undefined}
                linkFrom="explore"
              />
            ))}
          </div>
        </section>
      ))}

      {grouped.length === 0 && (
        <div className="text-sm text-stone-500">
          <p>No tracks match these filters.</p>
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-2 font-medium text-[#B8845A] transition-colors hover:text-[#d09e6f]"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </>
  );
}
