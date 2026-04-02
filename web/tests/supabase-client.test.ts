import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test that createClient returns null when env vars are missing
// and returns a client when they are set

describe("supabase/client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeNull();
  });

  it("returns null when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeNull();
  });

  it("returns a client when both env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key";

    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).not.toBeNull();
  });
});
