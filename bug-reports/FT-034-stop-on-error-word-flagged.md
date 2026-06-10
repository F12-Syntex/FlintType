# FT-034 — Stop-on-error: a blocked wrong keystroke leaves a perfectly-typed word showing the red error underline for the rest of the run

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

In the stop-on-error branch (practice-reducer.ts:379-389) the blocked keystroke adds cursorWord to errorWords even though the wrong char never enters typed[]. The only clearing path is BACKSPACE's wordErrored() re-evaluation (lines 442-448), which the user never triggers because the buffer is already a correct prefix; SPACE (lines 505-508) only ever ADDS to errorWords, never deletes when typedHere === target.

## Affected code

- `src/app/_components/practice-reducer.ts:387`

## Evidence

In the stop-on-error branch (practice-reducer.ts:379-389) the blocked keystroke adds cursorWord to errorWords even though the wrong char never enters typed[]. The only clearing path is BACKSPACE's wordErrored() re-evaluation (lines 442-448), which the user never triggers because the buffer is already a correct prefix; SPACE (lines 505-508) only ever ADDS to errorWords, never deletes when typedHere === target. Verified live with behaviour.stopOnError=true: typed first char of "around", pressed a blocked wrong key, finished the word correctly, pressed space — the past word renders via PastErrorWord with `underline ... decoration-[var(--ft-passage-error,...)]` (captured className) despite typed === target. Inconsistent with the documented intent (wordErrored's own comment: correcting a mistake clears the underline) and with non-stop-on-error behaviour, where a typed-then-backspaced mistake clears the flag (covered by the existing '#16' reducer test).

<!-- evidence-embedded -->

**Captured screenshots:**

![Blind-mode typing in progress](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/blind-mode-typing.png)

*Blind-mode typing in progress.*

![Blind-mode behaviour preview](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/behaviour-blind-preview.png)

*Blind-mode behaviour preview.*

## Steps to reproduce

Enable Customise > Behaviour > stop on error. Mid-word, press one wrong key (blocked), then complete the word correctly and press space. The word stays red-underlined for the rest of the run.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every link in the chain. (1) practice-reducer.ts:379-389: the stop-on-error branch adds cursorWord to errorWords on a blocked keystroke while typed[] and cursorChar stay put — the buffer never holds the mistake. (2) SPACE (493-541) only adds to errorWords when typedHere !== target and passes s.errorWords through unchanged when the word is correct, so the stale flag survives sealing; BACKSPACE's wordErrored re-evaluation (442-448) is the only clearing path and is never triggered because the buffer is a correct prefix. (3) passage.tsx:688-707 renders any past word in errorWords with the red error underline, gated by markIncompleteWord which defaults to true (appearance-prefs.ts:231); test-summary.tsx:360 carries the false flag into results. (4) Intent evidence is against permanence: wordErrored's doc comment, the BACKSPACE_WORD 'visual ghost' comment, and the #16 reducer test all establish that a buffer matching the target must not be flagged — no test asserts stop-on-error words stay flagged. Persisted stats are unaffected (errorCount = computeErrorCount(typed, words)), so the harm is feedback-only but hits every stop-on-error user on every fat-fingered word for the rest of the run; medium severity is honest. Suggested fix direction (recompute/clear on SPACE when typedHere === target, or don't add in the stop-on-error branch) is sound.

## Proposed fix

In SPACE, recompute the flag from the sealed buffer instead of only adding: when `typedHere === target`, delete cursorWord from errorWords (or don't add to errorWords in the stop-on-error TYPE_CHAR branch, since the buffer never holds the mistake — keystroke accuracy/events still record it).

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: review:practice-core. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-034-stop-on-error-word-flagged.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-034-stop-on-error-word-flagged.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
