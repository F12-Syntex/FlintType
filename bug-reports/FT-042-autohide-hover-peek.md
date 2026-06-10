# FT-042 — Auto-hide 'hover to peek chrome back' is impossible under fade (the default) — pointer-events:none defeats :hover

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

`html[data-ft-autohide="fade"][data-ft-running="1"] [data-ft-topbar] { opacity: 0; pointer-events: none; }` while the peek rule is `html[data-ft-autohide][data-ft-running="1"] [data-ft-topbar]:hover { opacity: 1; pointer-events: auto; }`. An element with pointer-events:none can never match :hover, so the peek rule (whose own comment at :712 says it covers 'dim/fade') is dead code under fade.

## Affected code

- `src/app/globals.css:706-719`

## Evidence

`html[data-ft-autohide="fade"][data-ft-running="1"] [data-ft-topbar] { opacity: 0; pointer-events: none; }` while the peek rule is `html[data-ft-autohide][data-ft-running="1"] [data-ft-topbar]:hover { opacity: 1; pointer-events: auto; }`. An element with pointer-events:none can never match :hover, so the peek rule (whose own comment at :712 says it covers 'dim/fade') is dead code under fade. Verified in browser at 1280x720: mid-run with autohide=fade, moving the mouse over the topbar area leaves opacity '0', pointerEvents 'none', element.matches(':hover') === false. Works under dim only.

## Steps to reproduce

Default settings, start typing on /, move the mouse to the very top edge — the topbar never reappears until the run ends.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

CSS at globals.css:706-719 confirms the claim: under autoHide=fade (the shipping default, appearance-prefs.ts:323), [data-ft-topbar]/[data-ft-footer] get opacity:0 + pointer-events:none while data-ft-running=1. Per CSS spec, pointer-events:none removes the element from hit-testing, so the :hover peek rule (whose own comment promises it works 'during dim/fade') can never match under fade — dead code. No JS fallback exists: AutoHideApplier only mirrors the running phase to the html attr, and AppearanceApplier only writes data-ft-autohide. The peek works only under dim. The contradiction between the peek rule's intent (pointer-events:auto on hover, 'during dim/fade' comment) and ui-law §15.3's keep-pointer-events-none mandate confirms a genuine bug, not deliberate design. Severity downgraded to low: the only loss is a mid-run peek convenience; chrome restores the instant the run ends or resets, so no user is ever stuck or loses functionality.

## Proposed fix

Put the :hover on a wrapper that keeps pointer-events (e.g. a transparent hover strip / the topbar's parent), or key the peek off body-level mouse position in AutoHideApplier instead of :hover on the faded element.

## Suggested labels

`severity:low` `area:practice`

---

_Found by: lane:appearance+responsive. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-042-autohide-hover-peek.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-042-autohide-hover-peek.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
