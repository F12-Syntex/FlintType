# FT-004 — Leaderboard over-fetch dedupe can starve a user's friends board to zero entries

> **Severity:** HIGH  •  **Area:** `backend`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

topLeaderboard fetches only the top `limit * 4` rows ordered by netWpm (`.limit(limit * 4)` at tests.ts:190), then dedupes per (userId, mode, durationOrWordCount) in JS. Every row past the over-fetch window is invisible.

## Affected code

- `src/db/server/repositories/tests.ts:176-218`

## Evidence

topLeaderboard fetches only the top `limit * 4` rows ordered by netWpm (`.limit(limit * 4)` at tests.ts:190), then dedupes per (userId, mode, durationOrWordCount) in JS. Every row past the over-fetch window is invisible. With the default limit 25 that's a 100-row window: any user with 100+ completed runs that all out-score another user's best run consumes the entire window, and the slower user is dropped from the result even though the board has empty slots. This is the shared implementation for BOTH the public board (src/server/routes/leaderboard/index.ts:44) and the friends board (src/server/routes/friends/leaderboard.ts:35). On the friends board it is the common case, not an edge: a friends board of {me + one slower friend} where I have >100 completed runs faster than their best will show only my rows — the friend never appears at any rank, defeating the route's stated purpose ('so they can see where they sit among friends'). An active typist easily has hundreds of completed runs.

## Steps to reproduce

Two accounts, A follows B mutually. A completes 101+ runs all with netWpm above B's best run; B completes a few runs. Call friends.leaderboard as A (scope all, preset any, limit 25): B is absent from entries despite fewer than 25 distinct (user,bucket) groups existing.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

The cited code behaves exactly as the finder claims, with no upstream guard or mitigating test. In src/db/server/repositories/tests.ts, topLeaderboard runs a single SQL query ordered by netWpm desc with `.limit(limit * 4)` (line 190, comment: "over-fetch so we can dedupe by user"), then dedupes in JS per `${userId}|${mode}|${durationOrWordCount}` (lines 193-217). Any row beyond the limit*4 window is never seen, so a user whose best run ranks below that window is silently dropped even when the output has fewer than `limit` entries. With the default limit 25 (clamped 1-100 at line 160), the window is 100 rows.

The friends board (src/server/routes/friends/leaderboard.ts:35) passes the caller's follow set as `userIds` into the same method with the same DEFAULT_LIMIT=25 and no post-processing that could recover a starved user — it only filters Clerk-unresolvable rows and re-ranks. So the reported scenario holds: userIds = [A, B]; if A has 100+ completed runs whose netWpm all exceed B's best run (defaults scope=all/window=all_time/preset=any apply no narrowing filters), the entire 100-row window is A's rows and B is absent from A's friends board — and symmetrically A's slower friend B never sees themselves on their own board. This is realistic for a typing site: an active user accumulates hundreds of runs, and a 90-WPM typist's 100th-best run routinely out-scores a 55-WPM friend's personal best. The route's own doc comment states its purpose is "so they can see where they sit among friends", which this defeats.

I checked for refutations and found none: (1) the co-located tests (src/db/server/repositories/tests.test.ts:100-221) all use 1-4 rows, far inside the window — none exercises the over-fetch boundary; (2) no SQL-level DISTINCT ON / window function exists anywhere in the repo for this query; (3) the public board route (src/server/routes/leaderboard/index.ts:44) shares the identical hole, and topPlayers (tests.ts:298-311) has the same class of issue with a limit*50 window, exactly as the finder notes. The suggested fix (DISTINCT ON or row_number() over the (user, bucket) partition) is correct.

Severity 'high' is defensible: it is a silent correctness failure of a core social feature in a common configuration (active user + slower mutual friend), not an exotic edge — though it degrades a board rather than losing data, so it sits at the top of medium / bottom of high. I'm leaving the rating as filed.

## Proposed fix

Rank best-per-user-per-bucket in SQL instead of JS — e.g. SELECT DISTINCT ON (user_id, mode, duration_or_word_count) … ORDER BY user_id, mode, duration_or_word_count, netWpm DESC, then order the deduped set by netWpm and apply LIMIT; or a row_number() window over the (user,bucket) partition. topPlayers (tests.ts:298-311, limit*50 window) has the same class of hole and can share the fix.

## Suggested labels

`severity:high` `area:backend`

---

_Found by: review:db-social. Generated from scan run `wf_a630179b-84b`._
