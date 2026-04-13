import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrackCard } from "@/components/track-card";
import type { Track } from "@/lib/types";
import { useAuth } from "@/lib/auth/auth-context";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, signOut: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockTrack: Track = {
  id: "t1",
  title: "Morning Raag",
  ragam_id: "r1",
  scenarios: ["focus"],
  tags: ["grounding", "calm"],
  description: "A peaceful morning session",
  artist_note: null,
  recorded_date: "2025-12-01",
  location: "Portland studio",
  duration: 2700,
  audio_url: "https://example.com/track.opus",
  download_url: null,
  free: true,
  created_at: "2025-12-01T00:00:00Z",
};

describe("TrackCard guest behavior", () => {
  it("shows favorite button when user is not signed in", () => {
    render(<TrackCard track={mockTrack} scenario="focus" />);
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
  });

  it("redirects guest to /auth?reason=favorites on favorite click", () => {
    render(<TrackCard track={mockTrack} scenario="focus" />);
    fireEvent.click(screen.getByLabelText("Add to favorites"));
    expect(mockPush).toHaveBeenCalledWith("/auth?reason=favorites");
  });

  it("shows favorite button even when onToggleFavorite is undefined", () => {
    render(
      <TrackCard track={mockTrack} scenario="focus" onToggleFavorite={undefined} />
    );
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
  });
});

describe("TrackCard signed-in behavior", () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", email: "test@test.com" } as ReturnType<typeof useAuth>["user"],
      loading: false,
      signOut: vi.fn(),
    });
  });

  it("calls onToggleFavorite for signed-in user instead of redirecting", () => {
    render(
      <TrackCard
        track={mockTrack}
        scenario="focus"
        onToggleFavorite={mockToggle}
      />
    );
    fireEvent.click(screen.getByLabelText("Add to favorites"));
    expect(mockToggle).toHaveBeenCalledWith("t1");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows filled heart when track is in favoriteTrackIds", () => {
    render(
      <TrackCard
        track={mockTrack}
        scenario="focus"
        favoriteTrackIds={["t1"]}
        onToggleFavorite={mockToggle}
      />
    );
    expect(screen.getByLabelText("Remove from favorites")).toBeInTheDocument();
    expect(screen.getByText("♥")).toBeInTheDocument();
  });

  it("shows unfilled heart when track is not in favoriteTrackIds", () => {
    render(
      <TrackCard
        track={mockTrack}
        scenario="focus"
        favoriteTrackIds={[]}
        onToggleFavorite={mockToggle}
      />
    );
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
    expect(screen.getByText("♡")).toBeInTheDocument();
  });

  it("hides favorite button when user is signed in but onToggleFavorite is not provided", () => {
    render(
      <TrackCard track={mockTrack} scenario="focus" />
    );
    expect(screen.queryByLabelText("Add to favorites")).not.toBeInTheDocument();
  });
});

describe("TrackCard rendering", () => {
  it("shows track title as headline", () => {
    render(<TrackCard track={mockTrack} scenario="focus" />);
    expect(screen.getByText("Morning Raag")).toBeInTheDocument();
  });

  it("shows duration in minutes", () => {
    render(<TrackCard track={mockTrack} scenario="focus" />);
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
  });

  it("shows ragam name when provided", () => {
    render(<TrackCard track={mockTrack} scenario="focus" ragamName="Yaman" />);
    expect(screen.getByText(/Yaman/)).toBeInTheDocument();
  });

  it("shows Premium badge for non-free tracks", () => {
    const premiumTrack = { ...mockTrack, free: false };
    render(<TrackCard track={premiumTrack} scenario="focus" />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("links to the correct session player URL", () => {
    render(<TrackCard track={mockTrack} scenario="focus" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/mode/focus/t1");
  });
});
