# FT-012 — BURST: window-level Space handler bypasses the burst threshold/reps gate and double-dispatches

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

input-capture.tsx:213-216 deliberately suppresses SPACE in BURST so BurstProvider's controller (burst-practice.tsx:120-156) runs the threshold+reps check first. But the fallback window keydown listener in practice-state.tsx:1029-1034 has NO BURST guard — it dispatches a raw `{type:"SPACE"}` whenever focus is not on an INPUT/TEXTAREA/SELECT (lines 1007-1015).

## Affected code

- `src/app/_components/practice-state.tsx:1029`

## Evidence

input-capture.tsx:213-216 deliberately suppresses SPACE in BURST so BurstProvider's controller (burst-practice.tsx:120-156) runs the threshold+reps check first. But the fallback window keydown listener in practice-state.tsx:1029-1034 has NO BURST guard — it dispatches a raw `{type:"SPACE"}` whenever focus is not on an INPUT/TEXTAREA/SELECT (lines 1007-1015). BurstProvider's own window listener (burst-practice.tsx:174-190, which excludes only TEXTAREA/SELECT) then also fires, so one physical space produces both a raw ungated SPACE and the gated handleSpace. Verified live: in BURST (threshold 50), with focus moved to <body>, typing "look" at ~12 WPM (250ms/char) + one Space advanced ITEM 1/40 -> 2/40 — the too-slow word committed. With focus on the hidden input the same slow word correctly resets. An earlier uncontrolled run compounded to ITEM 1/40 -> 7/40 from a single space, showing the double-dispatch can stack.

## Steps to reproduce

Switch to burst mode. Click any chrome outside the typing wrapper (e.g. top bar background) so focus falls to <body>. Type the shown word slowly (well below the threshold) and press Space — the item counter advances instead of resetting.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every link in the claimed chain. (1) input-capture.tsx deliberately suppresses Space in BURST on both its keydown (lines 208-216) and beforeinput (133-143) paths so BurstProvider's handleSpace owns the threshold+reps gate. (2) practice-state.tsx's window-level fallback keydown (registered unconditionally, lines 1062-1064) only returns early when activeElement is INPUT/TEXTAREA/SELECT (1007-1015); with focus on <body>/BUTTON it dispatches a raw {type:"SPACE"} at line 1032 with no BURST guard — even though the same file knows about BURST elsewhere (line 1097 Tab handler), proving the omission. (3) practice-reducer.ts case "SPACE" (493-541) has no mode check and advances cursorWord, so the raw dispatch commits a too-slow word in BURST, bypassing the gate in burst-practice.tsx:120-156. (4) BurstProvider's window listener (174-190) excludes only TEXTAREA/SELECT, so both window listeners act on one keystroke when focus is off the hidden input — explaining the double-dispatch/compounding the finder observed. No upstream guard or test contradicts this; the repro (click chrome → focus falls to body → fallback listener keeps typing working but Space is ungated) is realistic for normal users. Severity medium is fair: gameplay-integrity bypass in one mode, no data loss.

## Proposed fix

Mirror input-capture's gate in the practice-state window keydown handler: when `stateRef.current.mode === "BURST"`, swallow the space (preventDefault, no dispatch) and let BurstProvider's listener own it. Also make BurstProvider's activeElement check symmetric with practice-state's (exclude INPUT except the hidden capture input) so the two listeners can never both act on one keystroke.

## Suggested labels

`severity:medium` `area:practice`

---

_Found by: review:practice-core. Generated from scan run `wf_a630179b-84b`._
