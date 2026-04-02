import { describe, it, expect, vi } from "vitest";
import { ensureRasika } from "@/lib/ensure-rasika";

describe("ensureRasika", () => {
  it("returns existing rasika when found", async () => {
    const existing = {
      rasika_id: "user-123",
      favorite_tracks: ["t1"],
      favorite_ragams: [],
      subscription_status: "free",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing }),
          }),
        }),
        insert: vi.fn(),
      }),
    };

    const result = await ensureRasika(mockSupabase as any, "user-123");
    expect(result).toEqual(existing);
  });

  it("creates new rasika when none exists", async () => {
    const created = {
      rasika_id: "user-456",
      favorite_tracks: [],
      favorite_ragams: [],
      subscription_status: "free",
    };

    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: created }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
        insert: insertFn,
      }),
    };

    const result = await ensureRasika(mockSupabase as any, "user-456");
    expect(result).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith({ rasika_id: "user-456" });
  });

  it("is idempotent — returns same result on repeated calls", async () => {
    const existing = {
      rasika_id: "user-123",
      favorite_tracks: [],
      favorite_ragams: [],
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing }),
          }),
        }),
      }),
    };

    const result1 = await ensureRasika(mockSupabase as any, "user-123");
    const result2 = await ensureRasika(mockSupabase as any, "user-123");
    expect(result1).toEqual(result2);
  });
});
