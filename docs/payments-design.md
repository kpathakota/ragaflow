# Payments Design — Polar.sh Integration (Task 2.6)

## Overview

Ragaflow uses **Polar.sh** as its merchant of record for subscriptions. Polar handles checkout UI, payment processing, tax compliance (VAT/GST/sales tax), and receipt delivery. Ragaflow receives webhook events to sync subscription status to Supabase.

## Tiers

| Tier | Price | Polar product type | `subscription_status` value |
|---|---|---|---|
| Monthly | $5/mo | Recurring subscription | `active` |
| Yearly | $30/yr | Recurring subscription | `active` |
| Lifetime | $100 one-time | One-time purchase | `lifetime` |
| Sponsor | $300 one-time | One-time purchase | `lifetime` |

## Approach: Hosted Checkout (decided)

**Decision: Polar hosted checkout** — the rasika leaves the app briefly, completes payment on Polar's page, and is redirected back. We evaluated three options:

| Option | Pros | Cons |
|---|---|---|
| **Hosted checkout (chosen)** | Simplest, zero payment UI code, PCI handled, dark theme + mobile-optimized, trust signal from real processor | Brief context switch to polar.sh domain |
| Embedded checkout (iframe/modal) | User stays in-app | More code (session API route + embed page + error states), PCI iframe complexity |
| Per-product API routes | Full control over UI | Most code, product ID env vars, error handling for each tier |

**Why hosted wins for Ragaflow:**
- Mobile-first minimal app — one tap, pick a plan, pay, come back
- Polar's checkout is already dark-themed and mobile-optimized
- Less code to maintain at launch; can switch to embedded later if conversion data shows drop-off
- 3 simple tiers don't need a custom selection UI

**How it works:**
- Profile "Go Premium" CTA links to `/api/checkout` (server-side API route)
- The route authenticates the user, then creates a Polar checkout session via the SDK (`polar.checkouts.create()`) with `externalCustomerId` set to the Supabase UID
- Polar creates/links a Customer record with the external ID, so webhooks can map back to the rasika
- The route redirects to the Polar-hosted checkout URL returned by the API
- After payment, Polar redirects back to `/profile?checkout=success`

**Why server-side sessions instead of checkout links:**
- Checkout links (shareable URLs) don't support `customer_external_id` as a query parameter — it's not a documented param
- The Checkout Sessions API officially supports `externalCustomerId`, guaranteeing the external ID reaches the Polar Customer record
- Same hosted checkout UX — the rasika still sees Polar's page, picks a plan, and pays

## Architecture

```
Profile "Go Premium" CTA
  → GET /api/checkout (server authenticates user)
  → Server creates Polar checkout session (externalCustomerId = Supabase UID)
  → Server redirects to Polar-hosted checkout URL
  → User picks tier, pays with card
  → Polar redirects back to /profile?checkout=success
  → Polar sends webhook to /api/webhooks/polar (async)
  → Webhook handler updates rasikas.subscription_status in Supabase
  → Profile re-fetches and shows updated plan

Manage subscription:
  → /api/portal redirects to Polar hosted customer portal
  → Rasika cancels/updates payment on Polar's page
  → Polar sends webhook → status updated in Supabase
```

## Sandbox / Test Environment

Polar uses a fully isolated sandbox (not a toggle):

| | Production | Sandbox |
|---|---|---|
| Dashboard | polar.sh | sandbox.polar.sh |
| API | api.polar.sh/v1 | sandbox-api.polar.sh/v1 |
| Tokens | Separate | Separate |

- **Test card:** `4242 4242 4242 4242`, any future expiry, any CVC
- Sandbox subscriptions auto-cancel after 90 days
- Local webhook testing: `polar listen http://localhost:3000/api/webhooks/polar`

## Environment Variables

```bash
# .env.local
POLAR_ACCESS_TOKEN=polar_oat_...              # Server-only — Organization Access Token (sandbox)
POLAR_ORGANIZATION_ID=org_...                 # Server-only — Polar org ID
POLAR_WEBHOOK_SECRET=whsec_...                # Server-only — Webhook signing secret
POLAR_PRODUCT_IDS=id1,id2,id3                 # Server-only — Comma-separated Polar product IDs for checkout
NEXT_PUBLIC_POLAR_SERVER=sandbox              # "sandbox" or "production" — controls SDK server target
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # Server-only — bypasses RLS for webhook writes
```

**`NEXT_PUBLIC_POLAR_SERVER` is intentionally public** — controls which Polar environment the SDK targets. `NEXT_PUBLIC_POLAR_ORG_SLUG` is no longer needed (checkout is server-side now).

Production env vars go in Vercel "Production" environment. Preview deploys use sandbox values.

**Webhook URL for local dev:** Don't configure a public URL in Polar dashboard for local testing. Use `polar listen http://localhost:3000/api/webhooks/polar` instead — it proxies events to localhost directly.

**Webhook URL for Vercel preview:** Use the stable branch alias URL (e.g. `ragaflow-git-dev-yourteam.vercel.app`), not the per-commit hash URL which changes every push.

## Implementation

### 1. Webhook Handler — `app/api/webhooks/polar/route.ts`

Uses `@polar-sh/nextjs` `Webhooks()` helper for HMAC signature verification. Named event handlers used where available; `subscription.past_due` handled via `onPayload` fallback.

**Events handled:**

| Polar event | Action |
|---|---|
| `subscription.active` | Set `subscription_status = 'active'`, store `polar_customer_id` |
| `subscription.canceled` | Set `subscription_status = 'canceled'` |
| `subscription.revoked` | Set `subscription_status = 'expired'` |
| `subscription.past_due` | Set `subscription_status = 'past_due'` (via `onPayload` — not a named handler in the SDK) |
| `order.created` (billing_reason = `purchase`) | Lifetime purchase → set `subscription_status = 'lifetime'` |

