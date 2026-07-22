# Domain split runbook — `ragaflow.io` (landing) + `app.ragaflow.io` (app)

Goal: `ragaflow.io` serves the marketing **landing** page (and `/privacy`,
`/terms`, `/support`); `app.ragaflow.io` serves the **web app**. Both run from the
**same Vercel project** — the split is done in `web/proxy.ts`, gated by env vars.

**The code is safe to merge before any of this is done.** With `MARKETING_HOST`
unset, `proxy.ts` behaves exactly as it does today (app at `/`). Nothing changes
until you complete the steps below and set the env vars. Do them in order.

## 1. DNS

- `app.ragaflow.io` → **CNAME** to the target Vercel gives you when you add the
  domain (usually `cname.vercel-dns.com`).
- `ragaflow.io` (apex) + `www` — leave as-is if already pointed at Vercel.

## 2. Vercel → Project → Settings → Domains

- Add `app.ragaflow.io` to the project. Keep `ragaflow.io` and `www.ragaflow.io`.
- Vercel serves the same deployment on all of them; `proxy.ts` decides what each
  host shows.

## 3. Vercel → Project → Settings → Environment Variables (**Production** only)

| Key | Value |
|---|---|
| `MARKETING_HOST` | `ragaflow.io` |
| `APP_HOST` | `app.ragaflow.io` |
| `NEXT_PUBLIC_APP_URL` | `https://app.ragaflow.io` |

Leave these **unset for Preview** so preview deployments keep serving both the
app (`/`) and the landing (`/landing`) for review. Redeploy after setting them.

## 4. Supabase → Authentication → URL Configuration

Auth uses `window.location.origin`, so the app now runs on `app.ragaflow.io`:

- **Site URL:** `https://app.ragaflow.io`
- **Redirect URLs:** add `https://app.ragaflow.io/**` (keep
  `http://localhost:3000/**`). Email-confirmation callbacks hit
  `/auth/callback` on the app host.

## 5. Polar webhooks (no change required, but verify)

`/api/*` is never redirected by the split, so the webhook keeps working on
whichever domain it's pointed at. If you want it tidy, point it at
`https://app.ragaflow.io/api/webhooks/polar`.

## 6. App Store listing URLs

These resolve on the apex once the split is live:

- Privacy: `https://ragaflow.io/privacy`
- Terms: `https://ragaflow.io/terms`
- Support: `https://ragaflow.io/support`

> ⚠️ `web/app/layout.tsx` currently sets `metadataBase: https://ragaflow.app`.
> Update it to the canonical domain (`ragaflow.io`) so OpenGraph/canonical URLs
> are right.

## Verify after enabling

- `https://ragaflow.io/` → landing page
- `https://ragaflow.io/privacy` `/terms` `/support` → legal pages
- `https://ragaflow.io/mode/focus` → 307 redirect to `https://app.ragaflow.io/mode/focus`
- `https://app.ragaflow.io/` → app home
- Sign up / sign in / email confirmation on `app.ragaflow.io` works end-to-end
- Preview deploys: both `/` (app) and `/landing` still load

## Rollback

Remove `MARKETING_HOST` (or all three env vars) and redeploy — instantly back to
single-domain behavior. No code revert needed.
