# FT-009 — 'Reset all' does not reset everything it claims (Audio counted in the stat but not reset)

> **Severity:** MEDIUM  •  **Area:** `customise`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The confirm dialog says 'This clears every customisation on this page and restores the default values' (src/app/customise/_components/page-header.tsx:61-67). Behaviour page: header count = customizedCount + audioCustomized but onResetAll={reset} resets only the behaviour slice.

## Affected code

- `src/app/customise/behaviour/page.tsx:106-107`

## Evidence

The confirm dialog says 'This clears every customisation on this page and restores the default values' (src/app/customise/_components/page-header.tsx:61-67). Behaviour page: header count = customizedCount + audioCustomized but onResetAll={reset} resets only the behaviour slice. Verified live: enabled Keypress click (count '2'), clicked Reset all + confirm → behaviour slice cleared but audio stayed {keypressClickEnabled:true,...} and the header still read '1 customised' with Reset all still enabled — clicking it again does nothing. Appearance page is worse (src/app/customise/appearance/page.tsx:119-127): handleResetAll resets theme overrides + appearance slice only, while the page also hosts Caret (caret slice), Keyboard widget (keyboard slice) and Background (background slice) sections — none are reset, and none are counted, so a user with only a customised caret sees '0 untouched' and a DISABLED Reset all while their page carries customisations.

## Steps to reproduce

Behaviour page: turn Keypress click On → Reset all → confirm. Audio stays on; count stays at
1. Appearance page: change caret style only → header shows 0/untouched and Reset all is disabled.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Code reading confirms every element of the report. (1) Behaviour page (src/app/customise/behaviour/page.tsx:88-109): header customizedCount = behaviour count + audioCustomized, but onResetAll={reset} resets only the behaviour slice; useAudioPrefs exposes a reset (src/lib/audio-prefs.ts) that the page never destructures or calls. Post-reset the audio customisations persist, the counter stays >0, and the Reset all button (enabled when count>0, page-header.tsx:59) becomes a no-op. (2) Appearance page (src/app/customise/appearance/page.tsx:118-127): count = overrideCount(themes) + appearance-prefs count; handleResetAll resets only those two. Caret (useCaretSettings, caret-row.tsx:204), Keyboard widget (useKeyboardSettings, keyboard-row.tsx:65), and Background (useBackgroundPrefs, background-row.tsx:87) are independent stores hosted on the same page — none counted, none reset — so caret-only customisation shows '0 / untouched' with a disabled Reset all. (3) The confirm dialog (page-header.tsx:63-66) explicitly promises 'This clears every customisation on this page', contradicted by both pages. Mitigation: each section has its own per-section reset, so no data is stranded, and the failure direction is safe (resets less than claimed, not more). Severity medium is honest: a real user clicking Reset all hits a visibly stuck counter and a dead button, but there is no data loss or functional breakage beyond the inconsistent reset scope.

## Proposed fix

Include audio in the behaviour page's reset (useAudioPrefs().reset) and include caret/keyboard/background in both the appearance page's customised count (their hooks already expose isCustomised) and its handleResetAll.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:practice+behaviour** — Behaviour page 'Reset all' counts Audio settings in the header stat but does not reset them (`src/app/customise/behaviour/page.tsx:106-107`)

## Suggested labels

`severity:medium` `area:customise`

---

_Found by: lane:practice+behaviour, review:customise-prefs. Generated from scan run `wf_a630179b-84b`._
