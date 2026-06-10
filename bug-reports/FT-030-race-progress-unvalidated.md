# FT-030 — Race progress is unvalidated server-side — a single keystroke POST can jump to the finish and win

> **Severity:** MEDIUM  •  **Area:** `race`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

keystrokeInputSchema caps the client-reported `wpm` field at max(500) (types/race.ts:193), but RaceRoom.setProgress takes that value as `_clientWpm` and IGNORES it — it recomputes wpm SERVER-SIDE from progressChars over elapsed time with NO cap: `correct = progressChars - errors;

## Affected code

- `src/types/race.ts:193`
- `src/server/race/room.ts:610-665`

## Evidence

keystrokeInputSchema caps the client-reported `wpm` field at max(500) (types/race.ts:193), but RaceRoom.setProgress takes that value as `_clientWpm` and IGNORES it — it recomputes wpm SERVER-SIDE from progressChars over elapsed time with NO cap: `correct = progressChars - errors; r.wpm = round((correct/5)*(60/elapsedSec))` (room.ts:646-653), and progressChars is only clamped to [0,totalChars] (room.ts:628) with no per-keystroke rate/delta check. So a cheater sends one keystroke with `progressChars=totalChars, wpm:1, finished:true` (1 passes the schema) and instantly wins. I reproduced this live against localhost:3000: queued a 1v1, waited for `racing`, posted that single body, and the SSE snapshot showed my racer at `{wpm:444, raw:444, place:1, finishedAt:3, accuracy:100}` having typed nothing. Posting right at the gun (elapsed floored to 1s) yielded `{wpm:1416, raw:1416, place:1, finishedAt:0}` — far above the 500 'cap'. The cap therefore stops NOTHING (the server never caps its own computed wpm) and only harms honest play: a legitimate keystroke batch whose locally-computed net wpm exceeds 500 is rejected outright by zod (400 VALIDATION), freezing that typist's progress — the inverse of anti-cheat.

## Steps to reproduce

POST /api/race/queue {modeId:'1v1'} -> grab roomId/sessionToken/totalChars; wait ~7s for phase=racing; POST /api/race/keystroke {roomId,sessionToken,progressChars:totalChars,wpm:1,finished:true}; open SSE /api/race/stream/<roomId> -> your racer shows wpm 400-1400+ and place 1 with zero real typing.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Verified directly in source; the exploit is real, not a misreading. (1) types/race.ts:193 caps the client `wpm` field at max(500). (2) room.ts:615 receives it as `_clientWpm` and explicitly ignores it ("we IGNORE it for ranking and recompute server-side"). (3) room.ts:628 clamps progressChars only to [0,totalChars] with no per-keystroke delta/rate check. (4) room.ts:646-652 recomputes wpm with no ceiling and elapsedSec floored to 1, so early posts yield 1000+ wpm. (5) room.ts:658-665 marks finishedAt/place from a single post with finished=true or progressChars>=totalChars while phase==='racing'. The route handler (index.ts:101-126) adds only a rate limit and the schema, no progress validation. I found no upstream guard or test that blocks this. The 500 cap genuinely stops nothing because the server never caps its own computed value.

Severity corrected high→medium: the entire race subsystem (src/server/race/) is in-memory and ephemeral — room.ts has zero DB/repo/persist calls, so a faked win grants nothing (no leaderboard, XP, personal best, or rank; the global leaderboard is fed from practice history, not races). Impact is competitive-integrity griefing of a transient multiplayer room that vanishes on finish/restart — annoying and it defeats the fairness of the multiplayer feature, but no persistent advantage, data corruption, auth bypass, or data leak. The 'honest typists frozen >500 WPM' harm is largely theoretical (human WPM record ~300; the field is ignored; rejection would be transient as cumulative engine WPM settles). Real bug worth fixing, but not high without any persistent stake.

## Proposed fix

Validate progress server-side: reject or clamp keystroke posts whose progressChars delta since last update exceeds a plausible max chars/sec, and cap the server-computed wpm at a sane ceiling. Remove the meaningless 500 cap on the ignored client wpm field (or raise it well above human range so honest fast typists aren't frozen). Treat large single-POST jumps to totalChars as suspect.

## Suggested labels

`severity:medium` `area:race` `security` `multiplayer`

---

_Found by: review:race. Generated from scan run `wf_a630179b-84b`._
