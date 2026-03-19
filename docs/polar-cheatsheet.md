# Polar.sh Cheatsheet — Ragaflow

Quick reference for the Polar billing integration. Based on https://polar.sh/docs/llms-full.txt and our specific implementation.

---

## Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_POLAR_SERVER` | Client + server | `"sandbox"` or `"production"` — controls checkout link + portal server |
| `POLAR_WEBHOOK_SECRET` | Server only | HMAC secret for verifying webhook signatures |
| `POLAR_ACCESS_TOKEN` | Server only | Organization access token — used by customer portal API |
| `SUPABASE_SECRET_KEY` | Server only | Service-role key — webhook handler uses this to bypass RLS |

---

## Checkout Links

**Docs:** Checkout links are reusable, shareable URLs that create a checkout session when opened. Best for website/social embeds (as opposed to Checkout Sessions API, which is for single-use in-product flows).

**Our links:**

| Environment | URL |
|---|---|
| Sandbox | `https://sandbox.polar.sh/checkout/polar_c_FEBI9a9gEeCMUgd4RPgo1s5h8tachGt0t8rtg0FPwpJ` |
| Production | `https://buy.polar.sh/polar_cl_MOogV7jhwJif9qfSJKvCrGbuZOzfSbxrA4vaW2sDHJu` |

**Query parameters:**

| Param | Purpose |
|---|---|
| `customer_external_id` | Links checkout to our Supabase `rasika_id`. Set on the Polar Customer after purchase. |
| `metadata` | Custom key-value pairs stored on the checkout |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | Attribution tracking |
| `reference_id` | Custom attribution ID |

**Our usage** (`profile-client.tsx`):
```
{CHECKOUT_LINK}?customer_external_id={user.id}
```

After successful checkout, Polar creates/links a Customer record with `external_id` = our `rasika_id`. This is how webhooks tie back to our user.

**Important:** `customerExternalId` (camelCase) does NOT work — must use `customer_external_id` (snake_case).

---

## Webhooks

**Docs:** Polar uses the [Standard Webhooks](https://www.standardwebhooks.com/) spec. The `@polar-sh/nextjs` package handles signature verification automatically.

**Our endpoint:** `app/api/webhooks/polar/route.ts`

### Events we handle

| Event | Handler | Status we set |
|---|---|---|
| `subscription.active` | `onSubscriptionActive` | `active` |
| `subscription.canceled` | `onSubscriptionCanceled` | `canceled` |
| `subscription.revoked` | `onSubscriptionRevoked` | `expired` |
| `subscription.past_due` | `onPayload` (catch-all) | `past_due` |
| `order.created` (billing_reason=`purchase`) | `onOrderCreated` | `lifetime` |

### Payload shape

All payloads follow: `{ type: string, data: { customer: { externalId }, customerId, ... } }`

- `data.customer.externalId` — our `rasika_id` (set via `customer_external_id` at checkout)
- `data.customerId` — Polar's internal customer ID (we store as `polar_customer_id`)
- `data.billingReason` — on order events: `"purchase"` (one-time), `"subscription_create"`, `"subscription_cycle"`, etc.

### Webhook → DB flow

```
Polar webhook
  → @polar-sh/nextjs verifies HMAC signature
  → handler extracts externalId + customerId + derives status
  → admin.rpc("update_rasika_subscription", { p_rasika_id, p_polar_customer_id, p_subscription_status })
  → SECURITY DEFINER function validates status + updates rasikas table
```

### Gotchas

- `order.created` can fire with status `pending` (not yet paid). We filter by `billingReason === "purchase"` to only catch one-time lifetime purchases, not recurring subscription orders.
- `subscription.past_due` has no dedicated `onSubscriptionPastDue` handler in `@polar-sh/nextjs` — we catch it via the generic `onPayload` handler.
- Webhooks auto-disable after 10+ consecutive failures. Check the Polar dashboard if events stop arriving.
- Retries use exponential backoff.

---

## Customer Portal

**Docs:** Generate a portal session via `POST /v1/customer-sessions/` using the Polar Customer ID. The `@polar-sh/nextjs` `CustomerPortal()` helper wraps this.

**Our endpoint:** `app/api/portal/route.ts`

### Flow

```
User clicks "Manage subscription" on /profile
  → GET /api/portal
  → Server looks up polar_customer_id from rasikas table
  → CustomerPortal() generates a portal session + redirects
  → User sees Polar-hosted portal (manage subscription, update payment, cancel)
  → On return: redirected back to /profile
```

### Requirements

- User must have a `polar_customer_id` in the `rasikas` table (set by webhook after first checkout)
- `POLAR_ACCESS_TOKEN` must be set (org-level token with `customer_sessions:write` scope)
- If anything fails, we redirect to `/profile` with no error shown

---

## Supabase: Defense in Depth

The webhook handler uses a **SECURITY DEFINER** function (`migration 008`) instead of raw `.update()`:

```sql
update_rasika_subscription(p_rasika_id uuid, p_polar_customer_id text, p_subscription_status text)
```

- Validates `p_subscription_status` against allowed values: `free`, `active`, `canceled`, `expired`, `past_due`, `lifetime`
- Only `service_role` can call it (REVOKE from public/anon/authenticated)
- Even if `SUPABASE_SECRET_KEY` leaks, attacker can only update subscription fields — not read data or modify other columns

---

## Subscription Status Values

| Status | Meaning | Set by |
|---|---|---|
| `free` | Default, no subscription | Initial rasika creation |
| `active` | Paying subscriber | `subscription.active` webhook |
| `canceled` | Canceled but access until period ends | `subscription.canceled` webhook |
| `expired` | Fully revoked, no access | `subscription.revoked` webhook |
| `past_due` | Payment failed, needs attention | `subscription.past_due` webhook |
| `lifetime` | One-time purchase, permanent access | `order.created` webhook (billingReason=purchase) |

---

## Checkout Links vs Checkout Sessions

| | Checkout Links | Checkout Sessions |
|---|---|---|
| **Use case** | Shareable, reusable URLs | Single-use, server-created |
| **Created via** | Dashboard or API | API only (`POST /v1/checkouts/`) |
| **Our usage** | Profile page "Subscribe" button | Not used |
| **When to switch** | If we need dynamic pricing, trials, or per-user discounts, switch to Checkout Sessions |

---

## Testing Checklist

- [ ] Sandbox checkout: click Subscribe on profile → complete Polar checkout → verify `subscription_status` = `active` in Supabase
- [ ] Portal: click "Manage subscription" → verify redirect to Polar portal → return to /profile
- [ ] Cancel via portal → verify `subscription_status` = `canceled`
- [ ] Verify `customer_external_id` is set correctly on the Polar Customer (check Polar dashboard)
- [ ] Verify calling `update_rasika_subscription` from browser console returns permission denied
- [ ] Verify invalid status values are rejected by the DB function
