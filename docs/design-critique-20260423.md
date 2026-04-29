# Design Critique — 2026-04-23

Screen-by-screen audit of iOS and web, evaluated against each screen's job-to-be-done (JTBD).

---

## Screen 1: Home

**JTBD:** "I want to start a listening session quickly, or choose a mode that fits my current need."

Quick Play works well for returning users (1-tap play), but **new users see an inert screen** — 3 scenario cards, no audio, no imagery. The tagline wastes prime real estate explaining what the app *is* instead of what you can *do*. Time-to-first-audio is **4 taps** for a new user.

**Platform differences:**
- Explore accent color: web = emerald, iOS = tan (#B88557)
- Auth placement: web = text link top-right, iOS = toolbar button

**Recommendations:**
1. Add a "Featured session" card (auto-selected by time of day) for 1-tap play
2. Replace the tagline with a time-aware greeting ("Good evening")
3. Drop the favorites count from Home — it belongs on Profile

---

## Screen 2: Auth

**JTBD:** "I need to log in so my favorites, defaults, and listening history are saved."

Functional but bland. The confirm-password field adds friction for marginal security value. The email confirmation flow creates a dead end (user signs up, sees "check your email," may never return).

**Platform differences:**
- iOS has explicit confirm-password on sign-up; web does not
- iOS uses a blue submit button, breaking the earth-tone palette

**Recommendations:**
1. Add Google/Apple OAuth (biggest auth conversion lever)
2. Remove confirm-password; rely on Supabase's minimum-length rule
3. Add a "Continue without account" link explaining what they miss

---

## Screen 3: Scenario Track List (Focus / Sleep / Meditate)

**JTBD:** "I've chosen my mode — now I want to pick a specific track to play."

Information-dense cards (6-7 data points each) create **decision fatigue**. Sorted by recording date, which is irrelevant to a new listener. No guidance on what to try first.

**Platform differences:**
- Web fires `scenario_view` analytics event; iOS does not
- Web TrackCard has hover effects (mouse interaction); iOS cards are static tap targets

**Recommendations:**
1. Pin an "Editor's pick" badge to one track per scenario
2. Collapse description to one line by default
3. Add a sort toggle (Newest / Popular)
4. Show a toast instead of silently redirecting unauthenticated heart taps to `/auth`

---

## Screen 4: Session Player

**JTBD:** "I want to listen to this track for a set duration, then optionally save it as my default."

The core loop works but **the running state is nearly empty** — a tiny grey timer and a static blurred orb. Users stare at this for 25-45 minutes. The looped audio restarts with no crossfade.

**Platform differences:**
- Sleep volume fade: iOS only (fades over last 120s)
- Remote command center: iOS only (earbuds/car controls)
- Favorite placement: inline (web) vs toolbar (iOS)
- "Back to list" button on completion: iOS only
- No volume control on web

**Recommendations:**
1. Make timer larger (`text-4xl`) in accent color during playback
2. Show track title + ragam name below the timer during running/paused states
3. Add a circular progress ring around the play/pause button
4. Add a breathing animation to the background orb (especially for meditate/sleep)
5. Implement a 3-second crossfade on loop restart
6. Port sleep volume fade to web

---

## Screen 5: Explore

**JTBD:** "I want to discover new tracks by browsing ragams or filtering by mood/tag."

Grouping by ragam assumes domain knowledge most users don't have. "Bhairavi" and "Yaman" are meaningless to casual listeners. No search, no duration filter, no free/premium filter.

**Platform differences:**
- iOS has "Clear filters" button + selected tag count badge; web does not
- Ragam sort order may differ (web unspecified vs iOS alphabetical)
- iOS tag pills use gold background when selected; web highlight style differs

**Recommendations:**
1. Add a search bar (client-side fuzzy across titles, ragams, tags)
2. Make ragam descriptions more prominent as mood descriptors
3. Add duration and free/premium filters
4. Fix the scenario context when linking from Explore so the back button returns to Explore

---

## Screen 6: Profile

**JTBD:** "I want to see my listening progress, manage my account, or check my subscription."

**Biggest inconsistency between platforms.** Web has defaults management but limited subscription/certifications display. iOS has subscription badges + certification progress bars but no defaults management.

**Platform differences:**
- Web: shows default track management per scenario
- iOS: shows subscription section with status badges, pricing tiers, messaging
- iOS: shows certifications grid (ragam, tier, progress bar, next tier)
- Neither platform has both — a user on both sees a disjointed experience

**Recommendations:**
1. Bring both platforms to feature parity
2. Add tier selection before "Subscribe" (currently one-click with no tier choice)
3. Add "Clear" action for default tracks
4. Add a "Recent sessions" mini-list (last 5) below stats
5. Link favorites count to a filtered Explore view

---

## Top 5 Priorities

| # | Priority | Impact | Effort |
|---|---|---|---|
| 1 | **Reduce time-to-first-audio** — Featured track on Home for 1-tap play | High | Medium |
| 2 | **Upgrade session player running state** — Larger timer, track info, progress ring, ambient animation | High | Medium |
| 3 | **Add "Editor's pick" curation** — Pin a recommended track per scenario | High | Low |
| 4 | **Add Google/Apple OAuth** — Eliminate email-confirmation dead end | High | Medium |
| 5 | **Add search to Explore** — Makes ragam names less intimidating | Medium | Low |

---

## Visual Consistency Fixes (quick wins)

- Unify Explore accent color across platforms (pick one)
- iOS auth: change blue submit button to match earth-tone palette
- Port sleep volume fade to web
- Add "Back to list" to web session player completion state
- Add "Clear filters" + selected count to web Explore
- Unify favorite button placement on session player (inline vs toolbar)
