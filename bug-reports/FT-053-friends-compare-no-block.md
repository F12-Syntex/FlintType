# FT-053 — friends.compare returns a target's head-to-head stats with no block check

> **Severity:** LOW  •  **Area:** `backend/friends`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The compare handler only guards against self-compare (`if (them === me) throw 400`) and an unresolvable target (404); it never checks `db.blocks.eitherBlocks(me, them)` before returning `db.tests.userStats(them)` (compare.ts:20-50).

## Affected code

- `src/server/routes/friends/compare.ts:15`

## Evidence

The compare handler only guards against self-compare (`if (them === me) throw 400`) and an unresolvable target (404); it never checks `db.blocks.eitherBlocks(me, them)` before returning `db.tests.userStats(them)` (compare.ts:20-50). Sibling social routes consistently gate on blocks first — live.watch (`if (await db.blocks.eitherBlocks(me, target)) return { live: false }`, live/index.ts:109) and lobby.invite (lobby/index.ts:26). So a user the target has explicitly blocked can still pull a head-to-head card against them. Impact is limited because the aggregates (best wpm, tests completed) are already visible on the public leaderboard/profile, hence low severity.

## Steps to reproduce

As user A, block user B. As B (or vice-versa), call friends.compare({ userId: <A> }) — it still returns A's stats instead of a blocked/empty response.

## Proposed fix

Add `if (await db.blocks.eitherBlocks(me, them)) throw new BackendError(403, 'FORBIDDEN', ...)` (or return an empty/elided side) at the top of the compare handler, matching live.watch and lobby.invite.

## Suggested labels

`severity:low` `area:backend`

---

_Found by: review:backend-routes. Generated from scan run `wf_a630179b-84b`._
