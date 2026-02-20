"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Track, Ragam, Scenario } from "@/lib/types";
import { TrackCard } from "@/components/track-card";
import { useAuth } from "@/lib/auth/auth-context";
import { getPreferencesClient, toggleFavoriteTrackClient } from "@/lib/favorites";

export function TrackListClient({
  tracks,
  ragams,
  scenario,
}: {
  tracks: Track[];
  ragams: Ragam[];
  scenario: Scenario;
}) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

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

  const ragamMap = useMemo(() => {
    const map = new Map<string, Ragam>();
    ragams.forEach((r) => map.set(r.id, r));
    return map;
  }, [ragams]);

  const grouped = useMemo(() => {
    const byRagam = new Map<string, Track[]>();
    tracks.forEach((t) => {
      const arr = byRagam.get(t.ragam_id) || [];
      arr.push(t);
      byRagam.set(t.ragam_id, arr);
    });

    const groups: { ragam: Ragam; tracks: Track[] }[] = [];
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
  }, [tracks, ragamMap]);

  return (
    <>
      {grouped.map(({ ragam, tracks: groupTracks }) => (
        <section key={ragam.id} className="mb-8">
          <h2 className="mb-1 text-lg font-medium text-neutral-200">
            {ragam.name}
          </h2>
          <p className="mb-3 text-xs text-neutral-500">{ragam.description}</p>
          <div className="flex flex-col gap-3">
            {groupTracks.map((t) => (
              <TrackCard
                key={t.id}
                track={t}
                scenario={scenario}
                favoriteTrackIds={favoriteIds}
                onToggleFavorite={user ? handleToggleFavorite : undefined}
              />
            ))}
          </div>
        </section>
      ))}
      {grouped.length === 0 && (
        <p className="text-sm text-neutral-500">No tracks available yet.</p>
      )}
    </>
  );
}
