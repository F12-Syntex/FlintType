# FT-066 — Results passage heatmap misattributes per-letter latencies after a skipped word / backspace-retype / uncorrected error

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

PassageHeatmap's latency walk (test-summary.tsx:181-199) assigns each correct event to sequential `(w,c)` positions, advancing only when `c >= word.length` — it never reads `e.wordIndex`. Two failure paths: (1) skip a word with space after typing part of it ("th" of "the") — the next word's first correct chars are mapped onto the skipped word's remaining positions and every later letter shifts;

## Affected code

- `src/app/_components/test-summary.tsx:181`

## Evidence

PassageHeatmap's latency walk (test-summary.tsx:181-199) assigns each correct event to sequential `(w,c)` positions, advancing only when `c >= word.length` — it never reads `e.wordIndex`. Two failure paths: (1) skip a word with space after typing part of it ("th" of "the") — the next word's first correct chars are mapped onto the skipped word's remaining positions and every later letter shifts; (2) backspace-retype a CORRECT char — the duplicate correct events for the same position advance the walk past reality (events t,h,h for "the" map the second 'h' to position 2). This is exactly the flawed counting approach that replay-cursor.ts:20-26's doc comment describes as the drifting bug it was rewritten to fix ("silently drifts on any imperfect word ... Reading wordIndex removes the guess entirely") — the heatmap still uses the old guess. KeyEvent already carries the authoritative wordIndex (practice-reducer.ts:32-38).

## Steps to reproduce

Finish a run in which you skipped one word early with space (or backspaced and retyped a correct letter), open the results heatmap: every letter after that point carries another letter's ms timing (hover tooltips show shifted values), and trailing chars of typed words render as never-typed.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Confirmed by direct code reading. PassageHeatmap (src/app/_components/test-summary.tsx:181-199) walks correct events sequentially, advancing the word index only when the char counter reaches word.length, and never consults e.wordIndex. The reducer (src/app/_components/practice-reducer.ts) proves both failure paths: (1) SPACE (lines 493-509) advances cursorWord with no event emitted, so a partially-typed skipped word leaves the walk stranded mid-word and every later latency lands on the wrong letter; (2) BACKSPACE (lines 422-455) never removes events, so retyping a correct char appends a duplicate correct event for the same position (TYPE_CHAR always appends, line 418), advancing the walk past reality. A third drift path exists with stop-on-error off (incorrect events advance the real cursor but are skipped by the walk, so the word never 'completes'). The doc comment in replay-cursor.ts:12-26 explicitly describes this exact counting approach as the drifting bug reconstructCursor was rewritten to fix by reading wordIndex — the heatmap still uses the old guess, and reconstructCursor's existence shows the correct fix pattern. No guard, test, or upstream normalization mitigates it. Severity corrected to low: the heatmap is opt-in (resultShowHeatmap defaults to false, src/lib/appearance-prefs.ts:268) and the impact is confined to wrong colours/hover-ms tooltips on a cosmetic results visualization — no persisted data, WPM, accuracy, or any other stat is affected.

## Proposed fix

Key the walk on e.wordIndex: track a per-word char counter that resets when wordIndex changes (and rewind on duplicate positions), the same way reconstructCursor does, so latencies land on the letters that were actually typed.

## Suggested labels

`severity:low` `area:practice`

---

_Found by: review:practice-core. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-066-heatmap-latency.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-066-heatmap-latency.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
