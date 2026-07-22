import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Sentinel so we can tell when the proxy delegated to session refresh (the
// "serve the app normally" path) vs. issued its own rewrite/redirect.
const SESSION_SENTINEL = new Response(null, {
  headers: { "x-session-refresh": "1" },
});
vi.mock("@/lib/supabase/session", () => ({
  updateSession: vi.fn(async () => SESSION_SENTINEL),
}));

import { proxy } from "@/proxy";

function req(url: string, host: string): NextRequest {
  return new NextRequest(new URL(url), { headers: { host } });
}

const ENV = process.env;
beforeEach(() => {
  process.env = { ...ENV };
});
afterEach(() => {
  process.env = ENV;
  vi.clearAllMocks();
});

describe("proxy host split — disabled (MARKETING_HOST unset)", () => {
  it("delegates every request to session refresh, unchanged", async () => {
    delete process.env.MARKETING_HOST;
    const res = await proxy(req("https://ragaflow.io/", "ragaflow.io"));
    expect(res.headers.get("x-session-refresh")).toBe("1");
  });
});

describe("proxy host split — enabled", () => {
  beforeEach(() => {
    process.env.MARKETING_HOST = "ragaflow.io";
    process.env.APP_HOST = "app.ragaflow.io";
  });

  it("rewrites the apex home to /landing", async () => {
    const res = await proxy(req("https://ragaflow.io/", "ragaflow.io"));
    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite).toBeTruthy();
    expect(new URL(rewrite!).pathname).toBe("/landing");
  });

  it("serves legal pages on the apex without redirect", async () => {
    for (const path of ["/privacy", "/terms", "/support", "/landing"]) {
      const res = await proxy(req(`https://ragaflow.io${path}`, "ragaflow.io"));
      // next() sets no redirect location and no rewrite
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("redirects app routes on the apex to the app host", async () => {
    const res = await proxy(
      req("https://ragaflow.io/mode/focus", "ragaflow.io"),
    );
    const loc = res.headers.get("location");
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.hostname).toBe("app.ragaflow.io");
    expect(u.pathname).toBe("/mode/focus");
  });

  it("never redirects /api on the apex (webhooks keep working)", async () => {
    const res = await proxy(
      req("https://ragaflow.io/api/webhooks/polar", "ragaflow.io"),
    );
    expect(res.headers.get("x-session-refresh")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
  });

  it("serves the app normally on the app host", async () => {
    const res = await proxy(
      req("https://app.ragaflow.io/mode/focus", "app.ragaflow.io"),
    );
    expect(res.headers.get("x-session-refresh")).toBe("1");
  });

  it("canonicalizes /landing on the app host back to /", async () => {
    const res = await proxy(
      req("https://app.ragaflow.io/landing", "app.ragaflow.io"),
    );
    const loc = res.headers.get("location");
    expect(loc).toBeTruthy();
    expect(new URL(loc!).pathname).toBe("/");
  });

  it("serves everything normally on unknown hosts (previews stay reviewable)", async () => {
    const appRes = await proxy(
      req("https://ragaflow-git-x.vercel.app/", "ragaflow-git-x.vercel.app"),
    );
    expect(appRes.headers.get("x-session-refresh")).toBe("1");
    // /landing is reachable on a preview host (no canonical redirect)
    const landingRes = await proxy(
      req(
        "https://ragaflow-git-x.vercel.app/landing",
        "ragaflow-git-x.vercel.app",
      ),
    );
    expect(landingRes.headers.get("x-session-refresh")).toBe("1");
    expect(landingRes.headers.get("location")).toBeNull();
  });
});
