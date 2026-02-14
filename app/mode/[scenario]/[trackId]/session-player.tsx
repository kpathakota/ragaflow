"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Track, Scenario } from "@/lib/types";
import { scenarioMap } from "@/components/scenario-config";
import { useAuth } from "@/lib/auth/auth-context";
import { toggleFavoriteTrackClient, getPreferencesClient } from "@/lib/favorites";
import { setDefaultTrackClient } from "@/lib/preferences";
import { startListeningSession, endListeningSession } from "@/lib/sessions";

const DURATION_OPTIONS = [5, 15, 25, 45];

type SessionState = "idle" | "running" | "paused" | "complete";

export function SessionPlayer({
  track,
  scenario,
}: {
  track: Track;
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

  // Load favorite state
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

  // Timer tick
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

  // Detect timer completion
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
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <header className="mb-10 w-full max-w-sm">
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
        <h1 className={`mt-4 text-3xl font-semibold tracking-tight ${accent.text}`}>
          {track.title}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">{track.description}</p>
      </header>

      <main className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* Idle: duration picker + play */}
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
                  {d} min
                </button>
              ))}
            </div>

            <button
              onClick={startSessionHandler}
              className={`flex h-20 w-20 items-center justify-center rounded-full ${accent.bg} text-white text-3xl transition-opacity hover:opacity-80`}
            >
              ▶
            </button>
          </>
        )}

        {/* Running / Paused: timer + controls */}
        {(session === "running" || session === "paused") && (
          <>
            <div className="text-6xl font-light tracking-widest tabular-nums">
              {display}
            </div>

            <div className="flex gap-4">
              {session === "running" ? (
                <button
                  onClick={pause}
                  className="rounded-full bg-neutral-800 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={resume}
                  className={`rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 ${accent.bg}`}
                >
                  Resume
                </button>
              )}
              <button
                onClick={stop}
                className="rounded-full bg-neutral-800 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                Stop
              </button>
            </div>
          </>
        )}

        {/* Complete */}
        {session === "complete" && (
          <>
            <p className="text-2xl font-medium text-neutral-200">
              Session complete
            </p>

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
              <p className="text-sm text-emerald-400">
                Default set! Quick-play from home.
              </p>
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
          </>
        )}
      </main>

      <audio ref={audioRef} src={track.audio_url} loop preload="auto" />
    </div>
  );
}
