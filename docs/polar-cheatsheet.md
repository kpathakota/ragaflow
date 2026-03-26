# Polar.sh Cheatsheet — Ragaflow

Quick reference for the Polar billing integration. Based on https://polar.sh/docs/llms-full.txt and our specific implementation.

---

## Environment Variables

| Var | Where | Purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_POLAR_SERVER` | Client + server | `"sandbox"` or `"production"` — controls SDK server target |
| `POLAR_ACCESS_TOKEN` | Server only | Organization access token — used by checkout session + portal APIs |
| `POLAR_PRODUCT_IDS` | Server only | Comma-separated Polar product IDs for checkout (differ per environment) |
| `POLAR_WEBHOOK_SECRET` | Server only | HMAC secret for verifying webhook signatures |
| `SUPABASE_SECRET_KEY` | Server only | Service-role key — webhook handler uses this to bypass RLS |

---

## Checkout Sessions (Server-Side)

**Docs:** Checkout sessions are single-use, server-created checkout URLs. Created via the Polar SDK (`polar.checkouts.create()`). This is how we pass `externalCustomerId` to link the Polar Customer to our Supabase rasika.

**Our endpoint:** `app/api/checkout/route.ts`

### Flow

```
User clicks "Subscribe" on /profile
  → GET /api/checkout
  → Server authenticates user via Supabase
  → Server calls polar.checkouts.create({
      products: POLAR_PRODUCT_IDS,
      externalCustomerId: user.id,    ← links Polar Customer to our rasika
      customerEmail: user.email,
      successUrl: "{APP_URL}/profile?checkout=success"
    })
  → Server redirects to checkout.url (Polar-hosted page)
  → User picks tier, pays
  → Polar redirects back to /profile?checkout=success
```

### Why sessions instead of checkout links

Static checkout links (shareable URLs) don't support `customer_external_id` as a query parameter — it's not a documented param. The Checkout Sessions API officially supports `externalCustomerId`, guaranteeing the external ID reaches the Polar Customer record and flows through to webhooks as `data.customer.externalId`.

### Product IDs

Set `POLAR_PRODUCT_IDS` env var (comma-separated). These differ between sandbox and production — look them up in the Polar dashboard under Products.

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
| **Use case** | Shareable, reusable URLs (social/marketing) | Single-use, server-created (in-app) |
| **Created via** | Dashboard or API | API only (`polar.checkouts.create()`) |
| **Supports externalCustomerId** | No (not a valid query param) | Yes (official SDK field) |
| **Our usage** | Not used | Profile "Subscribe" button → `/api/checkout` |

---

## Testing Checklist

- [ ] Sandbox checkout: click Subscribe on profile → redirected through `/api/checkout` → complete Polar checkout → verify `subscription_status` = `active` in Supabase
- [ ] Verify Polar Customer has `externalId` = your Supabase UID (check Polar dashboard → Customers)
- [ ] Portal: click "Manage subscription" → verify redirect to Polar portal → return to /profile
- [ ] Cancel via portal → verify `subscription_status` = `canceled`
- [ ] Test lifetime purchase → verify `subscription_status` = `lifetime`
- [ ] Verify `?checkout=success` banner appears after redirect
- [ ] Unauthenticated visit to `/api/checkout` → redirected to `/auth`
- [ ] Verify calling `update_rasika_subscription` from browser console returns permission denied
- [ ] Verify invalid status values are rejected by the DB function
