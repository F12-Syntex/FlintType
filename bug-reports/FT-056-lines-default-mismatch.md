# FT-056 — Lines-rendered control / AI catalog default (3) disagrees with the shipped linesRendered default (4)

> **Severity:** LOW  •  **Area:** `customise/ai + typing-area control`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

DEFAULT_APPEARANCE.linesRendered is 4 (src/lib/appearance-prefs.ts:254), but the AI knob's option labelled 'Default' writes 3 (`{ id: "default", label: "Default", patch: ap("linesRendered", 3) }`), so asking the AI for the default look changes the user's line count.

## Affected code

- `src/server/routes/appearance/options.ts:160`

## Evidence

DEFAULT_APPEARANCE.linesRendered is 4 (src/lib/appearance-prefs.ts:254), but the AI knob's option labelled 'Default' writes 3 (`{ id: "default", label: "Default", patch: ap("linesRendered", 3) }`), so asking the AI for the default look changes the user's line count. Same drift in the manual control: LinesRenderedControl seeds its remembered value with 3 with the comment 'Seeded with 3 to match the default' (src/app/customise/appearance/_components/passage-rows.tsx:122-124), so toggling 'All' off on an untouched-numeric state restores 3, not the real default 4. The type-level doc comment in appearance-prefs.ts:88-92 also still says 'Default 3'.

<!-- evidence-embedded -->

**Captured screenshots:**

![Max line width = 5 layout](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/bughunt-maxwidth5.png)

*Max line width = 5 layout.*

## Steps to reproduce

Set Lines rendered to All, then click All again — the input restores 3 instead of the shipping default
4. Or ask the AI studio for 'default lines'.

## Proposed fix

Single-source the default: reference DEFAULT_APPEARANCE.linesRendered in both places (4), and fix the stale comments.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:appearance+responsive** — Lines-rendered control seeds its 'All' toggle memory and placeholder with 3, but the shipped default is 4 (`src/app/customise/appearance/_components/passage-rows.tsx:124 (and src/lib/appearance-prefs.ts:254)`)

## Suggested labels

`severity:low` `area:customise`

---

_Found by: lane:appearance+responsive, review:customise-prefs. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-056-lines-default-mismatch.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-056-lines-default-mismatch.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
