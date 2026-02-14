import Link from "next/link";
import { scenarios } from "@/components/scenario-config";
import { createClient } from "@/lib/supabase/server";
import { getTrackById } from "@/lib/data";
import type { RasikaPreferences, Track, Scenario } from "@/lib/types";

async function getPreferencesAndFavorites(): Promise<{
  prefs: RasikaPreferences | null;
  defaults: { scenario: Scenario; track: Track }[];
  user: boolean;
}> {
  const supabase = await createClient();
  if (!supabase) return { prefs: null, defaults: [], user: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { prefs: null, defaults: [], user: false };

  const { data } = await supabase
    .from("rasika_preferences")
    .select("*")
    .eq("rasika_id", user.id)
    .single();

  const prefs = data as RasikaPreferences | null;
  if (!prefs) return { prefs: null, defaults: [], user: true };

  const defaults: { scenario: Scenario; track: Track }[] = [];
  const mapping: [Scenario, string | null][] = [
    ["focus", prefs.default_focus_track],
    ["sleep", prefs.default_sleep_track],
    ["meditate", prefs.default_meditate_track],
  ];

  for (const [scenario, trackId] of mapping) {
    if (trackId) {
      const track = await getTrackById(trackId);
      if (track) defaults.push({ scenario, track });
    }
  }

  return { prefs, defaults, user: true };
}

export default async function Home() {
  const { defaults, user, prefs } = await getPreferencesAndFavorites();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Ragaflow</h1>
        <p className="mt-3 text-lg text-neutral-400">
          Indian classical ragas for focus, sleep &amp; meditation
        </p>
      </header>

      <main className="flex w-full max-w-sm flex-col gap-4">
        {/* One-tap play for defaults */}
        {defaults.length > 0 && (
          <section className="mb-4 flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Quick play
            </h2>
            {defaults.map(({ scenario, track }) => {
              const cfg = scenarios.find((s) => s.key === scenario)!;
              return (
                <Link
                  key={scenario}
                  href={`/mode/${scenario}/${track.id}`}
                  className={`flex items-center gap-3 rounded-xl border ${cfg.accent.border} bg-neutral-900/60 px-5 py-4 transition-colors ${cfg.accent.borderHover}`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.accent.bg} text-white text-lg`}
                  >
                    ▶
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${cfg.accent.text}`}>
                      {cfg.label}
                    </p>
                    <p className="text-xs text-neutral-400">{track.title}</p>
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
            className={`block rounded-xl border ${s.accent.border} ${s.accent.borderHover} bg-neutral-900/60 px-6 py-5 transition-colors`}
          >
            <h2 className={`text-xl font-medium ${s.accent.text}`}>
              {s.label}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">{s.subtitle}</p>
          </Link>
        ))}

        {/* Explore */}
        <Link
          href="/explore"
          className="block rounded-xl border border-emerald-500/40 hover:border-emerald-400/60 bg-neutral-900/60 px-6 py-5 transition-colors"
        >
          <h2 className="text-xl font-medium text-emerald-400">Explore</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Browse all tracks by ragam, tag, or mood
          </p>
        </Link>

        {/* Favorites section */}
        {prefs && prefs.favorite_tracks.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Favorites
            </h2>
            <p className="text-sm text-neutral-400">
              {prefs.favorite_tracks.length} favorited track
              {prefs.favorite_tracks.length !== 1 ? "s" : ""} —{" "}
              <Link href="/explore" className="underline hover:text-neutral-200">
                view in Explore
              </Link>
            </p>
          </section>
        )}

        {/* Auth link */}
        {!user && (
          <Link
            href="/auth"
            className="mt-4 text-center text-sm text-neutral-500 transition-colors hover:text-neutral-300"
          >
            Sign in for favorites &amp; personalization
          </Link>
        )}
      </main>
    </div>
  );
}
