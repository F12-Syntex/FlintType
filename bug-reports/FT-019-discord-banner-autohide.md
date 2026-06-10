# FT-019 — Discord promo banner ignores chrome auto-hide AND focus mode — stays clickable mid-run

> **Severity:** MEDIUM  •  **Area:** `practice`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The autohide CSS targets only `[data-ft-chrome]`, `[data-ft-topbar]`, `[data-ft-footer]` (globals.css:701-711). The banner marks itself `data-ft-banner="discord"` which no rule targets.

## Affected code

- `src/app/_components/discord-banner.tsx:34`

## Evidence

The autohide CSS targets only `[data-ft-chrome]`, `[data-ft-topbar]`, `[data-ft-footer]` (globals.css:701-711). The banner marks itself `data-ft-banner="discord"` which no rule targets. Verified at 375x667 and 1280x720: mid-run with autohide=fade, topbar computed opacity=0 but the banner stays opacity=1 — screenshots show the run with a blank space where the topbar was and the full-colour 'Join the flinttype Discord' strip with its blue JOIN button still painted above the passage. Also a stray-click hazard: the JOIN link stays clickable mid-run (the very thing the fade rule's pointer-events:none exists to prevent, ui-law §15.3).

## Steps to reproduce

Fresh profile (banner not dismissed), start typing on / — topbar fades, Discord banner remains.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code fully supports the report. globals.css:701-711 (autohide dim/fade) and 751-756 (focus mode) target only [data-ft-chrome], [data-ft-topbar], [data-ft-footer]. The banner (discord-banner.tsx:34) carries only data-ft-banner="discord", whose sole CSS rule is the dismissal hide at globals.css:581. In app-chrome.tsx:57 it renders as a sibling of TopBar — outside every faded element — so no cascade saves it. The practice page (app/page.tsx) uses AppChrome non-dark, so the banner is present mid-run; autohide-applier.tsx sets html[data-ft-running="1"], fading topbar/footer to opacity:0 pointer-events:none while the banner remains opacity:1 with a live external JOIN link — the exact stray-click hazard the fade rule's own comment says it exists to prevent (ui-law §15.3). No guard, test, or alternate handling found. The same selector gap also breaks focus mode (F shortcut), slightly widening scope beyond the report. Severity medium is honest: autoHide defaults to off and the banner is dismissable, so the cohort is opt-in, but affected users hit it on every run and focus mode is a default-available shortcut. Suggested fix (add [data-ft-banner] to the dim/fade and focus selector lists, incl. pointer-events:none) is correct and minimal.

## Proposed fix

Add `[data-ft-banner]` to the dim/fade selector lists in globals.css (it already has the marker), including the pointer-events:none in fade.

## Suggested labels

`severity:medium` `area:practice` `accessibility`

---

_Found by: lane:appearance+responsive. Generated from scan run `wf_a630179b-84b`._
