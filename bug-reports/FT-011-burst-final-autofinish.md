# FT-011 — BURST: the final item auto-finishes on its last character, bypassing the threshold/reps/space gate

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

practice-reducer.ts:399-404: `const finishedRun = correct && s.mode !== "TIME" && isLastWord && nextCursorChar === word.length;` excludes only TIME — BURST runs finish the moment the last char of the last item is typed correctly, before BurstProvider's SPACE controller (which enforces `wpm >= threshold` and `reps >= repsRequired`) ever runs.

## Affected code

- `src/app/_components/practice-reducer.ts:400`

## Evidence

practice-reducer.ts:399-404: `const finishedRun = correct && s.mode !== "TIME" && isLastWord && nextCursorChar === word.length;` excludes only TIME — BURST runs finish the moment the last char of the last item is typed correctly, before BurstProvider's SPACE controller (which enforces `wpm >= threshold` and `reps >= repsRequired`) ever runs. Verified live: burst with items=1 (custom length), threshold 50 — typed the single word "for" at ~10 WPM (450ms/char), never pressed space, and the run went straight to the results screen (done=true). For any N-item burst the last item is never gated; for a 1-item burst the entire mechanic is bypassed, and the drill-completion XP grant (burst-practice.tsx:193-201, fires on phase==="done") is awarded anyway.

## Steps to reproduce

Burst mode > custom items =
1. Type the word as slowly as you like; do not press space. The run completes and the results screen appears despite never clearing the threshold.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Confirmed by direct code reading. practice-reducer.ts:399-404 sets phase "done" on a correct keystroke completing the last char of the last word for every mode except TIME — BURST is not excluded. input-capture.tsx (lines 38-44, 140-143, 211-216) shows BURST routes TYPE_CHAR through this same reducer and only intercepts SPACE, meaning BurstProvider.handleSpace (burst-practice.tsx:120-156), which enforces typed===target, wpm>=threshold, and reps>=repsRequired before dispatching the run-ending SPACE, never runs for the final item: the reducer finishes the run on the final character, one keystroke before space could be pressed. BurstProvider's strict-mistake reset effect (lines 110-118) bails on phase==="done" and only fires on non-prefix input, so it cannot roll this back. The XP grant (burst-practice.tsx:192-201) fires purely on phase==="done", so the bypassed run is still rewarded. With items=1 the entire threshold/reps mechanic is bypassed. No test in practice-reducer.test.ts asserts BURST finish gating. The reducer comment ("ends the run for WORDS / QUOTE") shows BURST was simply overlooked. Severity medium is fair: every burst run's final item skips the gate, but it is a niche practice mode with no data/security impact. The suggested fix (exclude BURST from finishedRun and let handleSpace's SPACE dispatch end the run, which the SPACE reducer path already supports) is sound.

## Proposed fix

Exclude BURST from the auto-finish: `s.mode !== "TIME" && s.mode !== "BURST"` in the finishedRun condition, and have BurstProvider's handleSpace dispatch the run-ending SPACE for the final item only after its threshold/reps check passes (the SPACE reducer path already sets phase done at words end).

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: review:practice-core. Generated from scan run `wf_a630179b-84b`._
