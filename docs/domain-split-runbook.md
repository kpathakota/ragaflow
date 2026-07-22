# Domain split runbook — `ragaflow.io` (landing) + `app.ragaflow.io` (app)

Goal: `ragaflow.io` serves the marketing **landing** page (and `/privacy`,
`/terms`, `/support`); `app.ragaflow.io` serves the **web app**. Both run from the
**same Vercel project** — the split is done in `web/proxy.ts`, gated by env vars.

**The code is safe to merge and deploy to production before any of this is
done.** With `MARKETING_HOST` unset, `proxy.ts` behaves exactly as it does today
(app at `ragaflow.io/`). Nothing changes until you set the env vars in step 4.

**Order matters — setting the env vars (step 4) is the switch that flips
everything, so do it LAST.** Steps 1–3 are all invisible to current users: the
app keeps serving at `ragaflow.io/`, and once `app.ragaflow.io` is added it
*also* serves the app (the proxy is still a no-op). Only step 4 turns on the
split. If you flip it before `app.ragaflow.io` resolves and Supabase is updated,
apex app-routes will redirect to a dead host and sign-in on the app host will
fail its callback.

## 1. DNS

- `app.ragaflow.io` → **CNAME** to the target Vercel gives you when you add the
  domain (usually `cname.vercel-dns.com`).
- `ragaflow.io` (apex) + `www` — leave as-is if already pointed at Vercel.

## 2. Vercel → Project → Settings → Domains

- Add `app.ragaflow.io` to the project. Keep `ragaflow.io` and `www.ragaflow.io`.
- Vercel serves the same deployment on all of them; `proxy.ts` decides what each
  host shows. Wait until `app.ragaflow.io` is verified and loads the app.

## 3. Supabase → Authentication → URL Configuration

Auth uses `window.location.origin`, so the app will run on `app.ragaflow.io`:

- **Site URL:** `https://app.ragaflow.io`
- **Redirect URLs:** add `https://app.ragaflow.io/**` (keep
  `http://localhost:3000/**`). Email-confirmation callbacks hit
  `/auth/callback` on the app host.

## 4. Vercel → Environment Variables (**Production** only) — THE ACTIVATION SWITCH

Set these **only after steps 1–3 are done and verified**, then redeploy:

| Key | Value |
|---|---|
| `MARKETING_HOST` | `ragaflow.io` |
| `APP_HOST` | `app.ragaflow.io` |
| `NEXT_PUBLIC_APP_URL` | `https://app.ragaflow.io` |

Leave these **unset for Preview** so preview deployments keep serving both the
app (`/`) and the landing (`/landing`) for review.

> **Rollback:** unset `MARKETING_HOST` (or all three) and redeploy → instantly
> back to single-domain behavior, no code change.
>
> **Heads-up for existing sessions:** signed-in beta users have their auth cookie
> on `ragaflow.io`; after the flip the app lives on `app.ragaflow.io` (a
> different host), so they'll need to sign in once more there. Minor at beta
> scale, but expect it.

## 5. Polar webhooks (no change required, but verify)

`/api/*` is never redirected by the split, so the webhook keeps working on
whichever domain it's pointed at. If you want it tidy, point it at
`https://app.ragaflow.io/api/webhooks/polar`.

## 6. App Store listing URLs

These resolve on the apex once the split is live:

- Privacy: `https://ragaflow.io/privacy`
- Terms: `https://ragaflow.io/terms`
- Support: `https://ragaflow.io/support`

> `web/app/layout.tsx` `metadataBase` is set to `https://ragaflow.io` (fixed in
> this PR) so OpenGraph/canonical URLs match these domains.

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
