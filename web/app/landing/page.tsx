import type { Metadata } from "next";
import Link from "next/link";
import { scenarios } from "@/components/scenario-config";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Ragaflow — Indian classical ragas for focus, sleep & meditation",
  description:
    "A curated listening app that uses Indian ragas for focus, sleep, and meditation. Creator-driven, not algorithm-driven.",
};

/**
 * Where the "Open the app" CTAs point. Set NEXT_PUBLIC_APP_URL to the app
 * subdomain (e.g. https://app.ragaflow.io) once the domain split is live; until
 * then it stays same-origin so previews and local dev work.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "/";

const VALUE_PROPS = [
  {
    title: "Ragas, not rain sounds",
    body: "Each session is a specific melodic framework with intent and history — not generic ambient noise stretched to fill an hour.",
  },
  {
    title: "One curator, not an algorithm",
    body: "Every recording is chosen and shaped by a single musician's ear. You're hearing a point of view, not a playlist a machine assembled.",
  },
  {
    title: "Meaning you can hear",
    body: "Ragam descriptions, artist notes, and the place each session was recorded — the depth is there when you're curious, invisible when you're not.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F0B07] px-5 pb-10 flex flex-col items-center">
      {/* Candle glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[120px] left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full opacity-[0.14] blur-[80px]"
        style={{ background: "#C9A54C" }}
      />

      <main className="relative w-full max-w-md">
        {/* Hero */}
        <section className="pt-20 pb-14 text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[#E6DCCA]/45">
            Indian classical, for daily use
          </p>
          <h1 className="font-serif text-[52px] font-medium leading-none tracking-[-0.01em] text-[#E6DCCA]">
            Ragaflow
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-[17px] leading-relaxed text-[#E6DCCA]/70">
            Ragas chosen for how you want to feel. Pick a moment — focus, sleep,
            or meditation — and let a raga hold the space.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Link
              href={APP_URL}
              className="rounded-full bg-[#E6DCCA] px-7 py-3 text-[15px] font-medium text-[#0F0B07] transition-opacity hover:opacity-90 active:opacity-80"
            >
              Start listening
            </Link>
            <Link
              href={`${APP_URL === "/" ? "" : APP_URL}/auth`}
              className="text-sm text-[#E6DCCA]/55 transition-colors hover:text-[#E6DCCA]/85"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </section>

        {/* What makes it different */}
        <section className="space-y-9 py-8">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="text-center">
              <h2 className="font-serif text-[22px] font-medium text-[#E6DCCA]">
                {prop.title}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-[#E6DCCA]/65">
                {prop.body}
              </p>
            </div>
          ))}
        </section>

        {/* Three moods */}
        <section className="pt-8">
          <h2 className="mb-6 text-center font-serif text-[22px] font-medium text-[#E6DCCA]">
            Three moods
          </h2>
          <div className="space-y-3">
            {scenarios.map((s) => (
              <div
                key={s.key}
                className="rounded-2xl border p-5"
                style={{
                  borderColor: `color-mix(in srgb, ${s.accent.hex} 32%, transparent)`,
                }}
              >
                <h3
                  className="font-serif text-[20px] font-medium"
                  style={{ color: s.accent.hex }}
                >
                  {s.label}
                </h3>
                <p className="mt-1 text-[14px] text-[#E6DCCA]/60">
                  {s.subtitle}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="pt-16 pb-4 text-center">
          <p className="mx-auto mb-6 max-w-sm font-serif text-[24px] italic leading-snug text-[#E6DCCA]/90">
            Press play, put the phone down, and let the raga do the rest.
          </p>
          <Link
            href={APP_URL}
            className="inline-block rounded-full bg-[#E6DCCA] px-7 py-3 text-[15px] font-medium text-[#0F0B07] transition-opacity hover:opacity-90 active:opacity-80"
          >
            Start listening
          </Link>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
