# Ragaflow Issue Log

A record of bugs and issues encountered, why they mattered, and how they were resolved. Newest entries at the top.

---

## 2026-02-13 — Middleware → proxy migration (Next.js 16 breaking change)

**What:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`. The Supabase session refresh logic lived in middleware, so it broke silently on upgrade.

**Why it mattered:** Without the session refresh running on every request, Supabase auth tokens would expire mid-session and users would get logged out unexpectedly with no error message.

**Resolution:** Ran the Next.js 16 codemod. Renamed `middleware.ts` → `proxy.ts`, renamed the exported function, updated all internal imports. Also renamed `lib/supabase/middleware.ts` → `lib/supabase/session.ts` to remove the confusing naming overlap.

**Test signal:** Auth state should persist across page navigations without re-login.

---

## 2026-02-13 — Route directory renames broke dynamic params

**What:** Route directories were renamed: `[mode]` → `[scenario]` and `[ragamId]` → `[trackId]`. Any code still referencing the old param names (`params.mode`, `params.ragamId`) would silently return `undefined`.

**Why it mattered:** Track and session pages would render with no data — broken UI with no error thrown, because `undefined` is valid JavaScript.

**Resolution:** Renamed all `params.mode` → `params.scenario` and `params.ragamId` → `params.trackId` across all page and component files. Added `await params` per Next.js 15+ requirement (params is now a Promise).

**Test signal:** Navigating to `/mode/focus/[any-track-id]` should load track data. Check that `params.scenario` and `params.trackId` are both defined on the session player page.

---

## 2026-02-13 — Supabase publishable key vs. anon key

**What:** Supabase renamed their client-side key from "anon key" to "publishable key" with a new format (`sb_publishable_...`). The env var name changed from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Why it mattered:** Any deployment or local setup using the old env var name would fail to connect to Supabase entirely. The Supabase client would return `null`, triggering the seed fallback — silently, with no auth and no database.

**Resolution:** Updated `.env.local`, `.env.example`, all client/server Supabase init files, and CLAUDE.md to use the new key name. Documented in CLAUDE.md gotchas section.

**Reference:** https://github.com/orgs/supabase/discussions/29260

---

## 2026-02-13 — `tradition` column removed from ragams

**What:** The `ragams` table originally included a `tradition` column (Carnatic / Hindustani / both). This was intentionally removed from the data model.

**Why it mattered:** Tradition is a complex, contested categorization — many ragams exist in both traditions with variation. Encoding it as a single column would mislead users and force editorial decisions that don't belong in the MVP. The description field can carry nuance instead.

**Resolution:** Removed from `lib/types.ts`, `content/seed.ts`, and `supabase/migrations/001_initial_schema.sql`. Added to CLAUDE.md gotchas: "Don't re-add it."

---
