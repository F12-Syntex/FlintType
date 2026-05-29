# Social-loop simulation report

`sim/social-loop.spec.ts` drives **four** signed-in personas (`ember`, `flint`,
`spark`, `coal`) through a realistic, coordinated social session inside **one**
Playwright test process holding four browser contexts — so every emulated user
is genuinely aware of the others (presence, notifications, and a shared race
room all observe each other live).

## Run command

```
yarn playwright test --config sim/playwright.sim.config.ts --project sim -g "social loop:"
```

(Sessions in `sim/.auth/*.json` are reused off disk; no `--project setup` needed
unless they've expired.) Typical runtime ~2 minutes.

## Flows exercised

1. **Warm up** — each persona loads the practice surface (`/`, *not* `/app` —
   `/app` is a 404 in this build), reads the live passage words off the DOM, and
   types them at ~300 WPM (human-paced, under the 500-WPM cap) to a full results
   screen (RAW / PEAK / CONSISTENCY stats). Seeds the leaderboard + activity.
2. **Befriend** — all 12 directed follows (each persona follows the other three)
   via the profile `<FollowButton>`. `followFrom()` handles every state
   ("Follow" / "Follow back" -> click; "Friends" / "Following" -> no-op) and backs
   off once on a rate-limit toast. A mutual follow = a friendship; the test
   asserts >= 6 edges resolve to a connected state and that flint's hero shows a
   non-zero friend count.
3. **Duel** — flint (host) opens flint's view of ember's profile and invites
   ember to a race: prefers the friend-only **"Race"** button
   (`<InviteToRaceButton>`), falls back to the **"Friends" status menu -> "Invite
   to a race"**. Both call `createLobbyAndInvite` -> navigate the host to
   `/race/c/<slug>` and drop a `race_invite` notification on ember. The test then:
   - opens ember's **notification bell** and asserts the "@Flint opened a race
     lobby and invited you" invite + a "Join" link are present (the accept
     affordance);
   - has ember **join the lobby** by the slug (exactly what clicking "Join"
     does), asserts the "Lobby . <slug>" heading (not the expired-link screen),
     and **readies up**;
   - host clicks **"Start race"** (the host-bar button, last in DOM);
   - both clients run the 3-2-1 **countdown** (proof they share the room) and
     **finishRace** their copy at ~265 WPM.
4. **Observe** — both clients reach the multiplayer **"RACE FINISHED"** screen
   with a **"Rematch"** CTA and a final standings table listing @Flint + @Ember.
   Every context's `console` + `pageerror` events are captured; `pageerror`
   (uncaught JS) is a hard-fail gate (none occur).

## Key behavioural findings (build facts, not bugs)

- **Practice surface is `/`, not `/app`.** `/app` 404s in this build. The brief's
  `/app` reference is stale; the sim uses `/`.
- **Private "Race"-invite lobbies are 1v1 (2 seats).** A third persona who joins
  the URL is *not* admitted — only host + invited friend appear ("01 @Ember /
  02 @Flint"). So the sim races a 2-persona duel (satisfies the "2-4 personas in
  the same lobby" lower bound). A larger lobby would need a different create path
  than the friend-profile invite.
- **Authenticated finished-race CTA is "Rematch", not "Race again".** The keyless
  `e2e/race-lobby-private.spec.ts` sees "Race again"; an authenticated
  multiplayer finish shows "RACE FINISHED" + "Rematch" + "Leave" + a standings
  table. The sim asserts the multiplayer copy.
- **Joiners must "Ready up" before the host can start.** With authenticated
  personas the joiner shows "NOT READY" until they click "Ready up"; the host's
  Start won't begin the countdown for an unready joiner. (The keyless e2e
  template skipped this — keyless guests evidently auto-ready.)

## Rate limiting — the main fragility (app behaving correctly)

The `friends` namespace is rate-limited **60/min per user** (`requireAuth` runs
before `rateLimit`, so the bucket is `u:<userId>`). Crucially, **every profile
load spends that budget** on `friends.relationship` / `stats` / `listFollowing`
/ etc. A chatty pass (many profile navigations + reloads) brushes the cap, and
when `friends.relationship` is throttled the profile hero renders **"Too many
requests — retry in Ns" with NO relationship control at all** — so neither the
"Follow"/"Friends" button nor the "Race" button appears. This caused every early
failure. Mitigations (all test-side):

- `followFrom()` / the duel loop detect the "Too many requests" line and wait the
  stated window out before retrying.
- A **35s budget-recovery pause** sits between befriend and duel so flint's
  per-minute window resets before the relationship-heavy invite path.
- Profile traffic is kept lean (one load per directed follow; no verification
  reloads).

`429` and `404` (favicon/asset) responses show up as benign `console.error`
entries in the run log; they're reported but don't fail the test (only
`pageerror` does). **No real app bug was found** — the rate limiter is doing its
job; the sim just paces itself like a human would.

## Fragile selectors / notes for maintainers

- **Two "Friends" buttons exist** with a friend's profile open: the hero status
  button *and* the friends-dock corner pill. The duel scopes the status-button
  lookup to `main` (the hero) to avoid grabbing the dock pill.
- The **"Race" `<InviteToRaceButton>` did not always render** on a mutual
  friend's hero across runs (it's `sm:`-only and depends on freshly-hydrated
  mutual state). The spec treats it as best-effort and falls back to the
  "Friends" menu -> "Invite to a race", which is reliable.
- Passage words (practice + race) are read off the inner block carrying a
  `translate3d` transform — the shared convention in `e2e/helpers.ts`.
- The notification "Join" affordance is a `role=link` (not a button); multiple
  stale `race_invite`s accumulate across reruns, so the sim asserts the invite +
  Join link exist, then joins by the slug it already holds (identical effect).
