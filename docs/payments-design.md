# Payments Design — Polar.sh Integration (Task 2.6)

## Overview

Ragaflow uses **Polar.sh** as its merchant of record for subscriptions. Polar handles checkout UI, payment processing, tax compliance (VAT/GST/sales tax), and receipt delivery. Ragaflow receives webhook events to sync subscription status to Supabase.

## Tiers

| Tier | Price | Polar product type | `subscription_status` value |
|---|---|---|---|
| Monthly | $5/mo | Recurring subscription | `active` |
| Yearly | $30/yr | Recurring subscription | `active` |
| Lifetime | $100 one-time | One-time purchase | `lifetime` |
| Sponsor ($300) | Outside app | N/A — manual | `lifetime` |

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
- Profile "Go Premium" CTA links to Polar's hosted checkout URL
- The link includes `?metadata[supabase_uid]={uid}` so the webhook can map the Polar customer back to the rasika
- Polar handles tier selection, payment form, receipts, and tax

**Checkout URL pattern:**
```
https://sandbox.polar.sh/{org-slug}/checkout?metadata[supabase_uid]={uid}
```
(Production: `https://polar.sh/{org-slug}/checkout`)

**Success redirect:** Configure in Polar dashboard to redirect to `{app_url}/profile?checkout=success`

## Architecture

```
Profile "Go Premium" CTA
  → Polar hosted checkout (user picks tier, pays with card)
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
POLAR_ACCESS_TOKEN=polar_oat_...        # Organization Access Token (sandbox)
POLAR_ORGANIZATION_ID=org_...           # Polar org ID
POLAR_WEBHOOK_SECRET=whsec_...          # Webhook signing secret
POLAR_SERVER=sandbox                    # "sandbox" or "production"
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Server-side only, bypasses RLS for webhook writes
```

Production env vars go in Vercel "Production" environment. Preview deploys use sandbox values.

## Implementation

### 1. Webhook Handler — `app/api/webhooks/polar/route.ts`

The only API route needed. Uses `@polar-sh/nextjs` for signature verification.

**Events handled:**

| Polar event | Action |
|---|---|
| `subscription.active` | Set `subscription_status = 'active'`, store `polar_customer_id` |
| `subscription.canceled` | Set `subscription_status = 'canceled'` |
| `subscription.revoked` | Set `subscription_status = 'expired'` |
| `subscription.past_due` | Set `subscription_status = 'past_due'` |
| `order.created` (billing_reason = `purchase`) | Lifetime purchase → set `subscription_status = 'lifetime'` |

**Customer resolution:** The webhook payload includes `customerExternalId` (Supabase uid, passed at checkout). The handler looks up the rasika by `rasika_id = customerExternalId` and updates their record. It also stores `polar_customer_id` for future portal lookups.

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

**Active subscriber:**
- Emerald "Premium" card (existing)
- Add "Manage subscription" link → `/api/portal`

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
| `app/api/webhooks/polar/route.ts` | New | Webhook handler (subscription events → Supabase) |
| `app/api/portal/route.ts` | New | Customer portal redirect |
| `lib/supabase/admin.ts` | New | Service role Supabase client |
| `app/profile/page.tsx` | Edit | Wire checkout link + manage subscription |
| `.env.local` | Edit | Add Polar + service role env vars |

## Testing Checklist

1. [ ] Create sandbox account + org at sandbox.polar.sh
2. [ ] Create 3 products (monthly, yearly, lifetime)
3. [ ] Configure webhook endpoint in Polar dashboard
4. [ ] Install `polar` CLI, run `polar listen` for local webhook forwarding
5. [ ] Test monthly subscription with `4242 4242 4242 4242`
6. [ ] Verify `subscription_status` updates to `active` in Supabase
7. [ ] Verify profile shows "Premium" card after webhook fires
8. [ ] Test cancel via portal → verify status updates
9. [ ] Test lifetime purchase → verify `subscription_status = 'lifetime'`
10. [ ] Test with expired/past_due states
11. [ ] Deploy to Vercel preview, test with sandbox webhook pointed at preview URL

## Open Questions

- **Canceled + period end:** Polar fires `subscription.canceled` when the user cancels, but access continues until period end. Should we keep showing "Premium" until `subscription.revoked` fires? (Recommendation: yes — treat `canceled` as "active until period end" in the access control logic.)
- **Webhook retry:** Polar retries failed webhooks. The handler should be idempotent (updating to the same status twice is fine with a simple UPDATE).
