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

## Before invites go out

- [ ] **Color pass with Supriya** — weekend of April 25. Something about the current palette isn't right. Align on scenario accents, backgrounds, text warmth.
- [ ] **Landing page** — needs to exist. When someone taps the invite link, they should understand what Ragaflow is and what to do within 5 seconds. Do this _after_ the color pass so it ships with the new palette.
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
- [ ] **iOS catch-up: player** — mirror the above on `SessionPlayerView.swift` (parity policy A3: web leads, iOS follows). Tested post-merge to dev (C3).

### Screen 5: Explore

- [ ] Search bar (client-side fuzzy across titles, ragams, tags)
- [ ] Make ragam descriptions more prominent as mood descriptors
- [ ] Duration and free/premium filters
- [ ] Fix back-button context when linking from Explore
- [ ] Add "Clear filters" + selected tag count to web

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
- [ ] "Clear filters" + count badge on web Explore
- [x] Unify favorite button placement on session player *(web — #52; iOS catch-up tracked under Screen 4)*

---

## After beta starts

- Watch for: which scenario people gravitate to, session completion rates, whether anyone comes back on day 2/3/7
- Content pipeline should be ready so Gautam can ship tracks and they go live fast
- Auth/SMTP upgrade if signup volume surprises us
