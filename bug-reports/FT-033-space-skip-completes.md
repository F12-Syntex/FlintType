# FT-033 — Space-skipping every word 'completes' a test reporting 100% accuracy, 0 errors and 100% consistency

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Browser repro: typed 1 correct character then pressed Space 25 times. The run finished instantly and the results screen showed WPM 0, ACC 100%, ERRORS 0, CONSISTENCY 100%, RAW 1923.

## Affected code

- `C:/Users/synte/Programming/programming2/flinttype/src/app/_components/practice-reducer.ts:493-541`

## Evidence

Browser repro: typed 1 correct character then pressed Space 25 times. The run finished instantly and the results screen showed WPM 0, ACC 100%, ERRORS 0, CONSISTENCY 100%, RAW 1923. The SPACE action advances unconditionally even when the current word's typed buffer is empty (no Monkeytype-style 'ignore space on empty input' guard), each skipped word's untyped letters are tallied as missedChars in countChars (src/lib/wpm.ts:58-81), and missedChars are excluded from both the accuracy denominator (practice-state.tsx:563-567) and errorCount (wpm.ts:108-115). For a signed-in user this run submits with wasCompleted: true and accuracy 100, polluting history stats.

## Steps to reproduce

1) Open http://localhost:3000/.
2) Type the first letter of the first word.
3) Press Space repeatedly until the word count is exhausted.
4) Results: ACC 100%, ERRORS 0.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every link in the chain. (1) practice-reducer.ts SPACE (lines 493-541): with strictSpace off, space advances unconditionally; the only empty-input guard is `phase === "rest"` (line 494) — Monkeytype's equivalent guard ignores space on ANY empty word buffer mid-run, which flinttype lacks (verified no upstream guard in input-capture.tsx either; it dispatches SPACE whenever phase !== rest). (2) wpm.ts countChars: a skipped word's letters all land in missedChars (lines 58-80); errorCount = incorrectChars + extraChars only (lines 108-115, with an explicit comment and a test at wpm.test.ts:27-32 asserting skips contribute 0 errors). (3) practice-state.tsx:561-567: accuracy denominator is allCorrectChars + incorrectChars + extraChars — missedChars excluded — so 1 correct char + 25 space-skips = 100% accuracy. (4) The submit effect fires with wasCompleted: true (line 605) as long as events.length > 0 (the single typed char satisfies it), and the adapt submit route has no server-side plausibility check that would reject it. The per-word skip semantics and missed-chars-aren't-errors accounting are individually intentional/tested, but the missing empty-buffer guard composes them into instant 'completed' runs with perfect-looking stats (and a self-contradictory results screen: every word underlined as errored while ERRORS reads 0). Real users also hit it accidentally via double-space (silently skips the whole next word; Monkeytype ignores it). Medium severity is fair: WPM is 0 so PBs/leaderboards are unaffected, but history/test-count/XP pollution plus the double-space trap are genuine.

## Proposed fix

Ignore SPACE when the current word's typed buffer is empty (Monkeytype behaviour), and include missedChars in the accuracy denominator so skipped words cost accuracy.

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._
