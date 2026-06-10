# FT-064 — Reset-all confirm dialog title is broken copy: 'Reset make it act the way you think?'

> **Severity:** LOW  •  **Area:** `customise`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The confirm dialog title is built as `Reset ${title.toLowerCase()}?` where title is the page's editorial headline ('Make it act the way you think'), producing the on-screen heading 'Reset make it act the way you think?' (observed in the dialog on /customise/behaviour). Same defect applies to Appearance ('Reset make it look the way you think?'). The §12.7 editorial titles were never meant to be interpolated as nouns.

## Affected code

- `src/app/customise/_components/page-header.tsx:61`

## Evidence

The confirm dialog title is built as `Reset ${title.toLowerCase()}?` where title is the page's editorial headline ('Make it act the way you think'), producing the on-screen heading 'Reset make it act the way you think?' (observed in the dialog on /customise/behaviour). Same defect applies to Appearance ('Reset make it look the way you think?'). The §12.7 editorial titles were never meant to be interpolated as nouns.

## Steps to reproduce

Customise → Behaviour → change any setting → click Reset all. Read the dialog heading.

## Proposed fix

Pass a short noun (e.g. the eyebrow's section name: 'Reset Behaviour settings?') to the confirm dialog instead of the editorial title.

## Suggested labels

`severity:low` `area:customise`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-064-resetall-confirm-copy.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-064-resetall-confirm-copy.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
