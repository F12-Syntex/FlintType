# FT-020 — Escape outside the typing input both restarts the running test AND opens the command palette

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Browser repro: started a run, moved focus to document.body (equivalent to clicking dead space outside the typing area), pressed Escape once. Result: the command palette dialog opened AND the passage re-rolled — the in-progress run was destroyed as a side effect of opening the palette.

## Affected code

- `C:/Users/synte/Programming/programming2/flinttype/src/app/_components/practice-state.tsx:1019-1022`

## Evidence

Browser repro: started a run, moved focus to document.body (equivalent to clicking dead space outside the typing area), pressed Escape once. Result: the command palette dialog opened AND the passage re-rolled — the in-progress run was destroyed as a side effect of opening the palette. Two independent window keydown listeners both act on the same event: the practice handler (practice-state.tsx:1019-1022, Escape → restart; its editable-target gate at 1007-1015 only skips when an input is focused) and the palette's Esc-opener (command-palette.tsx:91-111), whose guards (palette open / editable target / overlay / focus-mode) all pass when focus is on body during a run. Neither stops propagation. ui-law §16 says Escape should open the palette 'only when it would otherwise do nothing' — here it does something (restart) and the palette opens anyway.

## Steps to reproduce

1) Start typing a test on /.
2) Click an empty chrome area (or otherwise focus body).
3) Press Escape.
4) Palette opens and the run restarts simultaneously.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every element of the report. (1) practice-state.tsx:1062 registers onKeyDown on window; its Escape branch (1019-1022) calls restartRef.current() unconditionally with no phase gate, no defaultPrevented check, and no stopPropagation. Its guards (1004-1015) pass in the repro state: the palette dialog is not yet in the DOM at keydown time (setOpen is an async state update), and document.body is not INPUT/TEXTAREA/SELECT. (2) command-palette.tsx:84-115 registers a second window keydown listener whose Escape opener guards (palette closed, isEditableTarget — body fails it, data-ft-focus, open-overlay selector) all pass during a run with body focused; it has no data-ft-running or practice-phase check, so setOpen(true) fires. Neither listener stops propagation, so both act on the same event regardless of registration order. (3) Focus-on-body mid-run is reachable: input-capture.tsx auto-refocuses the hidden input only when phase === "rest" (line 65), and its tap-to-focus wrapper covers only the typing-surface children — clicking chrome or dead space outside it during a run leaves focus on body (the practice window handler exists precisely for this case per its own comment). Result: one Escape press both destroys the in-progress run (restart re-rolls the passage) and opens the command palette, directly violating ui-law §16's rule that Escape opens the palette only when it would otherwise do nothing. No upstream guard or test covers this. Severity medium is honest: requires focus off the hidden input mid-run, but the consequence is a destroyed run plus an unwanted modal.

## Proposed fix

Have the palette's Escape opener stand down while a practice run is active (e.g. check html[data-ft-running] or the typing-surface marker), or have the practice Escape handler call stopImmediatePropagation after restart.

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-020-esc-restart-palette.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-020-esc-restart-palette.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
