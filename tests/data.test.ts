import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockContains = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import { getAllRagams, getRagamById, getAllTracks, getTracksByScenario, getTrackById } from "@/lib/data";

beforeEach(() => {
  vi.clearAllMocks();

  // Default chain: from().select() → { data }
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ data: null, eq: mockEq, contains: mockContains });
  mockEq.mockReturnValue({ data: null, single: mockSingle });
  mockContains.mockReturnValue({ data: null });
  mockSingle.mockReturnValue({ data: null });
});

describe("getAllRagams", () => {
  it("returns ragams from supabase", async () => {
    const ragams = [
      { id: "r1", name: "Yaman", description: "Evening", time_of_day: "evening" },
      { id: "r2", name: "Bhairavi", description: "Morning", time_of_day: "morning" },
    ];
    mockSelect.mockReturnValue({ data: ragams });

    const result = await getAllRagams();
    expect(mockFrom).toHaveBeenCalledWith("ragams");
    expect(result).toEqual(ragams);
  });

  it("returns empty array when no data", async () => {
    mockSelect.mockReturnValue({ data: null });
    const result = await getAllRagams();
    expect(result).toEqual([]);
  });

  it("returns empty array when data is empty", async () => {
    mockSelect.mockReturnValue({ data: [] });
    const result = await getAllRagams();
    expect(result).toEqual([]);
  });
});

describe("getRagamById", () => {
  it("returns a single ragam", async () => {
    const ragam = { id: "r1", name: "Yaman", description: "Evening", time_of_day: "evening" };
    mockSingle.mockReturnValue({ data: ragam });

    const result = await getRagamById("r1");
    expect(mockFrom).toHaveBeenCalledWith("ragams");
    expect(mockEq).toHaveBeenCalledWith("id", "r1");
    expect(result).toEqual(ragam);
  });

  it("returns undefined when not found", async () => {
    mockSingle.mockReturnValue({ data: null });
    const result = await getRagamById("nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("getAllTracks", () => {
  it("returns tracks from supabase", async () => {
    const tracks = [{ id: "t1", title: "Test", ragam_id: "r1" }];
    mockSelect.mockReturnValue({ data: tracks });

    const result = await getAllTracks();
    expect(mockFrom).toHaveBeenCalledWith("tracks");
    expect(result).toEqual(tracks);
  });

  it("returns empty array when no data", async () => {
    mockSelect.mockReturnValue({ data: null });
    const result = await getAllTracks();
    expect(result).toEqual([]);
  });
});

describe("getTracksByScenario", () => {
  it("filters tracks by scenario using contains", async () => {
    const tracks = [{ id: "t1", scenarios: ["focus", "meditate"] }];
    mockContains.mockReturnValue({ data: tracks });

    const result = await getTracksByScenario("focus");
    expect(mockFrom).toHaveBeenCalledWith("tracks");
    expect(mockContains).toHaveBeenCalledWith("scenarios", ["focus"]);
    expect(result).toEqual(tracks);
  });

  it("returns empty array when no tracks match scenario", async () => {
    mockContains.mockReturnValue({ data: [] });
    const result = await getTracksByScenario("sleep");
    expect(result).toEqual([]);
  });
});

describe("getTrackById", () => {
  it("returns a single track", async () => {
    const track = { id: "t1", title: "Dawn", ragam_id: "r1" };
    mockSingle.mockReturnValue({ data: track });

    const result = await getTrackById("t1");
    expect(mockFrom).toHaveBeenCalledWith("tracks");
    expect(mockEq).toHaveBeenCalledWith("id", "t1");
    expect(result).toEqual(track);
  });

  it("returns undefined when not found", async () => {
    mockSingle.mockReturnValue({ data: null });
    const result = await getTrackById("nonexistent");
    expect(result).toBeUndefined();
  });
});
