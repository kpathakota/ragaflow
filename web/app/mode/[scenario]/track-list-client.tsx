"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { Track, Ragam, Scenario } from "@/lib/types";
import { TrackCard } from "@/components/track-card";
import { useAuth } from "@/lib/auth/auth-context";
import { getPreferencesClient, toggleFavoriteTrackClient } from "@/lib/favorites";
import { trackEvent } from "@/lib/analytics";

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
  const hasFiredView = useRef(false);

  useEffect(() => {
    if (!hasFiredView.current) {
      hasFiredView.current = true;
      trackEvent("scenario_view", { scenario }, user?.id);
    }
  }, [scenario, user?.id]);

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

  const sorted = useMemo(() => {
    return [...tracks].sort((a, b) => {
      // Pin featured_scenarios tracks to top
      const aFeatured = a.featured_scenarios?.includes(scenario) ? 1 : 0;
      const bFeatured = b.featured_scenarios?.includes(scenario) ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;

      if (!a.recorded_date && !b.recorded_date) return 0;
      if (!a.recorded_date) return 1;
      if (!b.recorded_date) return -1;
      return b.recorded_date.localeCompare(a.recorded_date);
    });
  }, [tracks, scenario]);

  return (
    <>
      <div className="flex flex-col gap-3">
        {sorted.map((t) => (
          <TrackCard
            key={t.id}
            track={t}
            scenario={scenario}
            ragamName={ragamMap.get(t.ragam_id)?.name}
            favoriteTrackIds={favoriteIds}
            onToggleFavorite={user ? handleToggleFavorite : undefined}
            isFeatured={t.featured_scenarios?.includes(scenario)}
          />
        ))}
      </div>
      {sorted.length === 0 && (
        <p className="text-sm text-stone-500">No tracks available yet.</p>
      )}
    </>
  );
}
