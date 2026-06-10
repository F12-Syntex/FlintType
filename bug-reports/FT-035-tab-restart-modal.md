# FT-035 — Tab restarts the test and steals focus while a modal dialog is open on the practice surface

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Browser repro: opened the 'Adaptive practice details and hand layout' modal (role=dialog aria-modal=true), pressed Tab. Result: the modal stayed open, the passage behind it re-rolled (restart fired), and document.activeElement moved to the hidden 'Typing input' — so keyboard users can never Tab between the dialog's controls (sign-in link, hand-layout editor, close button), and their in-progress test state is silently...

## Affected code

- `C:/Users/synte/Programming/programming2/flinttype/src/app/_components/practice-state.tsx:1080-1105`

## Evidence

Browser repro: opened the 'Adaptive practice details and hand layout' modal (role=dialog aria-modal=true), pressed Tab. Result: the modal stayed open, the passage behind it re-rolled (restart fired), and document.activeElement moved to the hidden 'Typing input' — so keyboard users can never Tab between the dialog's controls (sign-in link, hand-layout editor, close button), and their in-progress test state is silently destroyed. Root cause: the capture-phase onTab handler (practice-state.tsx:1081-1102) unconditionally preventDefault+stopImmediatePropagation+restart and lacks the `document.querySelector('[role="dialog"][aria-modal="true"]')` modal gate that the sibling onKeyDown handler has at practice-state.tsx:1004. The restart then triggers InputCapture's refocus effect (input-capture.tsx:64-66) which yanks focus to the hidden input.

## Steps to reproduce

1) On /, click the info button next to the adapt toggle to open the Adaptive practice modal.
2) Press Tab.
3) Passage re-rolls behind the modal and focus leaves the dialog.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading fully corroborates the finding. practice-state.tsx:1080-1105 registers a window-level capture-phase keydown listener that, for unmodified Tab, unconditionally calls preventDefault + stopImmediatePropagation before any guard, then calls restart() (raceMode false and mode != BURST on the default solo practice surface). Its own comment says "no gates" and claims the only modal that matters is the command palette — but the AdaptModal (src/app/_components/mode-bar.tsx:347-, opened by the "Adaptive practice details and hand layout" button at line 326) is a hand-rolled portal with role="dialog" aria-modal="true" and no focus trap, mounted on the same practice surface where the onTab listener is attached. Because the listener is on window in capture phase, it fires before anything inside the modal can see the event, so Tab can never move focus between the dialog's sign-in link, hand-layout editor, and close button. The restart resets state to rest with fresh words, which triggers InputCapture's refocus effect (input-capture.tsx:64-66) and yanks focus to the hidden typing input — matching the browser observation exactly. The sibling onKeyDown handler has the modal gate at practice-state.tsx:1004, and input-capture.tsx:179-184 has the same gate, confirming the omission in onTab is an oversight; input-capture.tsx:168-174 even notes Tab-as-restart was previously retired precisely because it "kept breaking under the dialog-modal gate and the focus-trap edge cases". No upstream guard, test, or design rationale refutes the report. Medium severity is fair: easily hit by any keyboard user opening the adapt modal, breaks dialog accessibility and silently re-rolls the passage/destroys an in-progress run, but no persistent data loss.

## Proposed fix

In the onTab capture handler, bail (without preventDefault) when a [role="dialog"][aria-modal="true"] element is present, mirroring the gate at practice-state.tsx:1004.

## Suggested labels

`severity:medium` `area:practice` `accessibility`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-035-tab-restart-modal.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-035-tab-restart-modal.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
