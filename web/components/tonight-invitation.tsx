"use client";

import Link from "next/link";
import type { Track, Scenario } from "@/lib/types";

export function TonightInvitation({
  track,
  scenario,
  durationMinutes,
  accentColor,
  accentLight,
  eyebrowLabel,
}: {
  track: Track;
  scenario: Scenario;
  durationMinutes: number | null;
  accentColor: string;
  accentLight: string;
  eyebrowLabel: string;
}) {
  const durationMin = durationMinutes ?? Math.round(track.duration / 60);
  const href = `/mode/${scenario}/${track.id}?d=${durationMin}`;
  const firstTag = track.tags.find((t) => t !== scenario) ?? track.tags[0];

  return (
    <section>
      <p
        className="mb-2.5 pl-0.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em]"
        style={{ color: "rgba(230,220,202,0.40)" }}
      >
        {eyebrowLabel}
      </p>
      <Link
        href={href}
        className="block rounded-[18px] px-[18px] pt-[18px] pb-[16px] transition-[border-color] duration-[180ms] sm:px-6 sm:pt-6 sm:pb-5"
        style={{
          border: `1px solid ${accentColor}55`,
          background: `linear-gradient(180deg, ${accentColor}14 0%, #1C1611 100%)`,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = `${accentColor}80`)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = `${accentColor}55`)
        }
      >
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] text-white sm:h-14 sm:w-14 sm:text-[17px]"
            style={{ background: accentColor }}
          >
            ▶
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[18px] font-medium italic leading-snug tracking-[-0.005em] text-[#E6DCCA] sm:text-[22px]">
              {track.title ?? "Untitled track"}
            </p>
            <p className="mt-[3px] flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(230,220,202,0.62)" }}>
              <span className="font-mono tabular-nums">{durationMin}m</span>
              <span>·</span>
              <span>{scenario}</span>
              {firstTag && (
                <>
                  <span>·</span>
                  <span>{firstTag}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {track.artist_note && (
          <p
            className="mt-3.5 max-w-prose font-serif text-[13px] italic leading-relaxed sm:text-[14px]"
            style={{ color: accentLight, opacity: 0.88 }}
          >
            &ldquo;{track.artist_note}&rdquo;
          </p>
        )}
      </Link>
    </section>
  );
}
