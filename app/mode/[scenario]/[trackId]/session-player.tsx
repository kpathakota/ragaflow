"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Track, Ragam, Scenario } from "@/lib/types";
import { scenarioMap } from "@/components/scenario-config";
import { useAuth } from "@/lib/auth/auth-context";
import { toggleFavoriteTrackClient, getPreferencesClient } from "@/lib/favorites";
import { setDefaultTrackClient } from "@/lib/preferences";
import { startListeningSession, endListeningSession } from "@/lib/sessions";

const DURATION_OPTIONS = [5, 15, 25, 45];

type SessionState = "idle" | "running" | "paused" | "complete";

export function SessionPlayer({
  track,
  ragam,
  scenario,
}: {
  track: Track;
  ragam: Ragam | undefined;
  scenario: Scenario;
}) {
  const config = scenarioMap[scenario];
  const accent = config.accent;
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();

  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(0);
  const [session, setSession] = useState<SessionState>("idle");
  const [isFavorite, setIsFavorite] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [defaultSet, setDefaultSet] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPreferencesClient().then((prefs) => {
      if (prefs) setIsFavorite(prefs.favorite_tracks.includes(track.id));
    });
  }, [user, track.id]);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const startSessionHandler = useCallback(async () => {
    setRemaining(duration * 60);
    setSession("running");
    audioRef.current?.play();
    if (user) {
      const id = await startListeningSession(track.id, scenario);
      if (id) setSessionId(id);
    }
  }, [duration, user, track.id, scenario]);

  const pause = useCallback(() => {
    setSession("paused");
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    setSession("running");
    audioRef.current?.play();
  }, []);

  const stop = useCallback(async () => {
    setSession("idle");
    const elapsed = duration * 60 - remaining;
    setRemaining(0);
    stopAudio();
    if (sessionId) {
      await endListeningSession(sessionId, elapsed);
      setSessionId(null);
    }
  }, [stopAudio, sessionId, duration, remaining]);

  const restart = useCallback(() => {
    setSession("idle");
    setRemaining(0);
    setShowDefaultPrompt(false);
    setDefaultSet(false);
    stopAudio();
  }, [stopAudio]);

  useEffect(() => {
    if (session !== "running") return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (session === "running" && remaining === 0) {
      setSession("complete");
      stopAudio();
      if (sessionId) {
        endListeningSession(sessionId, duration * 60);
        setSessionId(null);
      }
      if (user) setShowDefaultPrompt(true);
    }
  }, [session, remaining, stopAudio, sessionId, duration, user]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) return;
    const updated = await toggleFavoriteTrackClient(track.id);
    if (updated) setIsFavorite(updated.includes(track.id));
  }, [user, track.id]);

  const handleSetDefault = useCallback(async () => {
    if (!user) return;
    await setDefaultTrackClient(scenario, track.id);
    setDefaultSet(true);
    setShowDefaultPrompt(false);
  }, [user, scenario, track.id]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col px-6 pt-6 pb-10">

      {/* Top bar: back + favorite */}
      <div className="flex items-center justify-between">
        <Link
          href={`/mode/${scenario}`}
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          &larr; Back
        </Link>
        {user && (
          <button
            onClick={handleToggleFavorite}
            className={`text-xl transition-colors ${
              isFavorite ? "text-red-400" : "text-neutral-600 hover:text-neutral-400"
            }`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        )}
      </div>

      {/* Ragam name + brief description */}
      <div className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
          {ragam?.name ?? track.title}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
          {track.description}
        </p>
      </div>

      {/* Visual zone — replace contents with animation when ready */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <div className={`h-56 w-56 rounded-full ${accent.bg} opacity-20 blur-3xl`} />
      </div>

      {/* Artist note — expandable, hidden if empty */}
      {track.artist_note && session !== "complete" && (
        <div className="mb-6">
          <button
            onClick={() => setNoteExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-neutral-600 transition-colors hover:text-neutral-400"
          >
            <span>{noteExpanded ? "▴" : "▾"}</span>
            <span>From the session</span>
          </button>
          {noteExpanded && (
            <p className="mt-3 text-sm italic leading-relaxed text-neutral-400">
              {track.artist_note}
            </p>
          )}
        </div>
      )}

      {/* Controls — bottom third */}
      <div className="flex flex-col items-center gap-5">

        {session === "idle" && (
          <>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    duration === d
                      ? `${accent.bg} text-white`
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
            <button
              onClick={startSessionHandler}
              className={`flex h-16 w-16 items-center justify-center rounded-full ${accent.bg} text-2xl text-white transition-opacity hover:opacity-80`}
            >
              ▶
            </button>
          </>
        )}

        {(session === "running" || session === "paused") && (
          <>
            <span className="text-xs tabular-nums text-neutral-600">{display}</span>
            <div className="flex items-center gap-4">
              {session === "running" ? (
                <button
                  onClick={pause}
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${accent.bg} text-2xl text-white transition-opacity hover:opacity-80`}
                >
                  ⏸
                </button>
              ) : (
                <button
                  onClick={resume}
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${accent.bg} text-2xl text-white transition-opacity hover:opacity-80`}
                >
                  ▶
                </button>
              )}
              <button
                onClick={stop}
                className="text-sm text-neutral-600 transition-colors hover:text-neutral-400"
              >
                stop
              </button>
            </div>
          </>
        )}

        {session === "complete" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-medium text-neutral-200">Session complete</p>

            {showDefaultPrompt && !defaultSet && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-5 py-4">
                <p className="text-sm text-neutral-300">
                  Set as your default for {config.label}?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSetDefault}
                    className={`rounded-full px-4 py-2 text-sm font-medium text-white ${accent.bg} transition-opacity hover:opacity-80`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDefaultPrompt(false)}
                    className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}

            {defaultSet && (
              <p className="text-sm text-emerald-400">Default set! Quick-play from home.</p>
            )}

            <div className="flex gap-4">
              <button
                onClick={restart}
                className={`rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 ${accent.bg}`}
              >
                New session
              </button>
              <Link
                href={`/mode/${scenario}`}
                className="rounded-full bg-neutral-800 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                Back to list
              </Link>
            </div>
          </div>
        )}

      </div>

      <audio ref={audioRef} src={track.audio_url} loop preload="auto" />
    </div>
  );
}
