# FT-060 — Pre-hydration bootstrap attr defaults drifted from DEFAULT_APPEARANCE — untouched users get a chrome flash on every load

> **Severity:** LOW  •  **Area:** `customise/appearance`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The bootstrap's setAttr defaults ('solid', 'hairline', 'comfortable', 'paper', 'elevated', 'visible', 'off') describe the attr-absent CSS state, but the shipped DEFAULT_APPEARANCE (src/lib/appearance-prefs.ts:312-323) is cardSurfaces:'subtle', dividers:'hidden', topbarStyle:'flat', autoHide:'fade'.

## Affected code

- `src/lib/bootstrap.ts:44-50`

## Evidence

The bootstrap's setAttr defaults ('solid', 'hairline', 'comfortable', 'paper', 'elevated', 'visible', 'off') describe the attr-absent CSS state, but the shipped DEFAULT_APPEARANCE (src/lib/appearance-prefs.ts:312-323) is cardSurfaces:'subtle', dividers:'hidden', topbarStyle:'flat', autoHide:'fade'. A user with no stored appearance slice (fresh visitor, or anyone who never touched an appearance setting — bootstrap reads ap = blob.appearance which is absent) gets NO data-ft-* attrs pre-paint, then AppearanceApplier sets them post-hydration. Verified: with an empty blob, after hydration <html> carries data-ft-cards='subtle', data-ft-dividers='hidden', data-ft-topbar-style='flat', data-ft-autohide='fade' — none of which the inline script would have set, so first paint shows the editorial chrome and then flips to the Monkeytype-leaning defaults. The bootstrap's own comment lists 'chrome popping from elevated to flat' as the bug it exists to prevent.

## Steps to reproduce

Clear site storage → load any page → watch the topbar/cards flip style right after hydration.

## Proposed fix

Either bake the shipped defaults into globals.css (make attr-absent equal DEFAULT_APPEARANCE) or have the bootstrap apply DEFAULT_APPEARANCE values when the appearance slice/field is missing. Keep bootstrap.ts, appearance-applier.tsx, and globals.css defaults single-sourced.

## Suggested labels

`severity:low` `area:customise` `accessibility` `ui`

---

_Found by: review:customise-prefs. Generated from scan run `wf_a630179b-84b`._
