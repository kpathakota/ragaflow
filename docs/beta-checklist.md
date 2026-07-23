# Ragaflow — Beta-Ready Checklist (30-person rollout)

Goal: get Ragaflow into the hands of ~30 people to find who it actually works for. Not a polished launch — a real test with real listeners.

## Ready now

- [x] **Core loop** — scenario → track → session → completion works end-to-end
- [x] **Auth** — sign-in/sign-up flow is solid, no known friction
- [x] **Web deployment** — Vercel production on ragaflow.io
- [x] **iOS distribution** — TestFlight working, builds succeed
- [x] **Payments** — Polar.sh checkout, webhooks, portal all live (not needed for beta, but wired)
- [x] **Session logging** — listening sessions tracked with duration and completion
- [x] **Favorites & defaults** — rasikas can personalize their experience

## iOS App Store submission — what must be in `main` (as of 2026-07-22)

Everything below is **already on `dev`** — one `dev → main` merge is the only
code motion required. `main` is what matters twice over: Xcode Cloud archives
the submitted binary from `main`, and Vercel production (the listing's
Privacy/Terms/Support URLs) deploys from `main`.

**In the dev → main merge (code — complete):**

- [x] **Free-beta app** — "Go Premium" card + "Premium" badges stripped (PR #60);
      no Guideline 3.1.1 exposure (no subscription surfaced without IAP)
- [x] **Legal pages** — `/privacy`, `/terms`, `/support` (PR #61); go live on
      ragaflow.io the moment main deploys — these are the URLs the listing needs
- [x] **Review demo account** — `kpathakota+alt@gmail.com` / `alt123`, verified
      live on prod, wired into UI tests + listing doc (rotate after review)
- [x] **Info.plist ready** — background audio mode, export compliance
      (`ITSAppUsesNonExemptEncryption=false`), dark-only
- [x] **App icon** — real branded 1024 icon (tanpura rosette), already passing
      ASC validation via TestFlight uploads
- [x] **Listing kit** — copy/keywords/reviewer notes in
      `docs/app-store-listing.md`; 6 screenshots at 6.9" spec captured

**Must build before submission — account deletion (SHIPPED 2026-07-22):**

- [x] **Account deletion — Guideline 5.1.1(v), iOS + web.** Built per
      `docs/account-deletion-design.md`, merged to `dev` as PRs #63 (backend),
      #64 (web), #65 (iOS) — each code-reviewed by agent with fixes applied.
      - **Backend** — `delete-account` edge function **deployed to prod**;
        migrations 011 (`analytics_events.rasika_id` → SET NULL, events
        anonymized not deleted) + 012 (webhook orphan detection) **applied**
      - **Web** — `/profile` delete flow **verified on prod** (rows gone,
        analytics anonymized, re-registration clean)
      - **iOS** — Profile → Delete Account with destructive confirmation;
        69/69 unit tests; **pending TestFlight verification** once the next
        build exists (needs the dev → main merge below)
      - **Docs** — privacy policy/page + support page now say "delete in the
        app (Profile → Delete account), or email us"
      - Remaining test-matrix items: iOS on-device pass + the 409
        active-subscription path on both platforms (flip a throwaway's
        `subscription_status` in the SQL editor)

**Not code / not `main` (after the merge, owner: human):**

- [x] Merge `dev → main` → Xcode Cloud builds → select the build in ASC
- [ ] Get account deletion into main. 
- [ ] Verify `ragaflow.io/privacy` + `/terms` + `/support` live in production
- [ ] `support@ragaflow.io` mailbox (email routing on ragaflow.io) — listing
      contact + privacy-policy deletion requests land here
- [ ] ASC: paste listing copy, upload screenshots, App Privacy labels, age
      rating 4+, demo account in review notes → submit
- [ ] **Not required for submission:** the domain split (env-gated, off until
      flipped — see `docs/domain-split-runbook.md`) and the color pass
- [ ] Build an app walkthrough in derive.to. 

## Before invites go out

- [x] **Color pass with Supriya** — weekend of April 25. Something about the current palette isn't right. Align on scenario accents, backgrounds, text warmth.
- [x] **Landing page** — shipped (PR #61): `/landing` live behind the env-gated domain split, on-brand draft copy. Full copy pass planned after the domain split is flipped.
- [ ] **Invite email draft** — short, opinionated, tells people what to expect. Most won't read it, but the ones who do should feel invited, not instructed.

## Not blocking (confirmed)

- **SMTP/email config** — Supabase default mailer works at this scale (~30 signups). Custom SMTP is a "before 300 people" problem.
- **Content depth** — 30 tracks across 7 ragams is thin but acceptable. The point is finding fit, not showcasing a library.
- **Listening gate (10h)** — intentionally deferred. No need to gate free listeners during beta.
- **Track grouping by ragam** — cosmetic issue at current track count. Not confusing with 30 tracks.
- **Background completion notifications** — deferred. Timer drift is fixed. Good enough.

## Sequence

See `docs/automation-rollout.md` for the orchestration plan; this is the user-facing rollout:

1. Lock per-screen JTBDs into `docs/screens/` (decisions A1–A5)
2. Wing an initial palette + typography lock, apply to web + iOS
3. Modernize screens via the automation loop — one PR per screen, in priority order from `design-critique-20260423.md`
4. Build landing page
5. Draft invite email
6. Send invites
7. **Later:** color tuning pass with Supriya once she can use the Beta build

## People

- **Supriya** — color tuning happens *after* Beta is in her hands, not before. Playfair Display direction is set; palette will be tuned against real screens.

## Design Critique Checklist (per-screen sign-off before wider rollout)

Each screen needs a design pass before opening beyond 30 people. Derived from `docs/design-critique-20260423.md`.

### Screen 1: Home

- [x] Featured track card for 1-tap play (PR #48, #49)
- [x] iOS home brought to parity with web redesign (candle glow, serif lockup, "Tonight" card, serif scenario cards, two-up footer)
- [x] Unify Explore accent color across platforms (both now a neutral cream footer tile)
- [ ] Time-aware greeting ("Good evening") instead of tagline *(open on both platforms)*
- [ ] Drop favorites count from Home (belongs on Profile) *(open on both platforms)*

### Screen 2: Auth

- [ ] Google/Apple OAuth (biggest auth conversion lever)
- [ ] "Continue without account" link explaining what they miss
- [ ] iOS: change blue submit button to match earth-tone palette

### Screen 3: Scenario Track List

- [ ] Pin "Editor's pick" badge to one track per scenario
- [ ] Collapse description to one line by default
- [ ] Add sort toggle (Newest / Popular)
- [ ] Show toast for unauthenticated heart taps (instead of silent redirect)

### Screen 4: Session Player

- [x] Larger timer (`text-4xl`) in accent color during playback *(web — #52)*
- [x] Show track title + ragam name below timer during running/paused *(web — #52)*
- [x] Circular progress ring around play/pause button *(web — #52)*
- [x] Breathing animation on background orb (meditate/sleep) *(web — #52)*
- [ ] 3-second crossfade on loop restart *(deferred — needs dual-`<audio>` + real-device verification)*
- [x] Port sleep volume fade to web *(web — #52)*
- [x] Add "Back to list" to web session player completion state *(web — already present)*
- [x] Unify favorite button placement (inline vs toolbar) *(web — #52)*
- [x] **iOS catch-up: player** — mirrored the above on `SessionPlayerView.swift` (parity policy A3: web leads, iOS follows): large accent-colored timer, ragam name below timer, circular progress ring around play/pause, breathing orb for meditate/sleep (reduce-motion aware). Sleep fade + "Back to list" already present. Tested post-merge to dev (C3).

### Screen 5: Explore

- [x] Search bar (client-side fuzzy across titles, ragams, tags) *(web + iOS)*
- [x] Make ragam descriptions more prominent as mood descriptors *(web + iOS — serif italic + time-of-day)*
- [x] Duration and free/premium filters *(web + iOS)*
- [x] Fix back-button context when linking from Explore *(web — ?from=explore; iOS via NavigationStack)*
- [x] Add "Clear filters" + active-filter count *(web + iOS)*

### Screen 6: Profile

- [ ] Feature parity across web and iOS (defaults + certs + subscription on both)
- [ ] Tier selection before "Subscribe" (currently one-click, no tier choice)
- [ ] "Clear" action for default tracks
- [ ] "Recent sessions" mini-list (last 5) below stats
- [ ] Link favorites count to a filtered Explore view

### Visual Consistency (quick wins)

- [x] Unify Explore accent color across platforms *(home: both now a neutral cream footer tile)*
- [ ] iOS auth: earth-tone submit button
- [x] Port sleep volume fade to web *(#52)*
- [x] "Back to list" on web player completion *(already present)*
- [x] "Clear filters" + count badge on web Explore
- [x] Unify favorite button placement on session player *(web — #52; iOS catch-up tracked under Screen 4)*

---

## After beta starts

- Watch for: which scenario people gravitate to, session completion rates, whether anyone comes back on day 2/3/7
- Content pipeline should be ready so Gautam can ship tracks and they go live fast
- Auth/SMTP upgrade if signup volume surprises us
