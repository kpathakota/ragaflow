import Link from "next/link";
import { scenarios } from "@/components/scenario-config";
import { createClient } from "@/lib/supabase/server";
import { getTrackById, getFeaturedTracks, getFeaturedSleepTracks } from "@/lib/data";
import { UserBadge } from "@/components/user-badge";
import { TonightInvitation } from "@/components/tonight-invitation";
import type { Rasika, Track, Scenario } from "@/lib/types";

// ---------------------------------------------------------------------------
// Time-of-day logic
// ---------------------------------------------------------------------------

type TimeOfDay = "morning" | "midday" | "evening" | "night";

const TIME_CONFIG: Record<
  TimeOfDay,
  { label: string; scenario: Scenario; accent: string; accentLight: string }
> = {
  morning: { label: "This morning", scenario: "focus", accent: "#C9A54C", accentLight: "#D9B866" },
  midday: { label: "A pause", scenario: "meditate", accent: "#8A9B72", accentLight: "#A2B48A" },
  evening: { label: "Tonight", scenario: "sleep", accent: "#B08878", accentLight: "#C49C8B" },
  night: { label: "Wind down", scenario: "sleep", accent: "#B08878", accentLight: "#C49C8B" },
};

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "midday";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getHomeData(): Promise<{
  user: boolean;
  displayName: string | null;
  favoritesCount: number;
  suggestedTrack: Track | null;
  defaultDurationMin: number | null;
  timeConfig: (typeof TIME_CONFIG)[TimeOfDay];
}> {
  const tod = getTimeOfDay();
  const config = TIME_CONFIG[tod];
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
    <div className="relative min-h-screen overflow-hidden bg-[#0F0B07] px-5 pt-2 pb-8 flex flex-col items-center">
      {/* Candle glow */}
      <div
        className="pointer-events-none absolute top-[90px] left-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-[30%] rounded-full opacity-12 blur-[70px]"
        style={{ background: timeConfig.accent }}
      />

      {/* Content (above glow) */}
      <div className="relative w-full max-w-sm">
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
        <header className="pt-7 pb-9 text-center">
          <h1 className="font-serif text-[40px] font-medium leading-none tracking-[-0.01em] text-[#E6DCCA]">
            Ragaflow
          </h1>
          <p
            className="mx-auto mt-2.5 max-w-[300px] text-[13.5px] leading-relaxed"
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

        {/* Scenario cards */}
        <div className="mt-7 flex flex-col gap-2.5">
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
        <div className="mt-[22px] grid grid-cols-2 gap-2.5">
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
