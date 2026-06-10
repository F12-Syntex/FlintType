# FT-040 — 404 footer hardcodes the Mac command glyph for the command-palette hint on all platforms

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

`tip: press <Kbd>⌘</Kbd>+<Kbd>K</Kbd> to search routes` — on Windows/Linux the palette opens with Ctrl+K, but the hint always shows the Mac command glyph. Observed rendered as '⌘ + K' in the 404 footer on a Windows host.

## Affected code

- `src/app/not-found.tsx:101 (same pattern in src/app/error.tsx)`

## Evidence

`tip: press <Kbd>⌘</Kbd>+<Kbd>K</Kbd> to search routes` — on Windows/Linux the palette opens with Ctrl+K, but the hint always shows the Mac command glyph. Observed rendered as '⌘ + K' in the 404 footer on a Windows host.

## Steps to reproduce

Open /this-does-not-exist on Windows; read the footer hint.

## Proposed fix

Detect platform (navigator.platform / userAgentData) and show Ctrl on non-Mac, as the command palette itself presumably binds Control.

## Suggested labels

`severity:low` `area:ui` `ui`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-040-404-mac-glyph.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-040-404-mac-glyph.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
