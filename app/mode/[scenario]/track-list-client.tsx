"use client";

import { useEffect, useState, useCallback } from "react";
import type { Track, Scenario } from "@/lib/types";
import { TrackCard } from "@/components/track-card";
import { useAuth } from "@/lib/auth/auth-context";
import { getPreferencesClient, toggleFavoriteTrackClient } from "@/lib/favorites";

export function TrackListClient({
  tracks,
  scenario,
}: {
  tracks: Track[];
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

  return (
    <>
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          scenario={scenario}
          favoriteTrackIds={favoriteIds}
          onToggleFavorite={user ? handleToggleFavorite : undefined}
        />
      ))}
      {tracks.length === 0 && (
        <p className="text-sm text-neutral-500">No tracks available yet.</p>
      )}
    </>
  );
}
