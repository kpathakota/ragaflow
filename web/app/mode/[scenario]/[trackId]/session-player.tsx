"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import type { Track, Ragam, Scenario } from "@/lib/types";
import { scenarioMap } from "@/components/scenario-config";
import { useAuth } from "@/lib/auth/auth-context";
import { toggleFavoriteTrackClient, getPreferencesClient } from "@/lib/favorites";
import { setDefaultTrackClient, setCustomDurationClient } from "@/lib/preferences";
import { startListeningSession, endListeningSession } from "@/lib/sessions";
import { computeCountableSeconds, upsertCertificationClient } from "@/lib/certifications";
import { trackEvent } from "@/lib/analytics";
import { sleepFadeVolume, progressFraction } from "@/lib/player";

const FIXED_DURATIONS = [25, 45];
const LAST_DURATION_KEY = "ragaflow:lastDuration";

function getLastDuration(): number | null {
  try {
    const v = parseInt(localStorage.getItem(LAST_DURATION_KEY) ?? "", 10);
    return v >= 1 && v <= 120 ? v : null;
  } catch { return null; }
}

function saveLastDuration(minutes: number) {
  try { localStorage.setItem(LAST_DURATION_KEY, String(minutes)); } catch {}
}

type SessionState = "idle" | "running" | "paused" | "complete";

