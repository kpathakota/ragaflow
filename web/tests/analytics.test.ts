import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Must import after mock setup
import { trackEvent, getAnonymousId } from "@/lib/analytics";

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  mockFrom.mockReturnValue({ insert: mockInsert });
});

describe("getAnonymousId", () => {
  it("returns a valid UUID string", () => {
    const id = getAnonymousId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("returns the same ID on multiple calls (stable per session)", () => {
    expect(getAnonymousId()).toBe(getAnonymousId());
  });
});

describe("trackEvent", () => {
  it("inserts an event with correct fields", async () => {
    await trackEvent("app_open");

    expect(mockFrom).toHaveBeenCalledWith("analytics_events");
    expect(mockInsert).toHaveBeenCalledWith({
      anonymous_id: getAnonymousId(),
      rasika_id: null,
      event_type: "app_open",
      platform: "web",
      metadata: {},
    });
  });

  it("includes metadata when provided", async () => {
    await trackEvent("scenario_view", { scenario: "focus" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "scenario_view",
        metadata: { scenario: "focus" },
      })
    );
  });

  it("includes rasika_id when provided", async () => {
    await trackEvent("auth_error", { method: "sign_in", error: "bad pw" }, "user-123");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rasika_id: "user-123",
        event_type: "auth_error",
        metadata: { method: "sign_in", error: "bad pw" },
      })
    );
  });

  it("sets rasika_id to null when not provided", async () => {
    await trackEvent("app_open");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rasika_id: null })
    );
  });

  it("always sets platform to web", async () => {
    await trackEvent("playback_error", { track_id: "t1", error: "failed" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ platform: "web" })
    );
  });
});

describe("trackEvent when supabase unavailable", () => {
  it("does not throw when createClient returns null", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    vi.mocked(createClient).mockReturnValueOnce(null);

    // Should not throw
    await trackEvent("app_open");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
