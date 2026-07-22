import { updateSession } from "@/lib/supabase/session";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Marketing pages that live on the apex (landing) domain. Everything else is
 * "the app" and belongs on the app subdomain.
 */
const MARKETING_PATHS = ["/landing", "/terms", "/privacy", "/support"];

function isMarketingPath(pathname: string): boolean {
  return MARKETING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Host-based split between the landing site and the web app.
 *
 * Controlled entirely by env vars, and a NO-OP unless `MARKETING_HOST` is set:
 *
 *   MARKETING_HOST=ragaflow.io      apex/landing domain
 *   APP_HOST=app.ragaflow.io        web-app domain
 *
 * When unset (local dev, previews, and today's single-domain production) the
 * app serves at `/` exactly as before — so this is safe to merge before the
 * domains are configured. Preview deployments (whose host matches neither) also
 * serve everything normally, so `/landing` stays reviewable there.
 */
export async function proxy(request: NextRequest) {
  const marketingHost = process.env.MARKETING_HOST?.toLowerCase();

  // Split disabled → original behavior (session refresh only).
  if (!marketingHost) {
    return await updateSession(request);
  }

  const appHost = process.env.APP_HOST?.toLowerCase();
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const { pathname } = request.nextUrl;

  const isMarketingHost =
    host === marketingHost || host === `www.${marketingHost}`;

  if (isMarketingHost) {
    // API routes (e.g. Polar webhooks) must keep working on whichever domain
    // they're pointed at — never redirect them.
    if (pathname.startsWith("/api")) {
      return await updateSession(request);
    }
    // Home → the landing page.
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }
    // Landing + legal pages are served here.
    if (isMarketingPath(pathname)) {
      return NextResponse.next();
    }
    // Any actual app route requested on the apex → send it to the app domain.
    if (appHost) {
      const url = request.nextUrl.clone();
      url.hostname = appHost;
      url.port = "";
      url.protocol = "https:";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // On the app domain, keep the landing canonical to the apex: bounce `/landing`
  // to the app home. (Skipped on preview/unknown hosts so it stays reviewable.)
  if (appHost && host === appHost && pathname === "/landing") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|audio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
