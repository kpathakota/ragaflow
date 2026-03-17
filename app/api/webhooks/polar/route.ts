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
  if (!externalId) {
    console.error("[polar/webhook] Missing externalId on customer — skipping");
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[polar/webhook] Admin Supabase client unavailable");
    return;
  }

  const { error } = await admin.rpc("update_rasika_subscription", {
    p_rasika_id: externalId,
    p_polar_customer_id: polarCustomerId,
    p_subscription_status: status,
  });

  if (error) {
    console.error("[polar/webhook] Supabase update failed:", error.message);
    throw new Error(error.message);
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",

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
