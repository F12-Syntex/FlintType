# FT-002 — Global WPM leaderboard is fully forgeable — adapt.submit trusts unbounded client wpm/accuracy

> **Severity:** HIGH  •  **Area:** `backend / leaderboard / adapt`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

submitTestInputSchema declares `wpm: z.number().nonnegative()` — NO upper bound and NO cross-check against the submitted `timings`. The submit handler inserts the client value verbatim: `db.tests.insert({ ... wpm: input.wpm, accuracy: input.accuracy, wasCompleted: input.wasCompleted ... })` (submit.ts:147-151).

## Affected code

- `src/types/adapt.ts:80`
- `src/server/routes/adapt/submit.ts:140-163`
- `src/db/server/repositories/tests.ts:166-189`

## Evidence

submitTestInputSchema declares `wpm: z.number().nonnegative()` — NO upper bound and NO cross-check against the submitted `timings`. The submit handler inserts the client value verbatim: `db.tests.insert({ ... wpm: input.wpm, accuracy: input.accuracy, wasCompleted: input.wasCompleted ... })` (submit.ts:147-151). The public leaderboard ranks straight off the stored row: `const netExpr = sql<number>\`(${tests.wpm} * ${tests.accuracy} / 100.0)\`` with `.where(eq(tests.wasCompleted, true))` and `.orderBy(desc(netExpr))` — there is no plausibility filter (grep for any `wpm < MAX` / sanity cap returns nothing; the only 'cap' hit is a comment). So a signed-in user can POST one `adapt.submit` with `{wpm:9999,accuracy:100,wasCompleted:true,mode:"casual",durationOrWordCount:60,startedAt,completedAt,words:[],timings:[]}` and instantly occupy rank 1 on leaderboard.list, topPlayers, and topByLevel. `mode:"race"` is also accepted by testModeSchema, so this bypasses the race authority's deliberate 500-WPM keystroke cap and forges the race-scoped board too. It also fires a real `friend_pb` fan-out to all the cheater's followers (submit.ts:203-237). The existence of a whole server-authoritative race subsystem with a 500 WPM cap, versus zero verification on the path that actually feeds the leaderboard, indicates this is an oversight rather than accepted design.

## Steps to reproduce

As any signed-in user: POST /api/adapt/submit with body {"startedAt":<now-30000>,"completedAt":<now>,"mode":"casual","durationOrWordCount":60,"wpm":9999,"accuracy":100,"errorCount":0,"resetCount":0,"wasCompleted":true,"words":[],"timings":[]}. Then GET leaderboard via POST /api/leaderboard/list {} — the forged 9999 netWpm row ranks #
1. (Could not execute end-to-end via curl because keyless Clerk dev sessions aren't obtainable from the shell; finding is from the airtight code path.)

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Every link in the chain is confirmed by direct code reading. (1) submitTestInputSchema declares `wpm: z.number().nonnegative()` (src/types/adapt.ts:80) — no upper bound and no cross-validation against the submitted `timings`; accuracy is bounded 0..100 which doesn't help. (2) adapt.submit is gated by requireAuth only (src/server/routes/adapt/index.ts:19) and inserts `wpm: input.wpm`/`accuracy: input.accuracy` verbatim into the tests table (submit.ts:140-163). The `extract(input.timings,...)` call only feeds the adaptive bigram/trigram/word models; it never recomputes or sanity-checks the headline wpm, so `timings:[]` is accepted and the forged figures persist. (3) The DB column `wpm doublePrecision NOT NULL` (src/db/schema/server/tests.ts:33) carries no CHECK constraint. (4) topLeaderboard ranks on netExpr = wpm*accuracy/100 with the sole filter `wasCompleted=true` (+optional mode/window/preset) and no plausibility ceiling (src/db/server/repositories/tests.ts:166-189); topPlayers and topByLevel are the same. The leaderboard route (src/server/routes/leaderboard/index.ts) applies no filtering either. (5) testModeSchema accepts "race" and the race-scoped board ranks off the same table (confirmed by repo test tests.test.ts:191-196), and race results reach the leaderboard via the client submitTest/adapt.submit path tagged mode:"race" (practice-state.tsx:204-210), so the race authority's 500-WPM keystroke cap is bypassed for the figure that actually feeds the board. (6) A forged PB also fires friend_pb fan-out to all followers (submit.ts:203-237). I searched all of src/server for plausibility/sanity/cap/anti-cheat guards on this path — none exist; the only cap/clamp hits are unrelated adaptive-model learning-rate clamps and capacity limits. No test asserts rejection of an implausible WPM. A signed-in user can POST {wpm:9999,accuracy:100,wasCompleted:true,...} once and occupy rank 1 on every leaderboard surface. Severity high is honest: trivial auth-only barrier, fully defeats a core competitive feature plus social notifications, but no RCE/cross-user-data/auth-bypass so not critical.

## Proposed fix

Add a server-side plausibility bound on wpm/accuracy in submitTestInputSchema (e.g. wpm.max(400)) AND/OR recompute/verify net WPM server-side from the submitted timings + passage length before trusting the headline figure; at minimum filter the leaderboard query to a sane WPM ceiling. Treat the client wpm as advisory and derive the ranked value from verifiable data, mirroring the race authority's approach.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **review:backend-routes** — Public leaderboard is trivially spoofable: adapt.submit trusts an unbounded client-supplied wpm (`src/server/routes/adapt/submit.ts:140; src/types/adapt.ts:80`)

## Suggested labels

`severity:high` `area:backend` `security`

---

_Found by: probe:live-api, review:backend-routes. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-002-leaderboard-forgeable.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-002-leaderboard-forgeable.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
