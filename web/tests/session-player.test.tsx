import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SessionPlayer } from "@/app/mode/[scenario]/[trackId]/session-player";
import type { Track, Ragam } from "@/lib/types";
import { useAuth } from "@/lib/auth/auth-context";

// Mock all external dependencies
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, signOut: vi.fn() })),
}));

vi.mock("@/lib/favorites", () => ({
  toggleFavoriteTrackClient: vi.fn(),
  getPreferencesClient: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/preferences", () => ({
  setDefaultTrackClient: vi.fn(),
  setCustomDurationClient: vi.fn(),
}));

vi.mock("@/lib/sessions", () => ({
  startListeningSession: vi.fn().mockResolvedValue("session-1"),
  endListeningSession: vi.fn(),
}));

vi.mock("@/lib/certifications", () => ({
  computeCountableSeconds: vi.fn().mockReturnValue(0),
  upsertCertificationClient: vi.fn(),
  getTierInfo: vi.fn().mockReturnValue({
    currentLabel: null,
    currentLevel: 0,
    nextLabel: "Bronze",
    nextThreshold: 36000,
    progressPercent: 0,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock HTMLAudioElement
beforeEach(() => {
  vi.clearAllMocks();
  // Mock audio element methods
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
  // Clear localStorage
  localStorage.clear();
});

const mockTrack: Track = {
  id: "t1",
  title: "Morning Raag",
  ragam_id: "r1",
  scenarios: ["focus", "meditate"],
  tags: ["grounding", "calm"],
  description: "A peaceful morning session by the river",
  artist_note: "Recorded at dawn, birds singing in the background",
  recorded_date: "2025-12-01",
  location: "Portland studio",
  duration: 2700,
  audio_url: "https://example.com/track.opus",
  download_url: null,
  free: true,
  created_at: "2025-12-01T00:00:00Z",
};

const mockRagam: Ragam = {
  id: "r1",
  name: "Yaman",
  description: "Evening raga",
  time_of_day: "evening",
};

describe("SessionPlayer", () => {
  it("renders track title as heading when title is present", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("Morning Raag")).toBeInTheDocument();
  });

  it("renders ragam name as subtitle when track has a title", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    // Title is the heading, ragam name appears as subtitle
    expect(screen.getByText("Morning Raag")).toBeInTheDocument();
    expect(screen.getByText("Yaman")).toBeInTheDocument();
  });

  it("renders track description", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(
      screen.getByText("A peaceful morning session by the river")
    ).toBeInTheDocument();
  });

  it("falls back to ragam name when track has no title", () => {
    const trackWithoutTitle = { ...mockTrack, title: null };
    render(
      <SessionPlayer track={trackWithoutTitle} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("Yaman")).toBeInTheDocument();
  });

  it("does not show ragam subtitle when track has no title", () => {
    const trackWithoutTitle = { ...mockTrack, title: null };
    const { container } = render(
      <SessionPlayer track={trackWithoutTitle} ragam={mockRagam} scenario="focus" />
    );
    // Ragam name should appear as the heading, not duplicated as a subtitle
    const yamanElements = screen.getAllByText("Yaman");
    expect(yamanElements).toHaveLength(1);
  });

  it("falls back to track title when ragam is undefined", () => {
    render(
      <SessionPlayer
        track={mockTrack}
        ragam={undefined}
        scenario="focus"
      />
    );
    expect(screen.getByText("Morning Raag")).toBeInTheDocument();
  });

  it("shows Untitled when both title and ragam are missing", () => {
    const trackWithoutTitle = { ...mockTrack, title: null };
    render(
      <SessionPlayer track={trackWithoutTitle} ragam={undefined} scenario="focus" />
    );
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("shows duration pills (25m, 45m, custom)", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("25m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
  });

  it("shows play button in idle state", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("shows back link to scenario page", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    const backLink = screen.getByText("← Back");
    expect(backLink).toHaveAttribute("href", "/mode/focus");
  });

  it("shows favorite button for guest and redirects to auth on click", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    const btn = screen.getByLabelText("Add to favorites");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith("/auth?reason=favorites");
  });

  it("shows artist note toggle when track has artist_note", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("From the session")).toBeInTheDocument();
  });

  it("does not show artist note toggle when track has no artist_note", () => {
    const trackWithoutNote = { ...mockTrack, artist_note: null };
    render(
      <SessionPlayer
        track={trackWithoutNote}
        ragam={mockRagam}
        scenario="focus"
      />
    );
    expect(screen.queryByText("From the session")).not.toBeInTheDocument();
  });

  it("shows artist note expanded by default and collapses on click", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(
      screen.getByText("Recorded at dawn, birds singing in the background")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("From the session"));
    expect(
      screen.queryByText("Recorded at dawn, birds singing in the background")
    ).not.toBeInTheDocument();
  });

  it("starts audio playback when play is clicked", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("shows timer display when session is running", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    // Should show 25:00 (default duration)
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });

  it("shows reset button when session is running", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    expect(screen.getByText("reset")).toBeInTheDocument();
  });

  it("allows switching duration before starting", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    fireEvent.click(screen.getByText("45m"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    // Verify the session actually uses 45 minutes
    expect(screen.getByText("45:00")).toBeInTheDocument();
  });

  it("uses initialDuration prop when provided", async () => {
    render(
      <SessionPlayer
        track={mockTrack}
        ragam={mockRagam}
        scenario="focus"
        initialDuration={10}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("renders audio element with correct src", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    const audio = document.querySelector("audio");
    expect(audio).toBeTruthy();
    expect(audio?.getAttribute("src")).toBe("https://example.com/track.opus");
    expect(audio?.hasAttribute("loop")).toBe(true);
  });
});

describe("SessionPlayer with authenticated user", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      loading: false,
      signOut: vi.fn(),
    });
  });

  it("shows favorite button for signed-in user", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
  });

  it("shows unfilled heart when track is not favorited", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("♡")).toBeInTheDocument();
  });
});