export function SessionPlayer({
  track,
  ragam,
  scenario,
  initialDuration,
  autoplay = false,
  backHref,
}: {
  track: Track;
  ragam: Ragam | undefined;
  scenario: Scenario;
  initialDuration?: number;
  autoplay?: boolean;
  backHref?: string;
}) {
  const listHref = backHref ?? `/mode/${scenario}`;
  const config = scenarioMap[scenario];
  const accent = config.accent;
  const breathing = scenario === "meditate" || scenario === "sleep";
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  const [duration, setDurationRaw] = useState(() => initialDuration ?? getLastDuration() ?? 25);
  const setDuration = useCallback((d: number) => {
    setDurationRaw(d);
    saveLastDuration(d);
  }, []);
  const [remaining, setRemaining] = useState(0);
  const [session, setSession] = useState<SessionState>("idle");
  const [isFavorite, setIsFavorite] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [defaultSet, setDefaultSet] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(true);
  const [customDuration, setCustomDuration] = useState<number | null>(() => {
    const init = initialDuration ?? getLastDuration();
    return init && !FIXED_DURATIONS.includes(init) ? init : null;
  });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [isFullTrack, setIsFullTrack] = useState(autoplay);
  const autoplayFired = useRef(false);
  const fullTrackMinutes = Math.round(track.duration / 60);

  useEffect(() => {
    if (!user) return;
    getPreferencesClient().then((prefs) => {
      if (prefs) {
        setIsFavorite(prefs.favorite_tracks.includes(track.id));
        if (prefs.custom_duration) {
          setCustomDuration(prefs.custom_duration);
        }
      }
    });
  }, [user, track.id]);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const startSessionHandler = useCallback(async () => {
    const totalSeconds = isFullTrack ? track.duration : duration * 60;
    setRemaining(totalSeconds);
    startedAtRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;
    setSession("running");
    if (audioRef.current) {
      audioRef.current.loop = !isFullTrack;
      try {
        await audioRef.current.play();
      } catch {
        // Browser blocked autoplay (no prior user interaction).
        // Reset to idle so the user can tap play manually.
        setSession("idle");
        setRemaining(0);
        return;
      }
    }
    if (user) {
      const id = await startListeningSession(track.id, scenario, totalSeconds);
      if (id) setSessionId(id);
    }
  }, [duration, isFullTrack, track.duration, user, track.id, scenario]);

  useEffect(() => {
    if (autoplay && !autoplayFired.current) {
      autoplayFired.current = true;
      startSessionHandler();
    }
  }, [autoplay, startSessionHandler]);

  const pause = useCallback(() => {
    elapsedBeforePauseRef.current += (Date.now() - startedAtRef.current) / 1000;
    setSession("paused");
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    startedAtRef.current = Date.now();
    setSession("running");
    audioRef.current?.play();
  }, []);

  const stop = useCallback(async () => {
    setSession("idle");
    setIsFullTrack(false);
    const elapsed = Math.round(
      elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current) / 1000
    );
    setRemaining(0);
    pauseAudio();
    if (sessionId) {
      await endListeningSession(sessionId, elapsed, false);
      setSessionId(null);
    }
    if (user) {
      const countable = computeCountableSeconds(scenario, elapsed, false);
      upsertCertificationClient(track.ragam_id, countable);
    }
  }, [pauseAudio, sessionId, user, scenario, track.ragam_id]);

  const restart = useCallback(() => {
    setSession("idle");
    setRemaining(0);
    pauseAudio();
    setIsFullTrack(false);
    setShowDefaultPrompt(false);
    setDefaultSet(false);
  }, [pauseAudio]);

  useEffect(() => {
    if (session !== "running") return;
    const totalSeconds = isFullTrack ? track.duration : duration * 60;
    const tick = () => {
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current) / 1000;
      const left = Math.max(0, Math.round(totalSeconds - elapsed));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, duration, isFullTrack, track.duration]);

  useEffect(() => {
    if (session === "running" && remaining === 0) {
      const totalSeconds = isFullTrack ? track.duration : duration * 60;
      setSession("complete");
      pauseAudio();
      if (sessionId) {
        endListeningSession(sessionId, totalSeconds, true);
        setSessionId(null);
      }
      if (user) {
        setShowDefaultPrompt(true);
        upsertCertificationClient(track.ragam_id, totalSeconds);
      }
    }
  }, [session, remaining, pauseAudio, sessionId, duration, isFullTrack, track.duration, user, track.ragam_id]);

  // Sleep scenario fades audio to silence over the final stretch (ported from iOS).
  useEffect(() => {
    if (!audioRef.current) return;
    if (session === "running" || session === "paused") {
      audioRef.current.volume = sleepFadeVolume(scenario, remaining);
    } else {
      audioRef.current.volume = 1;
    }
  }, [scenario, remaining, session]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      router.push("/auth?reason=favorites");
      return;
    }
    const updated = await toggleFavoriteTrackClient(track.id);
    if (updated) setIsFavorite(updated.includes(track.id));
  }, [user, track.id, router]);

  const handleSetDefault = useCallback(async () => {
    if (!user) return;
    const totalSeconds = isFullTrack ? track.duration : duration * 60;
    await setDefaultTrackClient(scenario, track.id, totalSeconds);
    setDefaultSet(true);
    setShowDefaultPrompt(false);
  }, [user, scenario, track.id, duration, isFullTrack, track.duration]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col px-6 pt-6 pb-10">

      {/* Top bar: back + favorite */}
      <div className="flex items-center justify-between">
        <Link
          href={listHref}
          className="text-sm text-stone-500 transition-colors hover:text-stone-300"
        >
          &larr; Back
        </Link>
        <button
          type="button"
          onClick={handleToggleFavorite}
          className={`text-xl transition-colors ${
            isFavorite ? "text-red-400" : "text-stone-600 hover:text-stone-400"
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>

      {/* Track title + ragam name + description */}
      <div className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-100">
          {track.title ?? ragam?.name ?? "Untitled"}
        </h1>
        {track.title && ragam?.name && (
          <p className="mt-0.5 text-sm text-stone-500">{ragam.name}</p>
        )}
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
          {track.description}
        </p>
      </div>

      {/* Visual zone — fixed height so artist note doesn't resize it */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div
          className={`h-56 w-56 rounded-full ${accent.bg} blur-3xl ${
            breathing ? "animate-breathe" : "opacity-20"
          }`}
        />

        {/* Artist note — overlays bottom of visual zone */}
        {track.artist_note && session !== "complete" && (
          <div className="absolute inset-x-0 bottom-0 px-1 pb-4">
            <button
              type="button"
              onClick={() => setNoteExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-stone-600 transition-colors hover:text-stone-400"
            >
              <span>{noteExpanded ? "▴" : "▾"}</span>
              <span>From the session</span>
            </button>
            {noteExpanded && (
              <p className="mt-3 text-sm italic leading-relaxed text-stone-400">
                {track.artist_note}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls — bottom third */}
      <div className="flex flex-col items-center gap-5">

        {session === "idle" && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {FIXED_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDuration(d); setIsFullTrack(false); setShowCustomInput(false); }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    duration === d && !isFullTrack && !showCustomInput
                      ? `${accent.bg} text-white`
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {d}m
                </button>
              ))}
              {track.duration > 0 && (
                <button
                  type="button"
                  onClick={() => { setIsFullTrack(true); setDurationRaw(fullTrackMinutes); setShowCustomInput(false); }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isFullTrack
                      ? `${accent.bg} text-white`
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  Full track
                </button>
              )}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(true);
                    setIsFullTrack(false);
                    setCustomInputValue(customDuration?.toString() ?? "");
                    if (customDuration) setDuration(customDuration);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    !FIXED_DURATIONS.includes(duration) && !isFullTrack
                      ? `${accent.bg} text-white`
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {customDuration ? `${customDuration}m` : "…"}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = parseInt(customInputValue, 10);
                    if (val >= 1 && val <= 120) {
                      setCustomDuration(val);
                      setDuration(val);
                      setShowCustomInput(false);
                      if (user) setCustomDurationClient(val);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    type="number"
                    min={1}
                    max={120}
                    autoFocus
                    value={customInputValue}
                    onChange={(e) => setCustomInputValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(customInputValue, 10);
                      if (val >= 1 && val <= 120) {
                        setCustomDuration(val);
                        setDuration(val);
                        if (user) setCustomDurationClient(val);
                      }
                      setShowCustomInput(false);
                    }}
                    className="w-14 rounded-full bg-stone-800 px-3 py-2 text-center text-sm font-medium text-stone-100 outline-none focus:ring-1 focus:ring-stone-600"
                    placeholder="min"
                  />
                </form>
              )}
            </div>
            <button
              type="button"
              onClick={startSessionHandler}
              className={`flex h-16 w-16 items-center justify-center rounded-full ${accent.bg} text-2xl text-white transition-opacity hover:opacity-80`}
            >
              ▶
            </button>
            {/* Invisible spacer matching the reset button height to prevent layout shift */}
            <span className="invisible text-sm">reset</span>
          </>
        )}

        {(session === "running" || session === "paused") && (() => {
          const totalSeconds = isFullTrack ? track.duration : duration * 60;
          const ringR = 44;
          const ringC = 2 * Math.PI * ringR;
          const ringOffset = ringC * (1 - progressFraction(totalSeconds, remaining));
          return (
          <>
            {/* Large timer in accent color */}
            <span className={`text-5xl font-light tabular-nums ${accent.text}`}>
              {display}
            </span>

            {/* Ragam name beneath the timer (title stays at the top only) */}
            {ragam?.name && (
              <p className="text-sm font-medium text-stone-300">{ragam.name}</p>
            )}

            {/* Play/pause with circular progress ring */}
            <div className="relative flex items-center justify-center">
              <svg
                className="pointer-events-none absolute -rotate-90"
                width="96"
                height="96"
                viewBox="0 0 96 96"
                aria-hidden="true"
              >
                <circle cx="48" cy="48" r={ringR} fill="none" stroke="#44403c" strokeWidth="3" />
                <circle
                  cx="48"
                  cy="48"
                  r={ringR}
                  fill="none"
                  stroke={accent.hex}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              {session === "running" ? (
                <button
                  type="button"
                  onClick={pause}
                  aria-label="Pause session"
                  className={`flex h-16 w-16 appearance-none items-center justify-center rounded-full ${accent.bg} text-white transition-opacity hover:opacity-80`}
                >
                  <span aria-hidden="true" className="flex gap-[3px]">
                    <span className="block h-5 w-[3px] rounded-sm bg-white" />
                    <span className="block h-5 w-[3px] rounded-sm bg-white" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resume}
                  aria-label="Resume session"
                  className={`flex h-16 w-16 items-center justify-center rounded-full ${accent.bg} text-2xl text-white transition-opacity hover:opacity-80`}
                >
                  ▶
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={restart}
              className="text-sm text-stone-600 transition-colors hover:text-stone-400"
            >
              reset
            </button>
          </>
          );
        })()}

        {session === "complete" && (
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Completion badge */}
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${accent.bg} bg-opacity-20`}>
              <span className="text-3xl">✓</span>
            </div>

            {/* Session summary */}
            <div>
              <p className={`text-lg font-semibold ${accent.text}`}>
                {isFullTrack ? fullTrackMinutes : duration} minutes of {config.label.toLowerCase()}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {track.title ?? ragam?.name}
              </p>
            </div>

            {showDefaultPrompt && !defaultSet && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-5 py-4">
                <p className="text-sm text-stone-300">
                  Set as your default for {config.label}?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSetDefault}
                    className={`rounded-full px-4 py-2 text-sm font-medium text-white ${accent.bg} transition-opacity hover:opacity-80`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDefaultPrompt(false)}
                    className="rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}

            {defaultSet && (
              <p className="text-sm text-[#8A9B72]">Default set! Quick-play from home.</p>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={restart}
                className={`rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 ${accent.bg}`}
              >
                New session
              </button>
              <Link
                href={listHref}
                className="rounded-full bg-stone-800 px-6 py-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700"
              >
                Back to list
              </Link>
            </div>
          </div>
        )}

      </div>

      <audio
        ref={audioRef}
        src={track.audio_url}
        loop
        preload="auto"
        onError={(e) => {
          const mediaError = (e.target as HTMLAudioElement).error;
          trackEvent("playback_error", {
            track_id: track.id,
            error: mediaError?.message ?? "Unknown playback error",
            code: mediaError?.code,
          }, user?.id);
        }}
      />
    </div>
  );
}
