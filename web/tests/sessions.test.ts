import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockGetUser },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { startListeningSession, endListeningSession } from "@/lib/sessions";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
});

describe("startListeningSession", () => {
  it("returns null when no user is signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await startListeningSession("t1", "focus");
    expect(result).toBeNull();
  });

  it("inserts a new listening session and returns the id", async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "session-1" } }),
      }),
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await startListeningSession("t1", "focus", 1500);
    expect(result).toBe("session-1");
    expect(mockFrom).toHaveBeenCalledWith("listening_sessions");
    expect(mockInsert).toHaveBeenCalledWith({
      rasika_id: "user-123",
      track_id: "t1",
      scenario: "focus",
      intended_duration_seconds: 1500,
    });
  });

  it("passes null for intended_duration when not provided", async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "session-2" } }),
      }),
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await startListeningSession("t1", "sleep");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ intended_duration_seconds: null })
    );
  });

  it("returns null when insert fails", async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null }),
      }),
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await startListeningSession("t1", "meditate");
    expect(result).toBeNull();
  });
});

describe("endListeningSession", () => {
  it("updates the session with duration and completion status", async () => {
    const eqFn = vi.fn();
    mockUpdate.mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await endListeningSession("session-1", 1500, true);
    expect(mockFrom).toHaveBeenCalledWith("listening_sessions");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration_seconds: 1500,
        completed: true,
      })
    );
    expect(eqFn).toHaveBeenCalledWith("id", "session-1");
  });

  it("sets ended_at timestamp", async () => {
    const eqFn = vi.fn();
    mockUpdate.mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await endListeningSession("session-1", 600, false);
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.ended_at).toBeDefined();
    // Should be an ISO string
    expect(new Date(updateArg.ended_at).toISOString()).toBe(updateArg.ended_at);
  });
});
