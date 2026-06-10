# FT-015 — Confidence 'All' + Strict space deadlocks WORDS/QUOTE runs after one typo (only Esc escapes)

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

With confidence='all', Backspace and Ctrl+Backspace are swallowed (input-capture.tsx:201-202 keydown path, :113-114 beforeinput path). With strictSpace, SPACE is a no-op unless typed === target (practice-reducer.ts:500). After any wrong character lands in the typed buffer, the user can neither correct it (backspace disabled) nor advance (space refused) — the run is permanently stuck; only Esc (restart) escapes.

## Affected code

- `src/app/_components/input-capture.tsx:201`

## Evidence

With confidence='all', Backspace and Ctrl+Backspace are swallowed (input-capture.tsx:201-202 keydown path, :113-114 beforeinput path). With strictSpace, SPACE is a no-op unless typed === target (practice-reducer.ts:500). After any wrong character lands in the typed buffer, the user can neither correct it (backspace disabled) nor advance (space refused) — the run is permanently stuck; only Esc (restart) escapes. Browser-confirmed: set Confidence=All + Strict space=On, typed 'gx' on word 'go', then Backspace (no-op), Space (no-op), 'o ' (buffer 'gxo', still no-op) — WORD readout stayed 1/10. Both settings are offered side-by-side in the same section with no guard or warning.

<!-- evidence-embedded -->

**Captured screenshots:**

![Strict-space + confidence-mode deadlock](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/deadlock-strictspace-confidence.png)

*Strict-space + confidence-mode deadlock.*

## Steps to reproduce

Customise → Behaviour: Confidence mode=All, Strict space=On. On /, type one wrong char in the first word, then try backspace/space/anything — cursor never advances; only Esc restart works.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Code reading confirms every link in the chain. (1) input-capture.tsx:201 and :113 swallow ALL backspace variants (plain, word-wise, and the beforeinput delete* paths) when confidence='all' — no other code path dispatches BACKSPACE/BACKSPACE_WORD. (2) practice-reducer.ts:500 makes SPACE a pure no-op when strictSpace && typedHere !== target. (3) TYPE_CHAR is append-only (pushTyped) with a word.length+10 extras cap, so once a wrong char lands in the buffer (which it does whenever stopOnError=false, the default), typedHere can never equal target again. Result: in WORDS/QUOTE mode the run is permanently stuck after one typo; only Esc (restart) escapes. No guard exists: the behaviour page, command palette, and prefs store all set confidence and strictSpace independently with no cross-reset, and practice-reducer.test.ts never exercises strictSpace=true. The AI 'hardcore' preset (prompt.ts:39) even pairs confidence=all + strictSpace, accidentally safe only because it also sets stopOnError=on. The browser observation is fully credible against this code. Severity corrected to medium: both prefs default off, the pair is a niche double opt-in, recovery is a single Esc, and TIME-mode runs still end via the timer — a guaranteed run-killer inside an opt-in config, not a default-path defect.

## Proposed fix

Make the combination impossible (selecting one resets the other, as MonkeyType does), or let strict-space treat a mismatched buffer as 'cannot ever complete' and allow space-to-advance (marking the word errored) when backspace is disabled.

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-015-confidence-strict-deadlock.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-015-confidence-strict-deadlock.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
