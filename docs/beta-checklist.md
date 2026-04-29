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

1. Color pass with Supriya (April 25 weekend)
2. Apply new palette to web + iOS
3. Build landing page with new palette
4. Draft invite email
5. Send invites

## People

- **Gautam** — need to chat with him, check how he's feeling about the project. Also: does he have more material in progress? More tracks would help variety per scenario.
- **Supriya** — color/branding session this weekend. Playfair Display direction is set; need to nail the palette.

## Design Critique Checklist (per-screen sign-off before wider rollout)

Each screen needs a design pass before opening beyond 30 people. Derived from `docs/design-critique-20260423.md`.

### Screen 1: Home

- [x] Featured track card for 1-tap play (PR #48, #49)
- [ ] Time-aware greeting ("Good evening") instead of tagline
- [ ] Drop favorites count from Home (belongs on Profile)
- [ ] Unify Explore accent color across platforms (web=emerald, iOS=tan)

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

- [ ] Larger timer (`text-4xl`) in accent color during playback
- [ ] Show track title + ragam name below timer during running/paused
- [ ] Circular progress ring around play/pause button
- [ ] Breathing animation on background orb (meditate/sleep)
- [ ] 3-second crossfade on loop restart
- [ ] Port sleep volume fade to web
- [ ] Add "Back to list" to web session player completion state
- [ ] Unify favorite button placement (inline vs toolbar)

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

- [ ] Unify Explore accent color across platforms
- [ ] iOS auth: earth-tone submit button
- [ ] Port sleep volume fade to web
- [ ] "Back to list" on web player completion
- [ ] "Clear filters" + count badge on web Explore
- [ ] Unify favorite button placement on session player

---

## After beta starts

- Watch for: which scenario people gravitate to, session completion rates, whether anyone comes back on day 2/3/7
- Content pipeline should be ready so Gautam can ship tracks and they go live fast
- Auth/SMTP upgrade if signup volume surprises us
