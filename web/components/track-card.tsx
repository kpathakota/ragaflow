"use client";

import Link from "next/link";
import type { Track, Scenario } from "@/lib/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useCallback, useState } from "react";

type TrackCardProps = {
  track: Track;
  scenario: Scenario;
  ragamName?: string;
  favoriteTrackIds?: string[];
  onToggleFavorite?: (trackId: string) => void;
};

export function TrackCard({
  track,
  scenario,
  ragamName,
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

  const headline = track.title
    || (dateLabel && track.location ? `${dateLabel} · ${track.location}` : null)
    || dateLabel || track.location || "Untitled";

  const subtitle = track.title
    ? [dateLabel, track.location].filter(Boolean).join(" · ") || null
    : null;

  return (
    <Link
      href={`/mode/${scenario}/${track.id}`}
      className="group flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/60 px-5 py-4 transition-colors hover:border-stone-600 hover:bg-stone-800/60"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-200">{headline}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
        )}
        <p className="mt-1 text-xs text-stone-500">
          {durationMin} min
          {ragamName && <span> · {ragamName}</span>}
          {track.tags.slice(0, 3).map((tag) => (
            <span key={tag}> · {tag}</span>
          ))}
          {!track.free && (
            <span className="ml-2 rounded-full bg-[#C9A54C]/10 px-2 py-0.5 text-[10px] font-medium text-[#C9A54C]/80">
              Premium
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-stone-500 line-clamp-2">
          {track.description}
        </p>
      </div>

      {user && onToggleFavorite && (
        <button
          type="button"
          onClick={handleFavorite}
          className={`ml-4 shrink-0 text-xl transition-transform ${
            animating ? "scale-125" : ""
          } ${isFavorite ? "text-red-400" : "text-stone-600 hover:text-stone-400"}`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      )}
    </Link>
  );
}