describe("SessionPlayer full-track mode", () => {
  it("shows Full track button when track has positive duration", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.getByText("Full track")).toBeInTheDocument();
  });

  it("hides Full track button when track duration is 0", () => {
    const zeroTrack = { ...mockTrack, duration: 0 };
    render(
      <SessionPlayer track={zeroTrack} ragam={mockRagam} scenario="focus" />
    );
    expect(screen.queryByText("Full track")).not.toBeInTheDocument();
  });

  it("sets timer to track duration when Full track is selected and play is clicked", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    fireEvent.click(screen.getByText("Full track"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    // mockTrack.duration = 2700s = 45:00
    expect(screen.getByText("45:00")).toBeInTheDocument();
  });

  it("disables audio loop in full-track mode", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    fireEvent.click(screen.getByText("Full track"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    const audio = document.querySelector("audio");
    expect(audio?.loop).toBe(false);
  });

  it("does not save full-track selection to localStorage", () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    fireEvent.click(screen.getByText("Full track"));
    expect(localStorage.getItem("ragaflow:lastDuration")).toBeNull();
  });

  it("restores loop when switching back to fixed duration after full-track", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    fireEvent.click(screen.getByText("Full track"));
    fireEvent.click(screen.getByText("25m"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    const audio = document.querySelector("audio");
    expect(audio?.loop).toBe(true);
  });
});

describe("SessionPlayer reset behavior", () => {
  it("reset pauses audio and returns to idle", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    // Start session
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    expect(screen.getByText("reset")).toBeInTheDocument();

    // Click reset
    await act(async () => {
      fireEvent.click(screen.getByText("reset"));
    });

    // Should be back to idle — play button and duration pills visible
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByText("▶")).toBeInTheDocument();
    expect(screen.getByText("25m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
  });

  it("reset clears isFullTrack so next play uses timed duration", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    // Select full track and start
    fireEvent.click(screen.getByText("Full track"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    // Verify we're in full-track mode (45:00 = 2700s)
    expect(screen.getByText("45:00")).toBeInTheDocument();

    // Reset
    await act(async () => {
      fireEvent.click(screen.getByText("reset"));
    });

    // Select 25m explicitly and start again — should use timed duration, not full track
    fireEvent.click(screen.getByText("25m"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });

  it("reset does not call endListeningSession", async () => {
    const { endListeningSession } = await import("@/lib/sessions");
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      loading: false,
      signOut: vi.fn(),
    });
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    vi.mocked(endListeningSession).mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText("reset"));
    });

    expect(endListeningSession).not.toHaveBeenCalled();
  });

  it("reset from paused state returns to idle", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    // Start then pause
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause session"));
    });
    expect(screen.getByLabelText("Resume session")).toBeInTheDocument();

    // Reset from paused state
    await act(async () => {
      fireEvent.click(screen.getByText("reset"));
    });

    // Should be back to idle
    expect(screen.getByText("▶")).toBeInTheDocument();
    expect(screen.getByText("25m")).toBeInTheDocument();
  });
});

