// delete-account — Supabase Edge Function
//
// Deletes the calling rasika's account. The uid comes ONLY from the verified
// JWT (never from the request body), so deleting someone else's account is
// structurally impossible. Active/past_due subscriptions block deletion with
// 409 — deleting would orphan a live Polar subscription.
//
// Deleting the auth.users row cascades: rasikas, listening_sessions,
// certifications are removed; analytics_events.rasika_id is set null
// (migration 011). See docs/account-deletion-design.md.
//
// Deploy: supabase functions deploy delete-account --project-ref mkikuyxvabhbaxspoiay

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Browser preflight (web app calls cross-origin)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Resolve the caller from the JWT — the only source of the uid to delete.
  // Any request body is ignored entirely.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return json(401, { error: "unauthorized" });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return json(401, { error: "unauthorized" });
  }
  const uid = userData.user.id;

  // Subscription guard: refuse if a live Polar subscription would be orphaned.
  //
  // Known accepted race: a rasika who completes Polar checkout and deletes
  // before the subscription.active webhook lands still reads as 'free' here
  // and passes the guard, orphaning the new subscription. Auto-canceling via
  // the Polar API was rejected for v1 (docs/account-deletion-design.md), so
  // the mitigation is detection: migration 012 + the Polar webhook handler
  // log an ORPHANED SUBSCRIPTION error when a webhook matches no rasika, for
  // manual cancellation in the Polar dashboard.
  const { data: rasika, error: rasikaError } = await admin
    .from("rasikas")
    .select("subscription_status")
    .eq("rasika_id", uid)
    .maybeSingle();
  if (rasikaError) {
    console.error("delete-account: rasika lookup failed", rasikaError);
    return json(500, { error: "internal_error" });
  }
  const status = rasika?.subscription_status;
  if (status === "active" || status === "past_due") {
    return json(409, { error: "active_subscription" });
  }

  // The single destructive operation — cascades handle the rest.
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) {
    console.error("delete-account: deleteUser failed", deleteError);
    return json(500, { error: "delete_failed" });
  }

  return json(200, { success: true });
});
