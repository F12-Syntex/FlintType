# FT-016 — Corrected and stop-on-error-blocked mistakes never lower accuracy (structurally 100% / 0 errors)

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Browser repro (signed-out, default prefs): typed 'qqqqq' (5 wrong chars, live readout showed ERR 5 / ACC 0%), backspaced 5 times, then typed the whole 25-word passage perfectly. Results screen: WPM 1458, ACC 100%, ERRORS 0, CONSISTENCY 100%.

## Affected code

- `C:/Users/synte/Programming/programming2/flinttype/src/app/_components/practice-state.tsx:561-567`

## Evidence

Browser repro (signed-out, default prefs): typed 'qqqqq' (5 wrong chars, live readout showed ERR 5 / ACC 0%), backspaced 5 times, then typed the whole 25-word passage perfectly. Results screen: WPM 1458, ACC 100%, ERRORS 0, CONSISTENCY 100%. Both the live stats (practice-state.tsx:739-745) and the submitted/recorded values (practice-state.tsx:561-567, 599-603) compute accuracy/errorCount from countChars()/errorCount() over the FINAL typed[] buffer (src/lib/wpm.ts:108-115), so any mistake that is later backspaced (or blocked by stop-on-error, which never enters typed[]) vanishes. The reducer maintains keystroke-true tallies `totalChars`/`correctChars` explicitly commented '// for accuracy' (practice-reducer.ts:52-53) but they are never read anywhere — dead state evidencing the original intent. The page's own SEO copy says flinttype 'measures ... your accuracy on every keystroke', and signed-in submits persist this inflated accuracy (and the per-run error count) to history/PB records.

## Steps to reproduce

1) Open http://localhost:3000/.
2) Type 5 wrong characters on the first word.
3) Backspace 5 times.
4) Type the rest of the test perfectly.
5) Results screen reports ACC 100% and ERRORS 0.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

The accuracy half of the finding holds up against the code. Live (practice-state.tsx:739-745) and submitted (561-567) accuracy both derive from countChars() over the final typed[] buffer, so backspaced mistakes vanish and stop-on-error-blocked keystrokes (which never enter typed[], practice-reducer.ts:379-389) can never reduce ACC — under stop-on-error the readout is pegged at 100%. This is a real defect, not design: (1) monkeytype, the file's explicit alignment target ('so the number lines up with monkeytype / 10ff / etc.'), computes accuracy from keystrokes; (2) the codebase already fixed this exact behaviour on the race surface with a comment calling the buffer-walk a bug and keystroke-true accuracy 'the user's reasonable expectation' (race-online.tsx:345-358) — leaving practice and race internally inconsistent for the same typing; (3) the reducer's totalChars/correctChars are commented '// for accuracy' but unused on the practice surface; (4) the customise preview computes accuracy keystroke-based from events (preview-practice.tsx:141-143); (5) the homepage SEO copy claims 'accuracy on every keystroke' (page.tsx:69-71). However, the finder's bundling of the ERRORS-0 figure is wrong: errorCount's final-buffer semantics are explicitly documented ('corrected mistakes don't count and a 100%-accuracy run reports 0 errors', wpm.ts:96-100) and asserted by a test (wpm.test.ts:17-21), and match monkeytype's char-breakdown stat — that half is intentional. Severity downgraded to medium: no crash or data loss, WPM/PB ordering unaffected; the impact is a consistently inflated display stat persisted to history, worst under stop-on-error. Title corrected to scope the bug to accuracy only.

## Proposed fix

Compute accuracy from keystroke events (state.events: correct/total, i.e. the reducer's correctChars/totalChars) Monkeytype-style, for both the live readout and the submit payload; keep the buffer-based figure only if a separate 'corrected accuracy' stat is wanted.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:practice+behaviour** — Stop on error: blocked mistakes never reach accuracy/ERR — live and persisted accuracy is structurally 100%, errors 0 (`src/app/_components/practice-state.tsx:560-567`)

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._
