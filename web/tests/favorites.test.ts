import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn() });
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockGetUser },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/ensure-rasika", () => ({
  ensureRasika: vi.fn(),
}));

import { toggleFavoriteTrackClient, toggleFavoriteRagamClient, getPreferencesClient } from "@/lib/favorites";
import { ensureRasika } from "@/lib/ensure-rasika";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null }),
      }),
    }),
    update: mockUpdate,
  });
});

describe("getPreferencesClient", () => {
  it("returns null when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await getPreferencesClient();
    expect(result).toBeNull();
  });

  it("returns rasika preferences for signed-in user", async () => {
    const prefs = {
      rasika_id: "user-123",
      favorite_tracks: ["t1"],
      favorite_ragams: [],
      subscription_status: "free",
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: prefs }),
        }),
      }),
    });

    const result = await getPreferencesClient();
    expect(result).toEqual(prefs);
  });
});

describe("toggleFavoriteTrackClient", () => {
  it("returns null when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await toggleFavoriteTrackClient("t1");
    expect(result).toBeNull();
  });

  it("adds track to favorites when not already favorited", async () => {
    const rasika = { favorite_tracks: ["t2"], favorite_ragams: [] };
    vi.mocked(ensureRasika).mockResolvedValue(rasika as any);

    const eqFn = vi.fn();
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn() }),
      }),
    });

    const result = await toggleFavoriteTrackClient("t1");
    expect(result).toEqual(["t2", "t1"]);
  });

  it("removes track from favorites when already favorited", async () => {
    const rasika = { favorite_tracks: ["t1", "t2"], favorite_ragams: [] };
    vi.mocked(ensureRasika).mockResolvedValue(rasika as any);

    const eqFn = vi.fn();
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn() }),
      }),
    });

    const result = await toggleFavoriteTrackClient("t1");
    expect(result).toEqual(["t2"]);
  });
});

describe("toggleFavoriteRagamClient", () => {
  it("returns null when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await toggleFavoriteRagamClient("r1");
    expect(result).toBeNull();
  });

  it("adds ragam to favorites when not already favorited", async () => {
    const rasika = { favorite_tracks: [], favorite_ragams: [] };
    vi.mocked(ensureRasika).mockResolvedValue(rasika as any);

    const eqFn = vi.fn();
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn() }),
      }),
    });

    const result = await toggleFavoriteRagamClient("r1");
    expect(result).toEqual(["r1"]);
  });

  it("removes ragam from favorites when already favorited", async () => {
    const rasika = { favorite_tracks: [], favorite_ragams: ["r1", "r2"] };
    vi.mocked(ensureRasika).mockResolvedValue(rasika as any);

    const eqFn = vi.fn();
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn() }),
      }),
    });

    const result = await toggleFavoriteRagamClient("r1");
    expect(result).toEqual(["r2"]);
  });
});
