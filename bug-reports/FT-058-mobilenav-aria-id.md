# FT-058 — MobileNav hamburger references aria-controls="mobile-nav-drawer" but the drawer has no matching id

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The toggle button sets `aria-controls="mobile-nav-drawer"` (line 163) while the portal'd drawer div (lines 104-115) carries role/aria-modal/aria-label but no `id`, so the reference is dangling — assistive tech can't resolve the relationship and a11y audits flag it.

## Affected code

- `src/components/ft/mobile-nav.tsx:163`

## Evidence

The toggle button sets `aria-controls="mobile-nav-drawer"` (line 163) while the portal'd drawer div (lines 104-115) carries role/aria-modal/aria-label but no `id`, so the reference is dangling — assistive tech can't resolve the relationship and a11y audits flag it.

<!-- evidence-embedded -->

**Captured screenshots:**

![Mobile nav drawer open](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/mobile-nav-drawer.png)

*Mobile nav drawer open.*

## Steps to reproduce

Open the drawer at <768px and inspect: no element with id 'mobile-nav-drawer' exists in the DOM.

## Proposed fix

Add `id="mobile-nav-drawer"` to the drawer container div.

## Suggested labels

`severity:low` `area:ui` `accessibility` `ui`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-058-mobilenav-aria-id.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-058-mobilenav-aria-id.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
