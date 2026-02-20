"use client";

import Link from "next/link";
import type { Track, Scenario } from "@/lib/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useCallback, useState } from "react";

type TrackCardProps = {
  track: Track;
  scenario: Scenario;
  favoriteTrackIds?: string[];
  onToggleFavorite?: (trackId: string) => void;
};

export function TrackCard({
  track,
  scenario,
  favoriteTrackIds = [],
  onToggleFavorite,
}: TrackCardProps) {
  const { user } = useAuth();
  const [animating, setAnimating] = useState(false);
  const isFavorite = favoriteTrackIds.includes(track.id);

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onToggleFavorite) {
        setAnimating(true);
        onToggleFavorite(track.id);
        setTimeout(() => setAnimating(false), 200);
      }
    },
    [onToggleFavorite, track.id]
  );

  const durationMin = Math.round(track.duration / 60);

  const dateLabel = track.recorded_date
    ? new Date(track.recorded_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const headline =
    dateLabel && track.location
      ? `${dateLabel} · ${track.location}`
      : dateLabel || track.location || track.title || "Untitled";

  return (
    <Link
      href={`/mode/${scenario}/${track.id}`}
      className="group flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4 transition-colors hover:border-neutral-600 hover:bg-neutral-800/60"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-200">{headline}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {durationMin} min
          {track.tags.slice(0, 3).map((tag) => (
            <span key={tag}> · {tag}</span>
          ))}
        </p>
        <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
          {track.description}
        </p>
      </div>

      {user && onToggleFavorite && (
        <button
          onClick={handleFavorite}
          className={`ml-4 shrink-0 text-xl transition-transform ${
            animating ? "scale-125" : ""
          } ${isFavorite ? "text-red-400" : "text-neutral-600 hover:text-neutral-400"}`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      )}
    </Link>
  );
}
