import { NextRequest, NextResponse } from "next/server";
import { CustomerPortal } from "@polar-sh/nextjs";
import { createClient } from "@/lib/supabase/server";

const server =
  (process.env.NEXT_PUBLIC_POLAR_SERVER as "sandbox" | "production") ??
  "sandbox";

const handler = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server,
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/profile`,
  getCustomerId: async (req: NextRequest) => {
    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client unavailable");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthenticated");
    }

    const { data: rasika } = await supabase
      .from("rasikas")
      .select("polar_customer_id")
      .eq("rasika_id", user.id)
      .single();

    if (!rasika?.polar_customer_id) {
      throw new Error("No polar_customer_id");
    }

    return rasika.polar_customer_id as string;
  },
});

export async function GET(req: NextRequest) {
  try {
    return await handler(req);
  } catch (err) {
    // If the user has no polar_customer_id or is unauthenticated, redirect to profile
    console.error("[portal] Redirecting to /profile:", err);
    return NextResponse.redirect(new URL("/profile", req.url));
  }
}
