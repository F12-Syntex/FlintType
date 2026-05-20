# Friends system

Authoritative guide for the friends/social subsystem: following, presence, live spectate, async duels, and the social surfaces built on top. Built in verifiable steps — each step lands its tests in the same commit, is independently verified, and only then does the next begin.

## Product decisions (locked)

| Question | Decision |
|---|---|
| Graph model | **Follow + mutual = friend.** Follows are one-way, no approval. A reciprocal pair (A→B and B→A) makes them *friends*; mutuality is what unlocks duels + live spectate. |
| Spectate scope | **Live solo practice** is the headline (watch a friend type in real time), built on top of cheaper layers first. |
| Spectate write transport | **Direct browser → Railway authority**, capability-token-authed + CORS, bypassing the Vercel proxy. Mirrors the existing SSE-direct path; chosen for latency + architectural consistency (not cost — at current scale both are ~$0, but the direct path doesn't degrade with growth and keeps a 10–12 Hz stream off Vercel function-invocation/CPU meters). Extends `docs/multiplayer.md` — amended in the spectate step. |
| Headline extras | Friends-scoped leaderboard, "beat my run" async ghost duels, head-to-head profile compare, activity feed / PB notifications. |

## Architecture in 30 seconds

- **Graph** lives in Postgres: two directed-edge tables, `follows` and `blocks` (`src/db/schema/server/`). No `friendships` table — mutuality is a read-time computation (`follows.listFriends` / `isMutual`). No FK constraints (same mirror convention as `tests`/`notifications`; Clerk owns identity, dangling edges to deleted users are filtered at display time).
- **Notifications** reuse the existing per-user feed (`notifications` table, open `kind` + jsonb `data` + dedupe index). New kinds: `follow`, `mutual`, `friend_pb`, `duel_*`. No migration per kind — only a new `NotificationKind` union arm + renderer.
- **Presence + live spectate** ride the Railway race authority — the one warm process that already owns ephemeral live state + SSE broadcast. Presence is an in-memory map fed by a heartbeat/control SSE; that same control channel tells a broadcaster "you're being watched" so streaming is **lazy** (only while a spectator is attached). Progress writes go browser→authority direct with a per-session capability token.
- **Async ghost duels** need *no* live infra: a duel snapshots the passage + the challenger's per-second `wpmHistory` (already persisted on `tests`), and the opponent races a ghost integrated from those samples — the same trick the race bot tick uses.

## Data model

### `follows` (Step 1)
`(follower_id, followee_id)` composite PK, `created_at`. Secondary index on `followee_id` for "who follows me". Self-edges never written.

### `blocks` (Step 1)
`(blocker_id, blocked_id)` composite PK, `created_at`. A block in *either* direction (`blocks.eitherBlocks`) severs the relationship for both and prevents re-follow/duel/spectate. Blocking also unfollows both ways (route-orchestrated).

_(Later steps add: duel/run-snapshot tables (Step 7); presence + live-session state is in-memory on the authority, not in Postgres (Steps 8–9).)_

## Build steps & status

| # | Step | Status |
|---|---|---|
| 1 | Friend-graph data layer (schema, repos, repo tests, wiring, migration) | ✅ done |
| 2 | Friend-graph backend routes (`friends` namespace + notification kinds) | ✅ done |
| 3 | Friend-graph UI (follow button, friends page, profile/leaderboard integration) | ✅ done |
| 4 | Friends-scoped leaderboard | ✅ done |
| 5 | Head-to-head profile compare | ✅ done |
| 6 | Activity feed (PB fan-out to followers) | ✅ done |
| 7 | Async ghost duels ("beat my run") | ✅ done |
| 8 | Presence (online / rich status) | ✅ done |
| 9 | Live solo-practice spectate | ✅ done |

Each step: tests-first, `yarn test` + `yarn tsc --noEmit` green, a dedicated agentic verification pass, then commit.

## Step log

### Step 1 — Friend-graph data layer
- **Schema:** `src/db/schema/server/follows.ts`, `src/db/schema/server/blocks.ts`; exported from the schema barrel.
- **Repos:** `followsRepo` (follow, unfollow, isFollowing, isMutual, listFollowing, listFollowers, listFriends, followingCount, followerCount) and `blocksRepo` (block, unblock, isBlocked, eitherBlocks, listBlocked). Wired into `Database` (`src/db/server/index.ts`) as `db.follows` / `db.blocks`.
- **Tests:** `follows.test.ts`, `blocks.test.ts` — direction, idempotency, self-edge refusal, mutual detection, list sides, ordering, counts (D3/R12).
- **Migration:** generated via `yarn db:generate`; test DDL in `src/db/server/testing.ts` kept as a 1:1 mirror.
- Repos are pure data access — the follow→unfollow-both-ways-on-block invariant and all auth/notification side-effects are the route layer's job (Step 2).

### Step 2 — Friend-graph backend routes
- **Namespace:** `src/server/routes/friends/` — `follow`, `unfollow`, `block`, `unblock`, `relationship`, `stats`, `listFollowing`, `listFollowers`, `listFriends`. Gated by `[requireAuth, rateLimit(60/min)]`; registered in `router.ts`. Available on the client as `useBackend().friends.*`.
- **Types:** `src/types/friends.ts` — `friendTargetSchema` + `FriendRelationship` (the pairwise state every mutation returns), `FriendUser`, `FriendListOutput`, `FriendStats`.
- **Mutations return the fresh `FriendRelationship`** so the follow button re-renders from the response (no follow-up read).
- **Invariants in the route layer:** can't follow yourself / across a block (either direction); `block` severs both follow edges; non-existent target → 404 (validated via Clerk).
- **Notifications:** new `follow` (dedupe `follow:<me>`) and `mutual` (dedupe `mutual:<sorted-pair>`, fired to both users) kinds added to `src/types/notification.ts`. Side-effects fire only on a newly-created edge — idempotent re-follows are silent. Renderers for these kinds land in Step 3.
- **Shared helper:** `src/server/user-display.ts` `resolveUserDisplays(db, ids)` — bulk Clerk fetch + tag resolution (the leaderboard's inline block, extracted for reuse; hardened against partial Clerk shapes). `relationship.ts` holds `relationshipOf` / `toFriendUsers` read-model builders.
- **Tests:** `friends/index.test.ts` (R8 matrix: happy/validation/auth/domain + fan-out idempotency, block invariant, list filtering) and `user-display.test.ts` (fallback chain, unresolved-id omission, tag selection).

### Step 3 — Friend-graph UI
- **`<FollowButton>`** (`src/components/follow-button.tsx`) — the one reusable relationship control. State→treatment + the single-coral-spark rule documented in `docs/ui-law.md` §17. Self-contained optimistic state via `useAsyncAction`; Block/Unblock in an adjacent kebab.
- **`/friends`** (`src/app/friends/`) — segmented Friends / Following / Followers tabs; loads all three lists once and computes follow-back state locally (no per-row relationship call). Editorial empty states; `noIndex` (signed-in-only, off sitemap/llms).
- **Profile hero** — non-owners get the Follow button + "Follows you" badge + a follower/following/friend count line (links to /friends for the owner). Needed `subjectUserId` on the history payload (`src/types/history.ts` + handler); visitor stat cells drop to ink so the Follow CTA is the lone spark.
- **Notifications** — `follow` / `mutual` renderer arms + profile links in `notifications-popover.tsx`; `mutual` carries the same quiet coral check as the button.
- **Nav** — "Friends" added to the app nav (`app-chrome.tsx`).
- Verified: `yarn tsc` clean, `yarn build` compiles `/friends`, full suite green. Components are browser-tested per ui-law §1.3 (no unit tests).

### Step 4 — Friends-scoped leaderboard
- **Repo:** `tests.topLeaderboard` gains an optional `userIds` allowlist — `undefined` = global, `[]` = empty board, `[…]` = restrict to that set.
- **Route:** `friends.leaderboard` (auth-gated via the namespace) ranks the caller + everyone they follow, same `LeaderboardInput`/`LeaderboardOutput` as the public board so the client renders it through the identical table.
- **Shared helper:** `sinceFor` / `modeFor` extracted to `src/server/leaderboard-window.ts` (+ test) and consumed by both the public and friends boards so their window/mode semantics can't drift.
- **UI:** a Global / Friends `AudienceToggle` on the leaderboard (URL-driven `?audience=friends`, signed-in only, full-inversion active pill — not coral); `useLeaderboard` branches the backend call and keys its SWR cache on audience.

### Step 5 — Head-to-head profile compare
- **Repo:** `tests.userStats(userId)` — completed-run aggregates (tests, best WPM, best net WPM, best accuracy), zeros when none.
- **Route:** `friends.compare({ userId })` (auth-gated) returns both sides (`me` vs `them`) with display + stats; 400 self-compare, 404 unknown target.
- **UI:** `<HeadToHead>` panel on a visitor's profile — winner per metric marked by weight/ink vs muted (no coral, so the hero Follow CTA stays the single spark). Shown only to signed-in non-owners.

### Step 6 — Activity feed (PB fan-out)
- When a user sets a PB (`adapt.submit`), a `friend_pb` notification fans out to their **followers** (`listFollowers`), deduped per run (`friend_pb:<testId>`). The fan-out sits in its own try/catch inside the existing PB block — it only runs on a real PB, only calls Clerk when there's ≥1 follower, and can never turn a submit into a 5xx.
- New `friend_pb` notification kind + `FriendPbNotificationData` (friend handle + run stats); popover renders it (neutral, not coral) linking to the friend's profile.
- The notification feed (bell popover) is the activity feed — no separate page.

### Step 7 — Async ghost duels ("beat my run")
- **Schema:** `duels` (snapshot of passage + challenger run + per-second WPM trace, status pending→completed, opponent result). Migration `0009`; test DDL mirrored. Repo `duelsRepo` (create/findById/listIncoming/listOutgoing/guarded recordResult).
- **Routes:** `duels` namespace (auth) — `create` (mutual-friend gate, snapshots run, notifies opponent), `get` (participants only), `submitResult` (opponent-only, guarded, notifies challenger, win = net WPM), `list`. Notification kinds `duel_challenge` / `duel_result`.
- **No live infra:** a duel is pure request/response. The opponent races a ghost cursor integrated from the challenger's trace.
- **`DuelTyper`** (`app/duel/_components/`) — self-contained typing surface (decoupled from the adaptive engine): hidden-input capture, gross WPM/accuracy, per-second sampling, ghost pacing. The cumulative-char math is a pure, tested helper (`ghost.ts` + `ghost.test.ts`) — samples are cumulative averages, mapped (not re-integrated) to char positions.
- **Flow:** challenger sets the run at `/duel/new?opponent=<id>` (Duel button on a mutual friend's profile) → opponent races at `/duel/<id>` → `<DuelOutcome>` scoreboard (winner by weight, net WPM). `/duels` lists incoming/outgoing; linked from `/friends`; notifications deep-link to the duel.

### Step 8 — Presence (who's online)
- **DB-backed**, not in-memory on the race authority: presence keys on the authenticated Clerk userId (which the authority can't see), and a shared `presence` table (migration `0010`) is correct across Vercel instances. "Online" is derived at read time (lastSeenAt within `ONLINE_WINDOW_MS` = 60s, 2× the heartbeat), so a closed tab needs no goodbye.
- **Routes:** `presence` namespace (auth) — `heartbeat({status?})` upsert; `list()` returns presence for the people the caller **follows** only (privacy: you don't see strangers' status). Repo `presenceRepo` (heartbeat upsert / getForUsers).
- **Client:** `<PresenceHeartbeat>` mounted once in `providers.tsx` posts a heartbeat every 30s while a signed-in tab is visible (paused when hidden, errors swallowed). The friends list shows a green `bg-ft-ok` online dot (with `aria-label`) on followed users currently online.

### Step 9 — Live solo-practice spectate
- **On-by-default, mutual-only, with a per-friend denylist.** Sharing is **on by default** (`spectate.enabled !== false`); a global Off (`enabled: false`) stops all broadcasting, and a per-friend `spectate.blocked: string[]` denylist keeps named friends out. Spectating requires the viewer be a **mutual friend**, unblocked, sharing not globally off, and not on the target's denylist, plus the target currently live. `live.watch` returns `{ live: false }` for every disallowed case so nothing leaks — every denial path is tested. (The original spec was consent-first / default-off; the owner flipped it to on-by-default + per-friend control.)
- **Who's watching.** `live.watch` records the viewer in `live_spectators` (migration `0012`; `liveSpectatorsRepo`), and `live.spectators` returns the caller's fresh watchers (within `SPECTATOR_TTL_MS`) so the broadcaster's practice screen shows "N people are spectating" instead of a static consent pill.
- **Watching = a clone of their screen.** The `live.progress` snapshot carries an optional `screen` payload (windowed typed state + the broadcaster's appearance/caret/behaviour prefs + resolved theme CSS vars). `<LiveClone>` reconstructs a frozen practice state and mounts the **real** `<Passage>`/`<Readouts>` under a `<PrefsOverrideProvider>` (the pref hooks read it read-only) + the broadcaster's theme vars on the container, so the viewer sees the broadcaster's actual screen, themed as them. See `docs/ui-law.md` §17.6. (v1 still polls; the SSE upgrade in `docs/multiplayer.md` swaps transport behind the same `screen` payload.)
- **DB-backed store** (`live_sessions`, migration `0011`; `liveSessionsRepo`), not in-memory on the authority — keyed on the authenticated Clerk userId and correct across Vercel instances. "Live" is freshness of the last push (`LIVE_TTL_MS` = 6s).
- **Routes:** `live` namespace (auth) — `progress` (broadcaster push, only stored if opted in), `watch` (gated poll), `stop`.
- **Transport:** v1 polls `live.progress` / `live.watch` every ~700ms through the normal backend (sub-second "live-ish"). The designed end-state — direct browser→authority writes + a capability-token SSE stream — is documented in `docs/multiplayer.md` as the upgrade behind the same `live.*` surface.
- **UI:** `<TypingSurface>` (promoted from the duel typer to `src/components/`, now shared by duels + live) streams progress via its `onProgress` hook on the `/live` broadcaster surface (with the consent toggle); `/live/<userId>` polls + renders the friend's passage read-only (`<LivePassage>`). Discovery: a "Watch" link on mutual friend rows + a "Practise live" link on `/friends`.
- The duel typer was promoted (not copied) per `docs/organization.md` — a component used by two routes belongs in `src/components/`.
- **Broadcasting is now ambient (no `/live` broadcaster page).** A `PracticeLiveBroadcast` mounted inside `PracticeProvider` streams from the real practice + sudden-death surfaces while sharing is on; the snapshot is windowed to `LIVE_MAX_WORDS` so a runaway TIME buffer can't blow the wire cap. Watching is reached from the reworked `/friends` hub. See `docs/ui-law.md` §17.4 (consent chip) + §17.5 (hub).
- **Lazy streaming (efficiency).** The broadcaster does NOT push at a fixed rate forever. `live.progress` returns the current watcher count (one indexed read, free on the push), and the broadcaster self-throttles: **full rate + the heavy `screen` clone payload only while watched** (`WATCHED_MS`); a **slow, light heartbeat** (no `screen`) while typing-but-unwatched (`HEARTBEAT_MS`, for discoverability in "live now"); and it **stops entirely when idle + unwatched**. The watcher count flows to the on-screen indicator via a tiny shared store (`src/lib/live-watchers.ts`), so the indicator names watchers only when there's actually someone to name — no idle polling. (This is the "lazy control channel" `docs/multiplayer.md` always intended, achieved over the polling transport by piggy-backing the count on the progress response.)
- **Dev self-spectate.** `selfSpectateAllowed()` (`src/server/live-self-spectate.ts`, gated `IS_DEV && !IS_TEST`) lets a developer watch their *own* live session in `APP_ENV=development`, so the broadcast → watch flow is testable in one browser: turn sharing on, practise in one tab, and you appear in your own "Live now" (and `/live/<yourId>` works). Everyone else still needs to be an unblocked mutual friend; the bypass can never fire on a hosted deploy (env.ts forbids `APP_ENV=development` there) or under the test runner.