**Webhook events to subscribe to in Polar dashboard:** `subscription.active`, `subscription.canceled`, `subscription.revoked`, `order.created`. Do not subscribe to `subscription.created` (fires before payment clears) or `checkout.*` events.

**Customer resolution:** The webhook payload includes `data.customer.externalId` (Supabase UID, passed at checkout as `customerExternalId`). The handler looks up the rasika by `rasika_id = data.customer.externalId` and updates their record. It also stores `polar_customer_id` for future portal lookups.

**Auth:** Uses a Supabase **service role client** (server-side only) to bypass RLS when writing to `rasikas`.

### 2. Service Role Client — `lib/supabase/admin.ts`

A server-only Supabase client using `SUPABASE_SERVICE_ROLE_KEY`. Used exclusively by the webhook handler to update rasika records without RLS restrictions.

### 3. Customer Portal — `app/api/portal/route.ts`

Uses `@polar-sh/nextjs` `CustomerPortal` handler. Resolves `polar_customer_id` from the authenticated rasika's record. Redirects to Polar's hosted portal where subscribers can:
- View order history
- Update payment method
- Cancel subscription

### 4. Profile Page Updates — `app/profile/page.tsx`

**Free / expired rasika:**
- "Go Premium" card links to Polar checkout URL
- Tier options shown as text: "$5/mo · $30/yr · $100 lifetime"

**Active / canceled / past_due subscriber:**
- Emerald "Premium" card
- "Manage subscription" link → `/api/portal` (shown for `active`, `canceled`, `past_due` — not `lifetime`)

**Lifetime:**
- Emerald "Lifetime" card (existing)
- No manage link needed

**Post-checkout success:**
- If `?checkout=success` query param present, show a brief confirmation message
- The actual status update comes async via webhook (may take a few seconds)

### 5. Subscription Status Mapping

Current `subscription_status` values in `rasikas` and their meaning:

| Value | Meaning | Track access |
|---|---|---|
| `free` | Never subscribed | Free tracks only (after 10h gate) |
| `active` | Paying subscriber | All tracks |
| `past_due` | Payment failed, grace period | All tracks (temporary) |
| `canceled` | Canceled, access until period end | All tracks until period ends |
| `expired` | Subscription ended / revoked | Free tracks only (after 10h gate) |
| `lifetime` | One-time purchase, permanent | All tracks forever |

## Dependencies

```bash
npm install @polar-sh/nextjs @polar-sh/sdk
```

## Files

| File | Action | Purpose |
|---|---|---|
| `app/api/checkout/route.ts` | New ✅ | Server-side checkout session (creates Polar session + redirects) |
| `app/api/webhooks/polar/route.ts` | New ✅ | Webhook handler (subscription events → Supabase) |
| `app/api/portal/route.ts` | New ✅ | Customer portal redirect |
| `lib/polar/client.ts` | New ✅ | Shared Polar SDK client factory |
| `lib/supabase/admin.ts` | New ✅ | Service role Supabase client |
| `app/profile/profile-client.tsx` | Edit ✅ | Subscribe button points to `/api/checkout` (no more static URLs) |
| `lib/types.ts` | Edit ✅ | Expanded `subscription_status` union to all valid states |
| `.env.local` | Edit ✅ | Added all Polar + service role env vars + `POLAR_PRODUCT_IDS` |

## Implementation Status

**Task 2.6 — implemented in PR #15 (`feat/polar-billing`), pending merge to `dev`.**

All sub-tasks complete. Pending: human review + merge, then end-to-end testing with `polar listen`.

## Testing Checklist

Pre-work (human, done before Dev builds):
- [x] Create sandbox account + org at sandbox.polar.sh
- [x] Create 3 products (monthly, yearly, lifetime)
- [x] Add all env vars to `.env.local`
- [x] Note: webhook URL for local dev uses `polar listen`, not a dashboard URL

End-to-end testing (after PR #15 merged):
1. [ ] Merge PR #15 to `dev`
2. [ ] Run `polar listen http://localhost:3000/api/webhooks/polar` for local webhook forwarding
3. [ ] Open profile → click "Go Premium" → complete checkout with test card `4242 4242 4242 4242`
4. [ ] Verify `subscription_status` updates to `active` in Supabase
5. [ ] Verify profile shows "Premium" card + "Manage subscription" link
6. [ ] Test cancel via portal → verify `canceled` status in Supabase
7. [ ] Test lifetime purchase → verify `subscription_status = 'lifetime'`
8. [ ] Verify `?checkout=success` banner appears after redirect
9. [ ] Deploy to Vercel preview, configure sandbox webhook to stable branch alias URL, retest

## Decisions Made

- **Canceled + period end:** `canceled` rasikas keep full access until `subscription.revoked` fires (sets `expired`). Profile shows "Manage subscription" link while `canceled` — they can resubscribe via portal.
- **Webhook idempotency:** Handler uses a simple UPDATE — writing the same status twice is safe.
- **`subscription.past_due`:** Not a named event in `@polar-sh/nextjs` SDK; handled via `onPayload` catch-all.
- **`externalCustomerId` via Checkout Sessions API:** Server-side `polar.checkouts.create({ externalCustomerId: uid })` is the official way to link a Polar Customer to our Supabase UID. Static checkout links don't support this as a query parameter. Webhook payload exposes it at `data.customer.externalId`.
- **Manage subscription visibility:** Shown for `active`, `canceled`, `past_due`. Hidden for `lifetime` (no subscription to manage).

## Next Steps

After Task 2.6 is tested and stable:
- **Task 2.5** — Access control: 10-hour listening gate. Premium tracks locked for non-subscribers after 10h. Depends on working subscription status from Task 2.6.
