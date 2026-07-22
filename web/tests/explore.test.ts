import { describe, it, expect } from "vitest";
import type { Track, Ragam } from "@/lib/types";
import {
  trackMatchesDuration,
  trackMatchesAccess,
  trackMatchesQuery,
  filterTracks,
  activeFilterCount,
  EMPTY_FILTERS,
} from "@/lib/explore";

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "t1",
    title: "Fiery Todi",
    ragam_id: "r1",
    scenarios: ["focus"],
    tags: ["intense", "morning"],
    description: "A bright morning session",
    artist_note: null,
    recorded_date: "2025-12-01",
    location: "Chennai",
    duration: 1800, // 30 min
    audio_url: "https://example.com/a.opus",
    download_url: null,
    free: true,
    featured: false,
    featured_scenarios: [],
    created_at: "2025-12-01T00:00:00Z",
    ...overrides,
  };
}

const ragam: Ragam = {
  id: "r1",
  name: "Todi",
  description: "An introspective, devotional morning ragam",
  time_of_day: "Morning",
};
const ragamMap = new Map<string, Ragam>([[ragam.id, ragam]]);

describe("trackMatchesDuration", () => {
  it("matches everything for 'any'", () => {
    expect(trackMatchesDuration(makeTrack({ duration: 60 }), "any")).toBe(true);
    expect(trackMatchesDuration(makeTrack({ duration: 9999 }), "any")).toBe(true);
  });

  it("'short' is strictly under 20 minutes", () => {
    expect(trackMatchesDuration(makeTrack({ duration: 19 * 60 }), "short")).toBe(true);
    expect(trackMatchesDuration(makeTrack({ duration: 20 * 60 }), "short")).toBe(false);
  });

  it("'medium' is 20–40 minutes inclusive", () => {
    expect(trackMatchesDuration(makeTrack({ duration: 20 * 60 }), "medium")).toBe(true);
    expect(trackMatchesDuration(makeTrack({ duration: 40 * 60 }), "medium")).toBe(true);
    expect(trackMatchesDuration(makeTrack({ duration: 41 * 60 }), "medium")).toBe(false);
    expect(trackMatchesDuration(makeTrack({ duration: 19 * 60 }), "medium")).toBe(false);
  });

  it("'long' is strictly over 40 minutes", () => {
    expect(trackMatchesDuration(makeTrack({ duration: 41 * 60 }), "long")).toBe(true);
    expect(trackMatchesDuration(makeTrack({ duration: 40 * 60 }), "long")).toBe(false);
  });

  it("buckets are mutually exclusive and exhaustive at any duration", () => {
    for (const seconds of [0, 19 * 60, 20 * 60, 30 * 60, 40 * 60, 41 * 60, 120 * 60]) {
      const t = makeTrack({ duration: seconds });
      const hits = (["short", "medium", "long"] as const).filter((f) =>
        trackMatchesDuration(t, f)
      );
      expect(hits).toHaveLength(1);
    }
  });
});

describe("trackMatchesAccess", () => {
  it("'all' matches both free and premium", () => {
    expect(trackMatchesAccess(makeTrack({ free: true }), "all")).toBe(true);
    expect(trackMatchesAccess(makeTrack({ free: false }), "all")).toBe(true);
  });

  it("'free' matches only free tracks", () => {
    expect(trackMatchesAccess(makeTrack({ free: true }), "free")).toBe(true);
    expect(trackMatchesAccess(makeTrack({ free: false }), "free")).toBe(false);
  });

  it("'premium' matches only non-free tracks", () => {
    expect(trackMatchesAccess(makeTrack({ free: false }), "premium")).toBe(true);
    expect(trackMatchesAccess(makeTrack({ free: true }), "premium")).toBe(false);
  });
});

describe("trackMatchesQuery", () => {
  it("matches everything for an empty or whitespace query", () => {
    expect(trackMatchesQuery(makeTrack(), ragam, "")).toBe(true);
    expect(trackMatchesQuery(makeTrack(), ragam, "   ")).toBe(true);
  });

  it("matches on the track title, case-insensitively", () => {
    expect(trackMatchesQuery(makeTrack(), ragam, "fiery")).toBe(true);
    expect(trackMatchesQuery(makeTrack(), ragam, "FIERY")).toBe(true);
  });

  it("matches on the ragam name even when the title differs", () => {
    expect(trackMatchesQuery(makeTrack({ title: "Untitled" }), ragam, "todi")).toBe(true);
  });

  it("matches on the ragam description (mood discovery)", () => {
    expect(trackMatchesQuery(makeTrack(), ragam, "devotional")).toBe(true);
  });

  it("matches on a tag", () => {
    expect(trackMatchesQuery(makeTrack(), ragam, "morning")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(trackMatchesQuery(makeTrack(), ragam, "saxophone")).toBe(false);
  });

  it("tolerates a missing ragam", () => {
    // With no ragam, only the track's own fields can match.
    expect(trackMatchesQuery(makeTrack({ title: "Untitled" }), undefined, "untitled")).toBe(true);
    expect(trackMatchesQuery(makeTrack({ title: "Untitled" }), undefined, "todi")).toBe(false);
  });
});

describe("filterTracks", () => {
  const tracks = [
    makeTrack({ id: "a", title: "Fiery Todi", tags: ["intense"], duration: 1800, free: true }),
    makeTrack({ id: "b", title: "Calm Yaman", ragam_id: "r1", tags: ["calm"], duration: 600, free: false }),
    makeTrack({ id: "c", title: "Long Bhairavi", ragam_id: "r1", tags: ["calm"], duration: 3600, free: true }),
  ];

  it("returns all tracks with empty filters", () => {
    expect(filterTracks(tracks, ragamMap, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("combines tag, duration, access, and query (AND semantics)", () => {
    const result = filterTracks(tracks, ragamMap, {
      query: "",
      tag: "calm",
      duration: "long",
      access: "free",
    });
    expect(result.map((t) => t.id)).toEqual(["c"]);
  });

  it("narrows by query alongside other filters", () => {
    const result = filterTracks(tracks, ragamMap, {
      query: "fiery",
      tag: null,
      duration: "any",
      access: "all",
    });
    expect(result.map((t) => t.id)).toEqual(["a"]);
  });

  it("returns nothing when filters exclude all tracks", () => {
    const result = filterTracks(tracks, ragamMap, {
      query: "",
      tag: "intense",
      duration: "short",
      access: "all",
    });
    expect(result).toHaveLength(0);
  });
});

describe("activeFilterCount", () => {
  it("is 0 for the empty filter set", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it("ignores a whitespace-only query", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: "   " })).toBe(0);
  });

  it("counts each non-default filter", () => {
    expect(activeFilterCount({ query: "x", tag: "calm", duration: "short", access: "free" })).toBe(4);
    expect(activeFilterCount({ ...EMPTY_FILTERS, tag: "calm" })).toBe(1);
    expect(activeFilterCount({ ...EMPTY_FILTERS, duration: "long" })).toBe(1);
  });
});
