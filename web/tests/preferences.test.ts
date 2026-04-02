import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockGetUser },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { setDefaultTrackClient, setCustomDurationClient } from "@/lib/preferences";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
});

describe("setDefaultTrackClient", () => {
  it("returns false when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await setDefaultTrackClient("focus", "t1");
    expect(result).toBe(false);
  });

  it("updates existing rasika row with default track", async () => {
    const eqFn = vi.fn();
    mockUpdate.mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "row-1" } }),
        }),
      }),
      update: mockUpdate,
    });

    const result = await setDefaultTrackClient("focus", "t1", 1500);
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      default_focus_track: "t1",
      default_focus_duration: 1500,
    });
  });

  it("inserts new rasika row when none exists", async () => {
    mockInsert.mockReturnValue({});
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      insert: mockInsert,
    });

    const result = await setDefaultTrackClient("sleep", "t2");
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      rasika_id: "user-123",
      default_sleep_track: "t2",
      default_sleep_duration: null,
    });
  });

  it("maps scenario to correct column names", async () => {
    const eqFn = vi.fn();
    mockUpdate.mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "row-1" } }),
        }),
      }),
      update: mockUpdate,
    });

    await setDefaultTrackClient("meditate", "t3", 2700);
    expect(mockUpdate).toHaveBeenCalledWith({
      default_meditate_track: "t3",
      default_meditate_duration: 2700,
    });
  });
});

describe("setCustomDurationClient", () => {
  it("returns false when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await setCustomDurationClient(30);
    expect(result).toBe(false);
  });

  it("updates existing rasika with custom duration", async () => {
    const eqFn = vi.fn();
    mockUpdate.mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "row-1" } }),
        }),
      }),
      update: mockUpdate,
    });

    const result = await setCustomDurationClient(30);
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ custom_duration: 30 });
  });

  it("inserts new rasika when none exists", async () => {
    mockInsert.mockReturnValue({});
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      insert: mockInsert,
    });

    const result = await setCustomDurationClient(60);
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      rasika_id: "user-123",
      custom_duration: 60,
    });
  });
});
