"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";

const modeAccent: Record<string, { text: string; border: string; bg: string }> = {
  focus: { text: "text-blue-400", border: "border-blue-500/40", bg: "bg-blue-500" },
  sleep: { text: "text-indigo-400", border: "border-indigo-500/40", bg: "bg-indigo-500" },
  meditate: { text: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500" },
};

const DURATION_OPTIONS = [5, 15, 25, 45];

type Ragam = {
  id: string;
  name: string;
  mode: string;
  description: string;
  audioUrl: string;
};

type SessionState = "idle" | "running" | "paused" | "complete";

export function SessionPlayer({ ragam, mode }: { ragam: Ragam; mode: string }) {
  const accent = modeAccent[mode] ?? modeAccent.focus;
  const audioRef = useRef<HTMLAudioElement>(null);

  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(0);
  const [session, setSession] = useState<SessionState>("idle");

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const startSession = useCallback(() => {
    setRemaining(duration * 60);
    setSession("running");
    audioRef.current?.play();
  }, [duration]);

  const pause = useCallback(() => {
    setSession("paused");
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    setSession("running");
    audioRef.current?.play();
  }, []);

  const stop = useCallback(() => {
    setSession("idle");
    setRemaining(0);
    stopAudio();
  }, [stopAudio]);

  const restart = useCallback(() => {
    setSession("idle");
    setRemaining(0);
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
    }
  }, [session, remaining, stopAudio]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <header className="mb-10 w-full max-w-sm">
        <Link
          href={`/mode/${mode}`}
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          &larr; Back
        </Link>
        <h1 className={`mt-4 text-3xl font-semibold tracking-tight ${accent.text}`}>
          {ragam.name}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">{ragam.description}</p>
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
              onClick={startSession}
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
            <div className="flex gap-4">
              <button
                onClick={restart}
                className={`rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 ${accent.bg}`}
              >
                New session
              </button>
              <Link
                href={`/mode/${mode}`}
                className="rounded-full bg-neutral-800 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                Back to list
              </Link>
            </div>
          </>
        )}
      </main>

      <audio ref={audioRef} src={ragam.audioUrl} loop preload="auto" />
    </div>
  );
}
