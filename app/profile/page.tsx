"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { NavHeader } from "@/components/nav-header";
import { createClient } from "@/lib/supabase/client";
import { scenarios } from "@/components/scenario-config";
import type { RasikaPreferences, Scenario, Track } from "@/lib/types";
import { computeRagamProgress, getTierInfo, getTierColor } from "@/lib/certifications";

type Stats = {
  totalSeconds: number;
  sessionCount: number;
};

type DefaultTrack = { scenario: Scenario; track: Track };

type CertProgress = {
  ragamId: string;
  ragamName: string;
  totalSeconds: number;
  currentLabel: string | null;
  currentLevel: 0 | 1 | 2 | 3 | 4;
  nextLabel: string | null;
  progressPercent: number;
};

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<RasikaPreferences | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [defaults, setDefaults] = useState<DefaultTrack[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [certs, setCerts] = useState<CertProgress[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    // Fetch preferences
    supabase
      .from("rasika_preferences")
      .select("*")
      .eq("rasika_id", user.id)
      .single()
      .then(({ data }) => {
        const p = data as RasikaPreferences | null;
        setPrefs(p);
        if (!p) return;

        // Fetch default tracks
        const mapping: [Scenario, string | null][] = [
          ["focus", p.default_focus_track],
          ["sleep", p.default_sleep_track],
          ["meditate", p.default_meditate_track],
        ];
        const trackIds = mapping
          .filter(([, id]) => id)
          .map(([, id]) => id as string);

        if (trackIds.length === 0) return;

        supabase
          .from("tracks")
          .select("*")
          .in("id", trackIds)
          .then(({ data: tracks }) => {
            if (!tracks) return;
            const result: DefaultTrack[] = [];
            for (const [scenario, trackId] of mapping) {
              const track = tracks.find((t: Track) => t.id === trackId);
              if (track) result.push({ scenario, track: track as Track });
            }
            setDefaults(result);
          });
      });

    // Fetch listening stats + certifications
    (async () => {
      const { data: sessions } = await supabase
        .from("listening_sessions")
        .select("track_id, scenario, duration_seconds, completed")
        .eq("rasika_id", user.id);

      if (!sessions) {
        setStats({ totalSeconds: 0, sessionCount: 0 });
        return;
      }

      const totalSeconds = sessions.reduce(
        (sum: number, s: { duration_seconds: number }) =>
          sum + (s.duration_seconds || 0),
        0
      );
      setStats({ totalSeconds, sessionCount: sessions.length });

      // Compute certification progress
      const { data: allTracks } = await supabase
        .from("tracks")
        .select("id, ragam_id");
      const { data: ragams } = await supabase
        .from("ragams")
        .select("id, name");

      if (!allTracks || !ragams) return;

      const progress = computeRagamProgress(
        sessions as { track_id: string; scenario: string; duration_seconds: number; completed: boolean | null }[],
        allTracks as { id: string; ragam_id: string }[]
      );

      const ragamNameMap = new Map<string, string>();
      for (const r of ragams) ragamNameMap.set(r.id, r.name);

      const certList: CertProgress[] = [];
      for (const [ragamId, secs] of progress) {
        if (secs <= 0) continue;
        const tier = getTierInfo(secs);
        certList.push({
          ragamId,
          ragamName: ragamNameMap.get(ragamId) ?? ragamId,
          totalSeconds: secs,
          currentLabel: tier.currentLabel,
          currentLevel: tier.currentLevel,
          nextLabel: tier.nextLabel,
          progressPercent: tier.progressPercent,
        });
      }
      certList.sort((a, b) => b.totalSeconds - a.totalSeconds);
      setCerts(certList);
    })();
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <NavHeader backHref="/" title="Profile" />

      <div className="flex w-full max-w-sm flex-col gap-8">
        {/* Account */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Account
          </h2>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
            <p className="text-sm text-neutral-200">{user.email}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Member since {memberSince}
            </p>
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Listening
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
                <p className="text-2xl font-semibold text-neutral-100">
                  {formatDuration(stats.totalSeconds)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">Total time</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
                <p className="text-2xl font-semibold text-neutral-100">
                  {stats.sessionCount}
                </p>
                <p className="mt-1 text-xs text-neutral-500">Sessions</p>
              </div>
              {prefs && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4">
                  <p className="text-2xl font-semibold text-neutral-100">
                    {prefs.favorite_tracks.length}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">Favorites</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Listening Journey */}
        {certs.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Listening Journey
            </h2>
            <div className="flex flex-col gap-3">
              {certs.map((c) => {
                const tierColor = getTierColor(c.currentLevel);
                return (
                  <div
                    key={c.ragamId}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-200">
                        {c.ragamName}
                      </span>
                      <span className={`text-xs font-medium ${c.currentLabel ? tierColor.label : "text-neutral-500"}`}>
                        {c.currentLabel ?? "—"}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-800">
                      <div
                        className={`h-full rounded-full ${tierColor.bar} transition-all`}
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">
                      {formatDuration(c.totalSeconds)}
                      {c.nextLabel && ` — next: ${c.nextLabel}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Defaults */}
        {defaults.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Default tracks
            </h2>
            <div className="flex flex-col gap-2">
              {defaults.map(({ scenario, track }) => {
                const cfg = scenarios.find((s) => s.key === scenario)!;
                return (
                  <div
                    key={scenario}
                    className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-3"
                  >
                    <span className={`text-sm font-medium ${cfg.accent.text}`}>
                      {cfg.label}
                    </span>
                    <span className="text-sm text-neutral-400">
                      {track.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-4 rounded-xl border border-neutral-700 bg-neutral-900/60 px-5 py-3 text-sm text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
