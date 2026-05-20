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
| 3 | Friend-graph UI (follow button, friends page, profile/leaderboard integration) | ⬜ |
| 4 | Friends-scoped leaderboard | ⬜ |
| 5 | Head-to-head profile compare | ⬜ |
| 6 | Activity feed (PB fan-out to followers) | ⬜ |
| 7 | Async ghost duels ("beat my run") | ⬜ |
| 8 | Presence (online / rich status) | ⬜ |
| 9 | Live solo-practice spectate | ⬜ |

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
