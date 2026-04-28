import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TonightInvitation } from "@/components/tonight-invitation";
import type { Track } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockTrack: Track = {
  id: "t1",
  title: "A Kannadagowla in Rupakam",
  ragam_id: "r1",
  scenarios: ["sleep"],
  tags: ["evening", "calm"],
  description: "A peaceful session",
  artist_note: "At dawn by the Willamette, fog on the water.",
  recorded_date: "2025-12-01",
  location: "Portland studio",
  duration: 1500,
  audio_url: "https://example.com/track.opus",
  download_url: null,
  free: true,
  featured: true,
  featured_scenarios: ["sleep"],
  created_at: "2025-12-01T00:00:00Z",
};

describe("TonightInvitation", () => {
  it("renders the track title", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    expect(screen.getByText("A Kannadagowla in Rupakam")).toBeInTheDocument();
  });

  it("renders the eyebrow label", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    expect(screen.getByText("Tonight")).toBeInTheDocument();
  });

  it("renders the duration in minutes with mono font", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    const duration = screen.getByText("25m");
    expect(duration).toBeInTheDocument();
    expect(duration.className).toContain("font-mono");
  });

  it("shows artist note in quotes when present", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    const notes = screen.getAllByText((_, el) =>
      el?.tagName === "P" &&
      (el?.textContent?.includes("At dawn by the Willamette") ?? false),
    );
    expect(notes.length).toBeGreaterThan(0);
  });

  it("hides artist note when null", () => {
    const trackNoNote = { ...mockTrack, artist_note: null };
    render(
      <TonightInvitation
        track={trackNoNote}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    expect(
      screen.queryByText((_, el) =>
        el?.textContent?.includes("Willamette") ?? false,
      ),
    ).not.toBeInTheDocument();
  });

  it("falls back to 'Untitled track' when title is null", () => {
    const trackNoTitle = { ...mockTrack, title: null };
    render(
      <TonightInvitation
        track={trackNoTitle}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    expect(screen.getByText("Untitled track")).toBeInTheDocument();
  });

  it("calculates duration from track when durationMinutes is null", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={null}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    // 1500s / 60 = 25m
    expect(screen.getByText("25m")).toBeInTheDocument();
  });

  it("links to the correct player route", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/mode/sleep/t1?d=25");
  });

  it("skips duplicate scenario tag in meta line", () => {
    const trackSleepTag = { ...mockTrack, tags: ["sleep", "calm"] };
    render(
      <TonightInvitation
        track={trackSleepTag}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    // Should show "calm" not "sleep" as the tag
    expect(screen.getByText("calm")).toBeInTheDocument();
  });

  it("renders play button glyph", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="sleep"
        durationMinutes={25}
        accentColor="#B08878"
        accentLight="#C49C8B"
        eyebrowLabel="Tonight"
      />,
    );
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("renders with morning config", () => {
    render(
      <TonightInvitation
        track={mockTrack}
        scenario="focus"
        durationMinutes={30}
        accentColor="#C9A54C"
        accentLight="#D9B866"
        eyebrowLabel="This morning"
      />,
    );
    expect(screen.getByText("This morning")).toBeInTheDocument();
    expect(screen.getByText("focus")).toBeInTheDocument();
  });
});
