import Link from "next/link";
import { scenarios } from "@/components/scenario-config";
import { createClient } from "@/lib/supabase/server";
import { getTrackById, getFeaturedTracks, getAllRagams } from "@/lib/data";
import { UserBadge } from "@/components/user-badge";
import type { Rasika, Track, Ragam, Scenario } from "@/lib/types";

async function getPreferencesAndFavorites(): Promise<{
  prefs: Rasika | null;
  defaults: { scenario: Scenario; track: Track; durationSeconds: number | null }[];
  user: boolean;
}> {
  const supabase = await createClient();
  if (!supabase) return { prefs: null, defaults: [], user: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { prefs: null, defaults: [], user: false };

  const { data } = await supabase
    .from("rasikas")
    .select("*")
    .eq("rasika_id", user.id)
    .single();

  const prefs = data as Rasika | null;
  if (!prefs) return { prefs: null, defaults: [], user: true };

  const defaults: { scenario: Scenario; track: Track; durationSeconds: number | null }[] = [];
  const mapping: [Scenario, string | null, number | null][] = [
    ["focus", prefs.default_focus_track, prefs.default_focus_duration],
    ["sleep", prefs.default_sleep_track, prefs.default_sleep_duration],
    ["meditate", prefs.default_meditate_track, prefs.default_meditate_duration],
  ];

  for (const [scenario, trackId, dur] of mapping) {
    if (trackId) {
      const track = await getTrackById(trackId);
      if (track) defaults.push({ scenario, track, durationSeconds: dur });
    }
  }

  return { prefs, defaults, user: true };
}

export default async function Home() {
  const [{ defaults, user, prefs }, featuredTracks, ragams] = await Promise.all([
    getPreferencesAndFavorites(),
    getFeaturedTracks(),
    getAllRagams(),
  ]);

  const ragamMap = new Map<string, Ragam>(ragams.map((r) => [r.id, r]));

  // Authenticated: "Welcome, <display_name>" or "Welcome"
  // Anonymous: show the tagline so first-time visitors know what Ragaflow is
  const subtitle = user
    ? (prefs?.display_name ? `Welcome, ${prefs.display_name}` : "Welcome")
    : "Indian classical ragas for focus, sleep & meditation";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="absolute right-6 top-6">
        {user ? (
          <UserBadge />
        ) : (
          <Link
            href="/auth"
            className="rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700 hover:text-white"
          >
            Sign in
          </Link>
        )}
      </div>
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Ragaflow</h1>
        <p className="mt-3 text-lg text-stone-400">{subtitle}</p>
      </header>

      <main className="flex w-full max-w-sm flex-col gap-4">
        {/* One-tap play for defaults */}
        {defaults.length > 0 && (
          <section className="mb-4 flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Quick play
            </h2>
            {defaults.map(({ scenario, track, durationSeconds }) => {
              const cfg = scenarios.find((s) => s.key === scenario)!;
              const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : null;
              const href = durationMin
                ? `/mode/${scenario}/${track.id}?d=${durationMin}`
                : `/mode/${scenario}/${track.id}`;
              return (
                <Link
                  key={scenario}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl border ${cfg.accent.border} bg-stone-900/60 px-5 py-4 transition-colors ${cfg.accent.borderHover}`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.accent.bg} text-white text-lg`}
                  >
                    ▶
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${cfg.accent.text}`}>
                      {cfg.label}{durationMin ? ` · ${durationMin}m` : ""}
                    </p>
                    <p className="text-xs text-stone-400">{track.title}</p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Featured tracks */}
        {featuredTracks.length > 0 && (
          <section className="mb-4 flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Featured
            </h2>
            {featuredTracks.map((track) => {
              const scenario = track.scenarios[0] ?? "focus";
              const cfg = scenarios.find((s) => s.key === scenario) ?? scenarios[0];
              const ragam = ragamMap.get(track.ragam_id);
              return (
                <Link
                  key={track.id}
                  href={`/mode/${scenario}/${track.id}`}
                  className={`flex items-center gap-3 rounded-xl border ${cfg.accent.border} bg-stone-900/60 px-5 py-4 transition-colors ${cfg.accent.borderHover}`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.accent.bg} text-white text-lg`}
                  >
                    ▶
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${cfg.accent.text}`}>
                      {track.title ?? ragam?.name ?? "Untitled"}
                    </p>
                    <p className="text-xs text-stone-400">
                      {ragam?.name && track.title ? ragam.name + " · " : ""}
                      {Math.round(track.duration / 60)}m
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Scenario cards */}
        {scenarios.map((s) => (
          <Link
            key={s.key}
            href={`/mode/${s.key}`}
            className={`block rounded-xl border ${s.accent.border} ${s.accent.borderHover} bg-stone-900/60 px-6 py-5 transition-colors`}
          >
            <h2 className={`text-xl font-medium ${s.accent.text}`}>
              {s.label}
            </h2>
            <p className="mt-1 text-sm text-stone-400">{s.subtitle}</p>
          </Link>
        ))}

        {/* Explore */}
        <Link
          href="/explore"
          className="block rounded-xl border border-[#B8845A]/30 hover:border-[#B8845A]/50 bg-stone-900/60 px-6 py-5 transition-colors"
        >
          <h2 className="text-xl font-medium text-[#B8845A]">Explore</h2>
          <p className="mt-1 text-sm text-stone-400">
            Browse all tracks by ragam, tag, or mood
          </p>
        </Link>
      </main>
    </div>
  );
}
