# FT-021 — Final race placement double-penalizes accuracy (net WPM x accuracy), disagreeing with the WPM column

> **Severity:** MEDIUM  •  **Area:** `race`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

setProgress already computes `r.wpm` as NET wpm — `correct = progressChars - errors; r.wpm = (correct/5)*(60/elapsed)` (room.ts:646-649) — i.e. errors are already subtracted. But rankByNetWpm scores each racer as `round(r.wpm * (accuracy/100))` (room.ts:787-791), multiplying the already-net wpm by accuracy a SECOND time.

## Affected code

- `src/server/race/room.ts:785-809`

## Evidence

setProgress already computes `r.wpm` as NET wpm — `correct = progressChars - errors; r.wpm = (correct/5)*(60/elapsed)` (room.ts:646-649) — i.e. errors are already subtracted. But rankByNetWpm scores each racer as `round(r.wpm * (accuracy/100))` (room.ts:787-791), multiplying the already-net wpm by accuracy a SECOND time. The client knows better: race-results.tsx:116-120 ranks live standings by `r.wpm` directly with the explicit comment 'r.wpm is already net (correct chars / 5 / min), so rank by it directly — applying netWpm again would penalize accuracy twice.' The server does exactly the thing that comment warns against. Consequence: the WPM column shown to users (r.wpm) is NOT what decides who wins, and the live standings (sorted by net wpm, race-results.tsx:124-126) re-sort at the finish line to the net×accuracy order. A racer with the highest displayed net WPM but lower accuracy can lead the whole race and then drop a place at the gun. Example: A net=156 acc=88 -> score 137; B net=150 acc=100 -> score 150; live shows A leading (156>150) but B is awarded 1st. The existing test 'places racers by net WPM' (room.test.ts:647) passes only because its 50% vs 95% case is lopsided enough that the double penalty doesn't flip it.

## Steps to reproduce

Two real racers finish with A having higher net WPM (r.wpm) but lower accuracy than B; live lineup shows A ahead, final placement awards B first. Code-level: compare room.ts:646-649 (r.wpm is net) against room.ts:787-791 (score = r.wpm * acc).

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Confirmed by direct code reading. (1) r.wpm is computed server-side as NET wpm for both real players (room.ts:646-652, correct = progressChars - errors) and bots (room.ts:574-582), and race-types.ts:62-64 documents it as 'already error-adjusted, so no extra × accuracy'. (2) rankByNetWpm (room.ts:785-791) scores final placement as round(r.wpm * accuracy/100) — its own comment says 'raw_wpm × accuracy' but the variable holds net wpm, so accuracy/errors are applied twice. (3) The real client always sends both errors and accuracy derived from the same keystroke counters (race-online.tsx:352-358), so the double penalty is live in production. (4) The client live standings sort by r.wpm directly (race-results.tsx:116-123) with an explicit comment warning that applying accuracy again 'would penalize accuracy twice', and falsely claims (lines 109-113) it matches the server's final-placement metric — so live order and final placement genuinely diverge at the finish. (5) The existing test (room.test.ts:647) passes errors=undefined, so r.errors stays 0 and r.wpm equals raw — the test only ever exercises the single-application path and cannot catch the double penalty (the finder's 'lopsided' explanation is slightly off, but the conclusion that the test masks the bug is right). The numeric example checks out: net=156/acc=88 → 137 loses to net=150/acc=100 → 150 despite leading the displayed WPM column all race. No upstream guard or normalization mitigates this. Medium severity is fair: it visibly flips race winners but is not data loss or a security issue.

## Proposed fix

Rank by r.wpm directly (it is already net), matching the client's byLiveNet, OR rank by raw*accuracy but then r.wpm must be raw — pick one definition of net and use it consistently for the displayed column, the live ranking, and the final placement.

## Suggested labels

`severity:medium` `area:race` `multiplayer`

---

_Found by: review:race. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-021-race-placement-double-penalty.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-021-race-placement-double-penalty.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