describe("SessionPlayer aria-labels", () => {
  it("pause button has aria-label 'Pause session'", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    expect(screen.getByLabelText("Pause session")).toBeInTheDocument();
  });

  it("resume button has aria-label 'Resume session'", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause session"));
    });
    expect(screen.getByLabelText("Resume session")).toBeInTheDocument();
  });
});

describe("SessionPlayer progress ring (regression: pause/resume click interception)", () => {
  // Regression guard for the bug where the circular progress ring stopped
  // pause/resume from working. The ring is an absolutely-positioned SVG that
  // paints on top of the play/pause button (positioned elements paint above
  // static siblings regardless of DOM order), so without `pointer-events-none`
  // it intercepts every click and the button beneath never fires.
  //
  // NOTE: a behavioral `fireEvent.click(pauseButton)` test does NOT catch this —
  // jsdom has no layout/hit-testing, so fireEvent dispatches straight to the
  // target node and the overlay is ignored (which is exactly why the existing
  // pause/resume tests stayed green through the regression). The only reliable
  // jsdom guard is to assert the overlay does not capture pointer events.
  function getProgressRing(container: HTMLElement): SVGSVGElement {
    const svg = container.querySelector('svg[aria-hidden="true"]');
    if (!svg) throw new Error("progress ring SVG not found in running state");
    return svg as SVGSVGElement;
  }

  it("running-state progress ring does not intercept clicks (pointer-events-none)", async () => {
    const { container } = render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });

    const ring = getProgressRing(container);
    // The ring overlaps the button (same relative container) by design...
    expect(ring.classList.contains("absolute")).toBe(true);
    // ...so it MUST let clicks pass through to the button beneath.
    expect(ring.classList.contains("pointer-events-none")).toBe(true);
  });

  it("paused-state progress ring does not intercept clicks (pointer-events-none)", async () => {
    const { container } = render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Pause session"));
    });

    const ring = getProgressRing(container);
    expect(ring.classList.contains("absolute")).toBe(true);
    expect(ring.classList.contains("pointer-events-none")).toBe(true);
  });
});

describe("SessionPlayer full-track completion", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123", email: "test@example.com" } as any,
      loading: false,
      signOut: vi.fn(),
    });
  });

  it("full-track mode starts timer at track duration, not fixed duration", async () => {
    // Use a track with non-round duration to distinguish full-track vs timed
    const oddTrack = { ...mockTrack, duration: 1830 }; // 30.5 min → rounds to 31
    render(
      <SessionPlayer track={oddTrack} ragam={mockRagam} scenario="focus" />
    );
    fireEvent.click(screen.getByText("Full track"));
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });

    // Full track uses track.duration (1830s = 30:30), not rounded minutes * 60
    expect(screen.getByText("30:30")).toBeInTheDocument();
  });

  it("timed mode starts timer at selected duration, ignoring track length", async () => {
    render(
      <SessionPlayer track={mockTrack} ragam={mockRagam} scenario="focus" />
    );
    // Default 25m selected, start without clicking Full track
    await act(async () => {
      fireEvent.click(screen.getByText("▶"));
    });

    // Should show 25:00 (25 * 60 = 1500s), not 45:00 (track.duration = 2700s)
    expect(screen.getByText("25:00")).toBeInTheDocument();
  });
});
