# Domain split runbook — `ragaflow.io` (landing) + `app.ragaflow.io` (app)

Goal: `ragaflow.io` serves the marketing **landing** page (and `/privacy`,
`/terms`, `/support`); `app.ragaflow.io` serves the **web app**. Both run from the
**same Vercel project** — the split is done in `web/proxy.ts`, gated by env vars.

**The code is safe to merge and deploy to production before any of this is
done.** With `MARKETING_HOST` unset, `proxy.ts` behaves exactly as it does today
(app at the current domain). Nothing changes until you set the env vars in step 5.

**Order matters — setting the env vars (step 5) is the switch that flips
everything, so do it LAST.** Steps 1–4 are all invisible to current users: the
app keeps serving where it does today, and once `app.ragaflow.io` is added it
*also* serves the app (the proxy is still a no-op). Only step 5 turns on the
split. If you flip it before `app.ragaflow.io` resolves and Supabase is updated,
apex app-routes will redirect to a dead host and sign-in on the app host will
fail its callback.

> Verified against Vercel/Supabase docs + live DNS on 2026-07-23. DNS for
> `ragaflow.io` is hosted at **Porkbun** (nameservers `*.ns.porkbun.com`).

## 1. Vercel → ragaflow project → Settings → Domains — add `app.ragaflow.io`

Domains is a **project-level** setting — it does not appear under team/account
Settings. Navigation: [vercel.com/dashboard](https://vercel.com/dashboard) →
open the **ragaflow** project → **Settings** in the project sidebar →
**Domains**. (Shortcut: open the project and append `/settings/domains` to the
URL.)

- Click **Add Domain**, enter `app.ragaflow.io`, keep the default **Production**
  environment.
- Keep `ragaflow.io` and `www.ragaflow.io` in the list.
- After adding, Vercel shows the DNS record it needs: a **project-specific
  CNAME target** like `19fd4bfc43929054.vercel-dns-017.com` (the same one
  `www.ragaflow.io` already uses). The old shared `cname.vercel-dns.com` is
  deprecated — use exactly what the dashboard shows.

## 2. DNS (Porkbun) — point `app` at Vercel

Porkbun → Domain Management → `ragaflow.io` → **DNS** (DNS records):

- Add a **CNAME**: Host `app` (Porkbun appends `.ragaflow.io` automatically),
  Answer = the target from step 1, TTL default.
- `ragaflow.io` (apex) + `www` — leave as-is; they already point at Vercel's
  current values (apex A `216.198.79.1`, www CNAME `…vercel-dns-017.com`).

Back on Vercel's Domains page, wait until `app.ragaflow.io` shows as valid and
loads the app in a browser (it serves the app for now — the proxy is still a
no-op).

## 3. Vercel Domains — make bare `ragaflow.io` the primary domain

As of 2026-07-23 the config is **reversed**: `ragaflow.io` 307-redirects to
`www.ragaflow.io` (www is primary). We want the clean apex URL. On the same
Domains page:

- Edit `ragaflow.io` → set it to serve the deployment directly (no redirect).
- Edit `www.ragaflow.io` → **Redirect to `ragaflow.io`**, permanent (308).

This redirect happens at Vercel's edge, before `proxy.ts` runs. Check:

```bash
curl -sI https://ragaflow.io/ | head -3        # expect 200
curl -sI https://www.ragaflow.io/ | head -3    # expect 308 → https://ragaflow.io/
```

Safe to do pre-flip: the app just becomes canonical at the apex. Signed-in beta
users currently on `www` will be signed out by the host change (cookies are
host-scoped) — they'd need to sign in again after step 5 anyway.

## 4. Supabase → Authentication → URL Configuration

Left sidebar **Authentication** → **URL Configuration** (direct link:
`https://supabase.com/dashboard/project/mkikuyxvabhbaxspoiay/auth/url-configuration`).

Auth uses `window.location.origin`, so the app will run on `app.ragaflow.io`:

- **Site URL:** `https://app.ragaflow.io`
- **Redirect URLs:** add `https://app.ragaflow.io/**` (keep
  `http://localhost:3000/**`). Email-confirmation callbacks hit
  `/auth/callback` on the app host. (`**` matches any path depth.)

## 5. Vercel → Settings → Environment Variables (**Production** only) — THE ACTIVATION SWITCH

Set these **only after steps 1–4 are done and verified**. When adding each
variable, tick **only the Production environment** (untick Preview and
Development):

| Key | Value |
|---|---|
| `MARKETING_HOST` | `ragaflow.io` |
| `APP_HOST` | `app.ragaflow.io` |
| `NEXT_PUBLIC_APP_URL` | `https://app.ragaflow.io` |

Leave these **unset for Preview** so preview deployments keep serving both the
app (`/`) and the landing (`/landing`) for review.

Env-var changes only apply on the next deploy — after saving all three, go to
**Deployments** → latest Production deployment → **⋯ → Redeploy**.
(`NEXT_PUBLIC_APP_URL` is inlined at build time, so this must be a real
rebuild; it also feeds the Polar checkout success and portal return URLs.)

> **Rollback:** unset `MARKETING_HOST` (or all three) and redeploy → instantly
> back to single-domain behavior, no code change. The www→apex primary flip
> (step 3) is independent and can stay either way.
>
> **Heads-up for existing sessions:** signed-in beta users have their auth
> cookie on the old host; after the flip the app lives on `app.ragaflow.io` (a
> different host), so they'll need to sign in once more there. Minor at beta
> scale, but expect it.

## 6. Polar webhooks (no change required, but verify)

`/api/*` is never redirected by the split, so the webhook keeps working on
whichever domain it's pointed at. If you want it tidy, point it at
`https://app.ragaflow.io/api/webhooks/polar`.

## 7. App Store listing URLs

With the apex as primary (step 3), these resolve directly with no redirect hop:

- Privacy: `https://ragaflow.io/privacy`
- Terms: `https://ragaflow.io/terms`
- Support: `https://ragaflow.io/support`

> `web/app/layout.tsx` `metadataBase` is set to `https://ragaflow.io` so
> OpenGraph/canonical URLs match these domains.

## Verify after enabling (post-flip test checklist)

Quick header checks — run these once the redeploy in step 5 is live:

```bash
curl -sI https://ragaflow.io/ | head -3                 # 200 — landing page (rewritten from /landing)
curl -sI https://www.ragaflow.io/ | head -3             # 308 → https://ragaflow.io/
curl -sI https://ragaflow.io/privacy | head -3          # 200 — legal page on apex
curl -sI https://ragaflow.io/mode/focus | head -3       # 307 → https://app.ragaflow.io/mode/focus
curl -sI https://app.ragaflow.io/ | head -3             # 200 — app home
curl -sI https://app.ragaflow.io/landing | head -3      # 307 → https://app.ragaflow.io/
```

Then in a browser:

- `https://ragaflow.io/` shows the **landing** page; `/privacy`, `/terms`,
  `/support` load on the apex.
- `https://app.ragaflow.io/` shows the **app** home.
- Sign up → email confirmation → sign in on `app.ragaflow.io` works
  end-to-end (callback lands on `app.ragaflow.io/auth/callback`).
- Polar checkout and customer portal return to `app.ragaflow.io` (they use
  `NEXT_PUBLIC_APP_URL`).
- A preview deploy still serves both `/` (app) and `/landing` (env vars are
  Production-only).

## Rollback

Remove `MARKETING_HOST` (or all three env vars) and redeploy — instantly back
to single-domain behavior. No code revert needed.
