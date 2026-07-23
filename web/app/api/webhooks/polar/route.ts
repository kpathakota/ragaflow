import { Webhooks } from "@polar-sh/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WebhookSubscriptionActivePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionactivepayload";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload";
import type { WebhookOrderCreatedPayload } from "@polar-sh/sdk/models/components/webhookordercreatedpayload";
import type { WebhookSubscriptionPastDuePayload } from "@polar-sh/sdk/models/components/webhooksubscriptionpastduepayload";

type SubscriptionStatus =
  | "free"
  | "active"
  | "canceled"
  | "expired"
  | "past_due"
  | "lifetime";

async function updateRasika(
  externalId: string | null | undefined,
  polarCustomerId: string,
  status: SubscriptionStatus
) {
  if (!process.env.POLAR_WEBHOOK_SECRET) {
    throw new Error("POLAR_WEBHOOK_SECRET is not configured");
  }

  if (!externalId) {
    console.error("[polar/webhook] Missing externalId on customer — skipping");
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[polar/webhook] Admin Supabase client unavailable");
    return;
  }

  const { data: updatedRows, error } = await admin.rpc(
    "update_rasika_subscription",
    {
      p_rasika_id: externalId,
      p_polar_customer_id: polarCustomerId,
      p_subscription_status: status,
    }
  );

  if (error) {
    console.error("[polar/webhook] Supabase update failed:", error.message);
    throw new Error(error.message);
  }

  // Migration 012 makes the RPC return the affected row count. Zero rows means
  // the rasika no longer exists — most likely an account deleted between Polar
  // checkout and this webhook arriving (the delete-account 409 guard can't see
  // a subscription whose webhook hasn't landed yet). Don't throw — retries
  // can't succeed — but log loudly so the orphaned Polar subscription gets
  // canceled by hand in the Polar dashboard. (Pre-012 the RPC returns null,
  // which intentionally doesn't trip this.)
  if (updatedRows === 0) {
    console.error(
      `[polar/webhook] ORPHANED SUBSCRIPTION: update matched no rasika ` +
        `(externalId=${externalId}, polarCustomerId=${polarCustomerId}, status=${status}). ` +
        `Account was likely deleted between checkout and webhook delivery — ` +
        `cancel this subscription in the Polar dashboard.`
    );
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionActive: async (payload: WebhookSubscriptionActivePayload) => {
    const { data } = payload;
    await updateRasika(data.customer.externalId, data.customerId, "active");
  },

  onSubscriptionCanceled: async (payload: WebhookSubscriptionCanceledPayload) => {
    const { data } = payload;
    await updateRasika(data.customer.externalId, data.customerId, "canceled");
  },

  onSubscriptionRevoked: async (payload: WebhookSubscriptionRevokedPayload) => {
    const { data } = payload;
    await updateRasika(data.customer.externalId, data.customerId, "expired");
  },

  onOrderCreated: async (payload: WebhookOrderCreatedPayload) => {
    const { data } = payload;
    // Only treat standalone one-time purchases as lifetime
    if (data.billingReason !== "purchase") return;
    await updateRasika(data.customer.externalId, data.customerId, "lifetime");
  },

  // onPayload catches events not covered by named handlers (e.g. subscription.past_due)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPayload: async (payload: any) => {
    if ((payload as { type: string }).type === "subscription.past_due") {
      const pastDue = payload as WebhookSubscriptionPastDuePayload;
      await updateRasika(
        pastDue.data.customer.externalId,
        pastDue.data.customerId,
        "past_due"
      );
    }
  },
});
