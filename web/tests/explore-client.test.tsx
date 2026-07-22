import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ExploreClient } from "@/app/explore/explore-client";
import type { Track, Ragam } from "@/lib/types";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, signOut: vi.fn() })),
}));

vi.mock("@/lib/favorites", () => ({
  getPreferencesClient: vi.fn(() => Promise.resolve(null)),
  toggleFavoriteTrackClient: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTrack(o: Partial<Track> & { id: string }): Track {
  return {
    title: "Untitled",
    ragam_id: "r1",
    scenarios: ["focus"],
    tags: [],
    description: "",
    artist_note: null,
    recorded_date: "2025-12-01",
    location: null,
    duration: 1800,
    audio_url: "https://example.com/a.opus",
    download_url: null,
    free: true,
    featured: false,
    featured_scenarios: [],
    created_at: "2025-12-01T00:00:00Z",
    ...o,
  };
}

const ragams: Ragam[] = [
  { id: "r1", name: "Todi", description: "Introspective morning ragam", time_of_day: "Morning" },
  { id: "r2", name: "Yaman", description: "Serene evening ragam", time_of_day: "Evening" },
];

const tracks: Track[] = [
  makeTrack({ id: "a", title: "Fiery Todi", ragam_id: "r1", tags: ["intense"], duration: 1800, free: true }),
  makeTrack({ id: "b", title: "Calm Yaman", ragam_id: "r2", tags: ["calm"], duration: 600, free: false }),
];

describe("ExploreClient search & filters", () => {
  it("renders both ragam groups by default", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    expect(screen.getByRole("heading", { name: "Todi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Yaman" })).toBeInTheDocument();
  });

  it("surfaces the ragam description as a mood descriptor", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    expect(screen.getByText("Introspective morning ragam")).toBeInTheDocument();
  });

  it("filters by search query across title and ragam", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    fireEvent.change(screen.getByLabelText("Search tracks"), {
      target: { value: "fiery" },
    });
    expect(screen.getByText("Fiery Todi")).toBeInTheDocument();
    expect(screen.queryByText("Calm Yaman")).not.toBeInTheDocument();
  });

  it("filters by premium access", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    fireEvent.click(screen.getByRole("button", { name: "Premium" }));
    expect(screen.getByText("Calm Yaman")).toBeInTheDocument();
    expect(screen.queryByText("Fiery Todi")).not.toBeInTheDocument();
  });

  it("shows the active filter count and clears all filters", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    // "calm" + "Under 20m" both match Calm Yaman (10m), so results remain and
    // only the filter-bar Clear button is present.
    fireEvent.change(screen.getByLabelText("Search tracks"), {
      target: { value: "calm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Under 20m" }));
    expect(screen.getByText("2 filters active")).toBeInTheDocument();
    expect(screen.queryByText("Fiery Todi")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.queryByText(/filters? active/)).not.toBeInTheDocument();
    expect(screen.getByText("Fiery Todi")).toBeInTheDocument();
    expect(screen.getByText("Calm Yaman")).toBeInTheDocument();
  });

  it("shows an empty state with a clear action when nothing matches", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    fireEvent.change(screen.getByLabelText("Search tracks"), {
      target: { value: "saxophone" },
    });
    expect(screen.getByText("No tracks match these filters.")).toBeInTheDocument();
  });

  it("tags track links with from=explore so the player can return here", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    const card = screen.getByText("Fiery Todi").closest("a")!;
    expect(card).toHaveAttribute("href", "/mode/focus/a?from=explore");
  });

  it("counts a singular filter correctly", () => {
    render(<ExploreClient tracks={tracks} ragams={ragams} />);
    fireEvent.click(screen.getByRole("button", { name: "Free" }));
    const group = screen.getByText("1 filter active");
    expect(within(group.parentElement!).getByText("Clear filters")).toBeInTheDocument();
  });
});
