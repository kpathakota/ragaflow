import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

const mockGetUser = vi.fn();
const mockSupabase = {
  auth: { getUser: mockGetUser },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCheckoutsCreate = vi.fn();
vi.mock("@/lib/polar/client", () => ({
  getPolarClient: vi.fn(() => ({
    checkouts: { create: mockCheckoutsCreate },
  })),
}));

import { createClient } from "@/lib/supabase/server";
const mockCreateClient = vi.mocked(createClient);

import { GET } from "@/app/api/checkout/route";

// --- Helpers ---

function makeRequest(url = "http://localhost:3000/api/checkout") {
  return new NextRequest(url);
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateClient.mockResolvedValue(mockSupabase as any);
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "rasika@example.com" } },
    error: null,
  });
  process.env.POLAR_PRODUCT_IDS = "prod-monthly,prod-yearly,prod-lifetime";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

const savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
  savedEnv.POLAR_PRODUCT_IDS = process.env.POLAR_PRODUCT_IDS;
  savedEnv.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
});
afterEach(() => {
  // Restore env vars to prevent leaking between tests/files
  for (const [key, val] of Object.entries(savedEnv)) {
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
  vi.restoreAllMocks();
});

describe("GET /api/checkout", () => {
  describe("authentication", () => {
    it("redirects to /auth when Supabase client is null", async () => {
      mockCreateClient.mockResolvedValue(null as any);
      const res = await GET(makeRequest());
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/auth");
    });

    it("redirects to /auth when getUser returns an error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "invalid token" },
      });
      const res = await GET(makeRequest());
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/auth");
    });

    it("redirects to /auth when user is null", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      const res = await GET(makeRequest());
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/auth");
    });
  });

  describe("product ID parsing", () => {
    it("redirects to /profile when POLAR_PRODUCT_IDS is empty", async () => {
      process.env.POLAR_PRODUCT_IDS = "";
      const res = await GET(makeRequest());
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/profile");
    });

    it("redirects to /profile when POLAR_PRODUCT_IDS is not set", async () => {
      delete process.env.POLAR_PRODUCT_IDS;
      const res = await GET(makeRequest());
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/profile");
    });
  });

  describe("checkout session creation", () => {
    it("creates a Polar checkout session with correct params", async () => {
      mockCheckoutsCreate.mockResolvedValue({
        url: "https://polar.sh/checkout/abc123",
      });

      const res = await GET(makeRequest());

      expect(mockCheckoutsCreate).toHaveBeenCalledWith({
        products: ["prod-monthly", "prod-yearly", "prod-lifetime"],
        externalCustomerId: "user-1",
        customerEmail: "rasika@example.com",
        successUrl: "http://localhost:3000/profile?checkout=success",
      });
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "https://polar.sh/checkout/abc123"
      );
    });

    it("converts null email to undefined via ?? operator", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-2", email: null } },
        error: null,
      });
      mockCheckoutsCreate.mockResolvedValue({
        url: "https://polar.sh/checkout/xyz",
      });

      await GET(makeRequest());

      expect(mockCheckoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: undefined,
        })
      );
    });

    it("uses NEXT_PUBLIC_APP_URL for success redirect", async () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://ragaflow.app";
      mockCheckoutsCreate.mockResolvedValue({
        url: "https://polar.sh/checkout/def",
      });

      await GET(makeRequest());

      expect(mockCheckoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: "https://ragaflow.app/profile?checkout=success",
        })
      );
    });

    it("falls back to localhost when NEXT_PUBLIC_APP_URL is not set", async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      mockCheckoutsCreate.mockResolvedValue({
        url: "https://polar.sh/checkout/ghi",
      });

      await GET(makeRequest());

      expect(mockCheckoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: "http://localhost:3000/profile?checkout=success",
        })
      );
    });
  });

  describe("error handling", () => {
    it("redirects to /profile?checkout=error when Polar API fails", async () => {
      mockCheckoutsCreate.mockRejectedValue(new Error("Polar API error"));

      const res = await GET(makeRequest());

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/profile");
      expect(location.searchParams.get("checkout")).toBe("error");
    });

    it("handles non-Error exceptions gracefully", async () => {
      mockCheckoutsCreate.mockRejectedValue("unexpected string error");

      const res = await GET(makeRequest());

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/profile");
      expect(location.searchParams.get("checkout")).toBe("error");
    });
  });
});
