"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { Track, Ragam } from "@/lib/types";
import { TrackCard } from "@/components/track-card";
import { useAuth } from "@/lib/auth/auth-context";
import { getPreferencesClient, toggleFavoriteTrackClient } from "@/lib/favorites";

export function ExploreClient({
  tracks,
  ragams,
}: {
  tracks: Track[];
  ragams: Ragam[];
}) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
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

  // Check if tags container overflows beyond 2 rows (~72px)
  const COLLAPSED_HEIGHT = 72;
  useEffect(() => {
    const el = tagsContainerRef.current;
    if (el) {
      setNeedsCollapse(el.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, [allTags]);

  // Filter tracks
  const filtered = useMemo(() => {
    if (!selectedTag) return tracks;
    return tracks.filter((t) => t.tags.includes(selectedTag));
  }, [tracks, selectedTag]);

  // Group by ragam
  const ragamMap = useMemo(() => {
    const map = new Map<string, Ragam>();
    ragams.forEach((r) => map.set(r.id, r));
    return map;
  }, [ragams]);

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
      {/* Tag filter */}
      <div className="mb-6">
        <div
          ref={tagsContainerRef}
          className="flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{
            maxHeight: tagsExpanded || !needsCollapse ? "none" : `${COLLAPSED_HEIGHT}px`,
          }}
        >
          <button
            onClick={() => setSelectedTag(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedTag === null
                ? "bg-[#C4885A] text-white"
                : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-[#C4885A] text-white"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {needsCollapse && (
          <button
            onClick={() => setTagsExpanded((prev) => !prev)}
            className="mt-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            {tagsExpanded ? "Show fewer tags" : "Show all tags"}
          </button>
        )}
      </div>

      {/* Grouped by ragam */}
      {grouped.map(({ ragam, tracks: groupTracks }) => (
        <section key={ragam.id} className="mb-8">
          <h2 className="mb-1 text-lg font-medium text-stone-200">
            {ragam.name}
          </h2>
          <p className="mb-3 text-xs text-stone-500">{ragam.description}</p>
          <div className="flex flex-col gap-3">
            {groupTracks.map((t) => (
              <TrackCard
                key={t.id}
                track={t}
                scenario={t.scenarios[0]}
                favoriteTrackIds={favoriteIds}
                onToggleFavorite={user ? handleToggleFavorite : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      {grouped.length === 0 && (
        <p className="text-sm text-stone-500">No tracks match this filter.</p>
      )}
    </>
  );
}
