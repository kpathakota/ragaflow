# Security Review — 2026-04-04

**Branch:** `dev` (commit: `656507c`)
**Scope:** full

## Summary

- Dependencies: 21 total (19 required, 0 reducible, 2 unused)
- Trust flags: 1 dependency needs manual review
- Vulnerabilities: 6 found (0 critical, 3 high, 3 moderate)
- Code issues: 5 findings (0 critical, 0 high, 3 medium, 5 low)
- iOS: clean — no issues found

## Action Items

### Immediate (do now)

- [ ] **Upgrade `next` from 16.1.6 → 16.2.2** — 5 CVEs including CSRF bypass and HTTP request smuggling (all fixed in 16.1.7+)
- [ ] **Add security headers** to `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] **Validate `POLAR_WEBHOOK_SECRET`** — currently falls back to empty string if unset; add explicit throw

### Flagged for Manual Review

- [ ] **`@polar-sh/nextjs`** — 21K weekly downloads (below 50K threshold). Maintained by Polar team (3 maintainers), last published 2026-03-13. Low traffic reflects niche scope, not abandonment — but worth monitoring.

### Recommended (non-urgent)

- [ ] Remove unused `@testing-library/user-event` devDependency
- [ ] Remove `react-dom` from explicit dependencies (peer dep of Next.js, not directly imported)
- [ ] Fix auth callback redirect to use explicit path (`new URL("/", req.url)`) instead of request origin
- [ ] Add missing env vars to `.env.example` for developer onboarding
- [ ] Validate `NEXT_PUBLIC_APP_URL` in production to prevent localhost fallback
- [ ] Reduce checkout error log verbosity (don't serialize full error objects)
- [ ] Upgrade outdated packages: `@supabase/supabase-js` (2.95→2.101), `@supabase/ssr` (0.8→0.10), `react`/`react-dom` (19.2.3→19.2.4)

---

## Phase 1: Dependency Necessity Audit

### Production Dependencies (7)

| Package | Status | Notes |
|---|---|---|
| `@polar-sh/nextjs` | REQUIRED | Webhooks, CustomerPortal (payment infra) |
| `@polar-sh/sdk` | REQUIRED | Polar client + webhook payload types |
| `@supabase/ssr` | REQUIRED | `createBrowserClient`, `createServerClient` |
| `@supabase/supabase-js` | REQUIRED | `User` type in auth context |
| `next` | REQUIRED | Core framework (11+ import sites) |
| `react` | REQUIRED | Hooks + JSX across 7+ files |
| `react-dom` | **UNUSED** | Not directly imported — implicit peer dep of Next.js |

### Dev Dependencies (14)

| Package | Status | Notes |
|---|---|---|
| `@tailwindcss/postcss` | REQUIRED | postcss.config.mjs plugin |
| `@testing-library/jest-dom` | REQUIRED | Test setup (vitest matchers) |
| `@testing-library/react` | REQUIRED | Component rendering in tests |
| `@testing-library/user-event` | **UNUSED** | Never imported in any test file |
| `@types/node` | REQUIRED | Server-side TypeScript types |
| `@types/react` | REQUIRED | React component types |
| `@types/react-dom` | REQUIRED | Peer of @types/react |
| `@vitejs/plugin-react` | REQUIRED | vitest.config.ts plugin |
| `eslint` | REQUIRED | Linter (npm run lint) |
| `eslint-config-next` | REQUIRED | eslint.config.mjs presets |
| `jsdom` | REQUIRED | vitest test environment |
| `tailwindcss` | REQUIRED | CSS framework |
| `typescript` | REQUIRED | Language toolchain |
| `vitest` | REQUIRED | Test runner |

**Candidates for removal:**
1. `@testing-library/user-event` — installed but never imported; tests use `fireEvent` instead
2. `react-dom` — not directly imported anywhere; Next.js manages DOM rendering internally

---

## Phase 2: Dependency Trust Validation

| Package | Weekly Downloads | Maintainers | Last Publish | Status |
|---|---|---|---|---|
| `@polar-sh/nextjs` | 21,306 | 3 (Polar team) | 2026-03-13 | **NEEDS REVIEW** |
| `@polar-sh/sdk` | 135,261 | 3 (Polar team) | 2026-04-03 | OK |
| `@supabase/ssr` | 2,180,315 | 13 (Supabase) | 2026-03-30 | OK |
| `@supabase/supabase-js` | 16,544,137 | 3 (Supabase) | 2026-03-31 | OK |
| `next` | 44,002,607 | Vercel org | 2026-04-01 | OK |
| `react` | 121,639,403 | Meta (6+) | 2026-01-26 | OK |
| `react-dom` | 116,831,992 | Meta (7) | 2026-01-26 | OK |
| `@tailwindcss/postcss` | 27,704,798 | 1 (adamwathan) | 2026-03-18 | OK |
| `@testing-library/jest-dom` | 37,062,156 | 14 | 2025-10-01 | OK |
| `@testing-library/react` | 32,442,949 | 12 | 2026-01-19 | OK |
| `@testing-library/user-event` | 26,481,287 | 12 | 2025-01-21 | OK |
| `@types/node` | 288,353,269 | DefinitelyTyped | 2026-04-03 | OK |
| `@types/react` | 104,561,390 | DefinitelyTyped | 2026-02-11 | OK |
| `@types/react-dom` | 83,541,100 | DefinitelyTyped | 2025-11-12 | OK |
| `@vitejs/plugin-react` | 35,202,474 | 4 (Vite team) | 2026-03-13 | OK |
| `eslint` | 119,478,214 | 1 (nzakas) | 2026-04-03 | OK |
| `eslint-config-next` | 29,729,893 | 3 (Vercel) | 2026-04-01 | OK |
| `jsdom` | 62,164,589 | 2 | 2026-03-20 | OK |
| `tailwindcss` | 84,449,718 | 1 (adamwathan) | 2026-03-18 | OK |
| `typescript` | 163,218,894 | Microsoft | 2026-03-23 | OK |
| `vitest` | 43,167,382 | 1 (antfu) | 2026-03-26 | OK |

### Flagged: `@polar-sh/nextjs`

- **Why:** 21K weekly downloads (below 50K threshold)
- **Mitigating factors:** Same team as `@polar-sh/sdk` (135K/week), actively maintained, org-scoped. Low count reflects niche scope (Next.js-specific adapter for Polar payments).
- **Risk:** LOW — if discontinued, checkout/webhook code uses the SDK directly and could work without the adapter.

### Near-miss observations

- `tailwindcss`, `vitest`, `eslint` each show 1 npm maintainer, but are backed by large orgs (Tailwind Labs, Vite/Vue ecosystem, OpenJS Foundation)
- `@testing-library/user-event` last published 14+ months ago (stable release, not abandoned)

---

## Phase 3: Vulnerability Scan

### npm audit results: 6 vulnerabilities

| Package | Severity | Type | CVE/Advisory | Fix Available |
|---|---|---|---|---|
| `next` 16.1.6 | **moderate** | HTTP request smuggling in rewrites | GHSA-ggv3-7p47-pfv8 | Yes → 16.1.7+ |
| `next` 16.1.6 | **moderate** | Unbounded image disk cache growth (DoS) | GHSA-3x4c-7xq6-9pq8 | Yes → 16.1.7+ |
| `next` 16.1.6 | **moderate** | null origin bypasses CSRF checks | GHSA-mq59-m269-xvcx | Yes → 16.1.7+ |
| `next` 16.1.6 | **moderate** | Unbounded postponed resume buffering (DoS) | GHSA-h27x-g6w4-24gq | Yes → 16.1.7+ |
| `next` 16.1.6 | **low** | null origin bypasses dev HMR websocket CSRF | GHSA-jcc7-9wpm-mj36 | Yes → 16.1.7+ |
| `flatted` ≤3.4.1 | **high** | Prototype pollution + unbounded recursion DoS | GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh | Yes |
| `minimatch` <3.1.4 | **high** | ReDoS (3 separate advisories) | GHSA-3ppc-4f35-3m26 et al. | Yes |
| `picomatch` <2.3.2 | **high** | ReDoS + method injection | GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p | Yes |
| `ajv` <6.14.0 | **moderate** | ReDoS with `$data` option | GHSA-2g4f-4pwh-qvx6 | Yes |
| `brace-expansion` <1.1.13 | **moderate** | Process hang / memory exhaustion | GHSA-f886-m6hf-6m8v | Yes |

**Note:** `flatted`, `minimatch`, `picomatch`, `ajv`, `brace-expansion` are transitive dependencies (pulled in by eslint and its plugins). The `next` vulnerabilities are in the direct dependency.

### Outdated packages

| Package | Current | Wanted | Latest | Action |
|---|---|---|---|---|
| `next` | 16.1.6 | 16.1.6 | 16.2.2 | **Upgrade** (security fixes) |
| `@supabase/supabase-js` | 2.95.3 | 2.101.1 | 2.101.1 | Upgrade (semver compatible) |
| `@supabase/ssr` | 0.8.0 | 0.8.0 | 0.10.0 | Upgrade (breaking — test first) |
| `react` / `react-dom` | 19.2.3 | 19.2.3 | 19.2.4 | Upgrade (patch) |
| `eslint` | 9.39.2 | 9.39.4 | 10.2.0 | Minor bump only (10.x is major) |
| `typescript` | 5.9.3 | 5.9.3 | 6.0.2 | Hold (major version) |
| `tailwindcss` | 4.1.18 | 4.2.2 | 4.2.2 | Upgrade (minor) |

---

## Phase 4: Code Security Findings

### MEDIUM Severity

**1. Missing security headers** — `next.config.ts`

No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy headers configured. Leaves app vulnerable to clickjacking and MIME-sniffing.

**Recommendation:** Add headers config to `next.config.ts`:
```typescript
headers: async () => [
  {
    source: "/:path*",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
],
```

**2. Webhook secret fallback to empty string** — `web/app/api/webhooks/polar/route.ts:46`

```typescript
webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
```

If env var is unset, signature verification may silently pass or fail unpredictably.

**Recommendation:** Throw if missing: `if (!process.env.POLAR_WEBHOOK_SECRET) throw new Error("POLAR_WEBHOOK_SECRET not configured")`

**3. Auth callback redirect uses request origin** — `web/app/auth/callback/route.ts:15`

```typescript
return NextResponse.redirect(origin);
```

Uses `new URL(request.url).origin` which is safe in normal conditions but should use an explicit path for defense-in-depth.

**Recommendation:** `return NextResponse.redirect(new URL("/", req.url))`

### LOW Severity

**4. Missing env vars in `.env.example`** — server-side secrets (`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`) not documented for developer onboarding.

**5. Localhost fallback in checkout** — `web/app/api/checkout/route.ts:33`

```typescript
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
```

If env var is accidentally deleted in production, checkout redirects to localhost. Add production guard.

**6. Excessive error logging** — `web/app/api/checkout/route.ts:47-51` serializes full error objects including stack traces. Log sanitized messages instead.

**7. No explicit CSRF protection** — API routes rely on Supabase session cookies (httpOnly, SameSite) for CSRF protection, which is acceptable. Document this approach if adding new state-changing routes.

**8. Missing POLAR_PRODUCT_IDS validation** — `web/app/api/checkout/route.ts:22-29` silently redirects to `/profile` if product IDs are missing. Should show an error or log an alert.

### INFO (positive findings)

- No SQL injection — all queries use parameterized Supabase SDK methods
- No XSS — no `dangerouslySetInnerHTML` or `innerHTML` usage
- Auth tokens in httpOnly cookies (Supabase SSR pattern) — not in localStorage
- localStorage used only for non-sensitive UI preference (session duration)
- Server-side Supabase client used in all API routes (not browser client)
- RLS enabled on all tables with correct owner-only policies
- No secrets in git history (verified via `git log --all --diff-filter=A`)
- Webhook handler properly validates signatures via `@polar-sh/nextjs` Webhooks helper

---

## Phase 5: iOS Security Findings

**Result: CLEAN — no issues found**

- No hardcoded credentials; Supabase config loaded from xcconfig at build time
- xcconfig files properly gitignored (Debug.xcconfig, Release.xcconfig, Secrets.xcconfig)
- Uses `SecureField` for password input with correct `textContentType`
- No UserDefaults usage for sensitive data; Supabase SDK handles token storage
- No HTTP URLs — all HTTPS
- No ATS exceptions in Info.plist
- No sensitive logging found
- 18 Swift files reviewed

---

## OWASP Top 10 Compliance

| # | Category | Status |
|---|---|---|
| 1 | Broken Access Control | PASS — RLS policies + auth checks on all routes |
| 2 | Cryptographic Failures | PASS — Supabase handles encryption, HTTPS enforced |
| 3 | Injection | PASS — parameterized queries, no eval/innerHTML |
| 4 | Insecure Design | PASS — threat model documented, minimal attack surface |
| 5 | Security Misconfiguration | **FAIL** — missing security headers |
| 6 | Vulnerable Components | **FAIL** — Next.js 16.1.6 has 5 known CVEs |
| 7 | Authentication Failures | PASS — Supabase SSR properly configured |
| 8 | Data Integrity Failures | PASS — RLS + HMAC webhook signatures |
| 9 | Logging Failures | NEEDS IMPROVEMENT — excessive logging, no monitoring |
| 10 | SSRF | PASS — no external requests with user input |
