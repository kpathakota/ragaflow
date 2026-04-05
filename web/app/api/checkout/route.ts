import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPolarClient } from "@/lib/polar/client";

export async function GET(req: NextRequest) {
  // 1. Authenticate
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  // 2. Parse product IDs
  const productIds = (process.env.POLAR_PRODUCT_IDS ?? "")
    .split(",")
    .filter(Boolean);

  if (productIds.length === 0) {
    console.error("[checkout] POLAR_PRODUCT_IDS is not set");
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  // 3. Create checkout session via Polar SDK
  const polar = getPolarClient();
  if (!process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === "production") {
    console.error("[checkout] NEXT_PUBLIC_APP_URL is not set in production");
    return NextResponse.redirect(new URL("/profile?checkout=error", req.url));
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const checkout = await polar.checkouts.create({
      products: productIds,
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      successUrl: `${appUrl}/profile?checkout=success`,
    });

    return NextResponse.redirect(checkout.url);
  } catch (err: unknown) {
    console.error("[checkout] Failed to create session:", err);

    if (err instanceof Error) {
      console.error("[checkout] Error:", err.message);
    }

    return NextResponse.redirect(new URL("/profile?checkout=error", req.url));
  }
}
