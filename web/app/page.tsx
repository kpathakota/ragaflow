import Link from "next/link";
import { scenarios } from "@/components/scenario-config";
import { createClient } from "@/lib/supabase/server";
import { getTrackById, getFeaturedTracks, getFeaturedSleepTracks } from "@/lib/data";
import { getTimeOfDay, getTimeConfig } from "@/lib/time-of-day";
import { UserBadge } from "@/components/user-badge";
import { TonightInvitation } from "@/components/tonight-invitation";
import type { Rasika, Track, Scenario } from "@/lib/types";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getHomeData(): Promise<{
  user: boolean;
  displayName: string | null;
  favoritesCount: number;
  suggestedTrack: Track | null;
  defaultDurationMin: number | null;
  timeConfig: ReturnType<typeof getTimeConfig>;
}> {
  const config = getTimeConfig();
  const isSleepTime = config.scenario === "sleep";

  // Pick the featured track based on time of day
  let suggestedTrack: Track | null = null;
  if (isSleepTime) {
    const sleepTracks = await getFeaturedSleepTracks();
    if (sleepTracks.length > 0) {
      suggestedTrack = sleepTracks[Math.floor(Math.random() * sleepTracks.length)];
    }
  }
  if (!suggestedTrack) {
    const featured = await getFeaturedTracks();
    suggestedTrack = featured[0] ?? null;
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      user: false,
      displayName: null,
      favoritesCount: 0,
      suggestedTrack,
      defaultDurationMin: null,
      timeConfig: config,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: false,
      displayName: null,
      favoritesCount: 0,
      suggestedTrack,
      defaultDurationMin: null,
      timeConfig: config,
    };
  }

  const { data } = await supabase
    .from("rasikas")
    .select("*")
    .eq("rasika_id", user.id)
    .single();

  const prefs = data as Rasika | null;

  // If the user has a default for this time-of-day scenario, prefer it
  const defaultMapping: Record<Scenario, { trackId: string | null; duration: number | null }> = {
    focus: { trackId: prefs?.default_focus_track ?? null, duration: prefs?.default_focus_duration ?? null },
    sleep: { trackId: prefs?.default_sleep_track ?? null, duration: prefs?.default_sleep_duration ?? null },
    meditate: { trackId: prefs?.default_meditate_track ?? null, duration: prefs?.default_meditate_duration ?? null },
  };

  const mapping = defaultMapping[config.scenario];
  let defaultDurationMin: number | null = null;

  if (mapping.trackId) {
    const userTrack = await getTrackById(mapping.trackId);
    if (userTrack) {
      suggestedTrack = userTrack;
      defaultDurationMin = mapping.duration ? Math.round(mapping.duration / 60) : null;
    }
  }

  return {
    user: true,
    displayName: prefs?.display_name ?? null,
    favoritesCount: prefs?.favorite_tracks?.length ?? 0,
    suggestedTrack,
    defaultDurationMin,
    timeConfig: config,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function Home() {
  const { user, displayName, favoritesCount, suggestedTrack, defaultDurationMin, timeConfig } =
    await getHomeData();

  const subtitle = user
    ? (displayName ? `Welcome, ${displayName}` : "Welcome")
    : "Indian classical ragas for focus, sleep & meditation";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F0B07] px-5 pt-2 pb-8 sm:px-8 sm:pb-16 flex flex-col items-center">
      {/* Candle glow */}
      <div
        className="pointer-events-none absolute top-[90px] left-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-[30%] rounded-full opacity-12 blur-[70px] sm:h-[420px] sm:w-[420px] sm:blur-[100px]"
        style={{ background: timeConfig.accent }}
      />

      {/* Content (above glow) */}
      <div className="relative w-full max-w-sm sm:max-w-2xl">
        {/* Profile badge */}
        <div className="flex justify-end pt-1">
          {user ? (
            <UserBadge />
          ) : (
            <Link
              href="/auth"
              className="rounded-full bg-[#292524] px-4 py-2 text-sm font-medium text-[#E6DCCA] transition-opacity active:opacity-80"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Brand lockup */}
        <header className="pt-7 pb-9 text-center sm:pt-14 sm:pb-12">
          <h1 className="font-serif text-[40px] font-medium leading-none tracking-[-0.01em] text-[#E6DCCA] sm:text-[56px]">
            Ragaflow
          </h1>
          <p
            className="mx-auto mt-2.5 max-w-[300px] text-[13.5px] leading-relaxed sm:mt-4 sm:max-w-md sm:text-[15px]"
            style={{ color: "rgba(230,220,202,0.62)" }}
          >
            {subtitle}
          </p>
        </header>

        {/* Tonight invitation */}
        {suggestedTrack && (
          <TonightInvitation
            track={suggestedTrack}
            scenario={timeConfig.scenario}
            durationMinutes={defaultDurationMin}
            accentColor={timeConfig.accent}
            accentLight={timeConfig.accentLight}
            eyebrowLabel={timeConfig.label}
          />
        )}

        {/* Scenario cards — stacked on phone, three-up on desktop */}
        <div className="mt-7 grid grid-cols-1 gap-2.5 sm:mt-10 sm:grid-cols-3 sm:gap-3">
          {scenarios.map((s) => (
            <Link
              key={s.key}
              href={`/mode/${s.key}`}
              className={`block rounded-2xl border bg-[#1C1611] px-5 py-[18px] transition-[border-color] duration-[180ms] active:opacity-80 ${s.accent.border} ${s.accent.borderHover}`}
            >
              <h2 className={`font-serif text-[22px] font-medium tracking-[-0.005em] ${s.accent.text}`}>
                {s.label}
              </h2>
              <p
                className="mt-[3px] text-[13px] leading-[1.4]"
                style={{ color: "rgba(230,220,202,0.62)" }}
              >
                {s.subtitle}
              </p>
            </Link>
          ))}
        </div>

        {/* Two-up footer grid */}
        <div className="mt-[22px] grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
          <Link
            href="/explore"
            className="flex flex-col items-start gap-1 rounded-[14px] border border-[#E6DCCA]/14 bg-transparent p-3.5 transition-[border-color] duration-[180ms] hover:border-[#E6DCCA]/24 active:opacity-80"
          >
            <span
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{ color: "rgba(230,220,202,0.40)" }}
            >
              Explore
            </span>
            <span className="text-[13px] text-[#E6DCCA]">All tracks</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-start gap-1 rounded-[14px] border border-[#E6DCCA]/14 bg-transparent p-3.5 transition-[border-color] duration-[180ms] hover:border-[#E6DCCA]/24 active:opacity-80"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#C96A4C]">
              ♥ Favorites
            </span>
            <span className="text-[13px] text-[#E6DCCA]">
              <span className="font-mono tabular-nums">{favoritesCount}</span>{" "}
              track{favoritesCount !== 1 ? "s" : ""}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
