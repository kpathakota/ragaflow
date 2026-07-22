# Google Auth Integration Plan

**Status:** Planning
**Priority:** High — users are having trouble signing up with email; Google auth reduces friction.
**Scope:** Web only (iOS can follow the same Supabase provider later)

---

## Why

Email/password sign-up requires users to create and confirm a password, then click a confirmation email link. This is the primary source of drop-off. Google OAuth lets rasikas sign in with one click — no password, no confirmation email.

## Prerequisites (Supabase Dashboard — manual)

These steps must be done by hand in both **staging** and **production** Supabase projects before any code changes will work.

### 1. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URIs:
   - Staging: `https://<staging-supabase-ref>.supabase.co/auth/v1/callback`
   - Production: `https://<prod-supabase-ref>.supabase.co/auth/v1/callback`
   - Local dev: `http://localhost:54321/auth/v1/callback` (if using Supabase CLI locally)
4. Copy the **Client ID** and **Client Secret**

### 2. Enable Google provider in Supabase

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Toggle **Enable**
3. Paste the Client ID and Client Secret from step 1
4. Save

Repeat for both staging and production projects.

### 3. Configure OAuth consent screen

1. Google Cloud Console → APIs & Services → OAuth consent screen
2. App name: "Ragaflow"
3. User support email: your email
4. Scopes: `email`, `profile`, `openid` (defaults)
5. Publishing status: start with "Testing" (allows up to 100 test users), switch to "Production" when ready for public launch (requires Google review if you have sensitive scopes, but the default scopes don't need it)

---

## Code Changes

### Step 1: Add Google sign-in button to auth form

**File:** `web/app/auth/auth-form.tsx`

Add a "Continue with Google" button above the email form. On click, call `supabase.auth.signInWithOAuth()`:

```tsx
async function handleGoogleSignIn() {
  setError(null);
  const sb = createClient()!;
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    setError(error.message);
    trackEvent("auth_error", { method: "google", error: error.message });
  }
}
```

UI layout:
```
[ Continue with Google ]       ← full-width button, Google branding colors or stone style
─────── or ───────             ← divider
[ Email input ]                ← existing form, unchanged
[ Password input ]
[ Sign in / Sign up ]
[ Toggle sign-in/sign-up ]
```

### Step 2: Handle OAuth callback

**File:** `web/app/auth/callback/route.ts`

The existing callback already handles the `code` exchange correctly — `exchangeCodeForSession(code)` works for both email confirmation and OAuth callbacks. **No changes needed here.**

Supabase OAuth flow:
1. User clicks "Continue with Google"
2. Browser redirects to Google → user consents
3. Google redirects back to Supabase's `/auth/v1/callback`
4. Supabase redirects to our `/auth/callback?code=...`
5. Our route exchanges the code for a session
6. Redirect to `/`

### Step 3: Rasika provisioning — already handled

**File:** `web/lib/auth/auth-context.tsx`

The `onAuthStateChange` listener already calls `ensureRasika()` on `SIGNED_IN`. This fires for OAuth sign-ins too. **No changes needed.**

### Step 4: Profile page — show name for Google users

**File:** `web/app/profile/profile-client.tsx`

Google users have `user.user_metadata.full_name` and `user.user_metadata.avatar_url`. The profile currently shows `user.email`. Enhance:

```tsx
// In the Account section:
<p className="text-sm text-stone-200">
  {user.user_metadata?.full_name ?? user.email}
</p>
<p className="mt-1 text-xs text-stone-500">
  {user.user_metadata?.full_name ? user.email : null}
</p>
<p className="mt-1 text-xs text-stone-500">
  Member since {memberSince}
</p>
```

### Step 5: User badge — show initial or avatar

**File:** `web/components/user-badge.tsx`

Currently shows the first letter of the email. For Google users, could optionally show the Google avatar or the first letter of their name. Keep it simple — just use the first letter of `full_name` if available, otherwise first letter of email. (Avatar image is a nice-to-have but not required.)

### Step 6: Auth form — handle redirect reasons

**File:** `web/app/auth/auth-form.tsx`

The `reason` query param (e.g., `?reason=favorites`) currently sets the default to sign-up mode. Google sign-in is provider-agnostic (no separate sign-up vs sign-in), so the reason text should still display ("Sign in to save favorites") but the Google button works either way.

---

## What Does NOT Change

- **Data model** — no schema changes. Google users get a rasika row just like email users.
- **RLS policies** — auth.uid() works the same regardless of provider.
- **Session player, favorites, preferences, payments** — all use `user.id` from Supabase auth, which is provider-agnostic.
- **Callback route** — already handles the code exchange generically.
- **ensureRasika** — already idempotent, fires on any `SIGNED_IN` event.

---

## Edge Cases

1. **Same email, different provider** — If a user signs up with email, then later tries Google (same email), Supabase links the accounts automatically (default behavior). The rasika row stays the same because `rasika_id` = `auth.uid()` and Supabase keeps the same UUID.

2. **Google account without email scope** — Won't happen; email is a default scope for Google OAuth.

3. **User revokes Google access later** — They can still sign in with Google again (re-grants). Or they can set a password on their Supabase account and use email/password. We don't need to handle this in code.

4. **Popup blocked** — Supabase OAuth uses a full-page redirect by default (not a popup), so this isn't an issue.

---

## Testing Checklist

### Automated
- [ ] Auth form renders Google button
- [ ] Google sign-in calls `signInWithOAuth` with correct params
- [ ] Profile shows full name for users with `user_metadata.full_name`
- [ ] Profile falls back to email when no `full_name`

### Manual (staging)
- [ ] Click "Continue with Google" → redirects to Google consent
- [ ] After consent → redirected back to app, signed in
- [ ] Profile page shows Google name and email
- [ ] User badge shows correct initial
- [ ] Favorites, defaults, sessions all work normally
- [ ] Sign out works, then sign back in with Google works
- [ ] New Google user → rasika row created automatically
- [ ] Existing email user signs in with Google (same email) → same account, favorites preserved

---

## iOS (future, not this PR)

The Supabase Swift SDK supports `signInWithOAuth(provider: .google)` with ASWebAuthenticationSession. Once the Google provider is enabled in Supabase (the prerequisite steps above), the iOS implementation is:

1. Add Google Sign-In button to `AuthView.swift`
2. Call `supabase.auth.signInWithOAuth(provider: .google, redirectTo: URL)` — uses an in-app browser
3. `SupabaseService` already listens for auth state changes and provisions rasikas

This can be a separate PR after the web version ships.

---

## Estimated Effort

- Supabase/Google Cloud setup: ~15 minutes (manual, one-time)
- Code changes: ~30 minutes (mostly `auth-form.tsx` + minor profile tweaks)
- Testing: ~15 minutes (manual flow on staging)

Total: ~1 hour
