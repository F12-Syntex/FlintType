# FT-028 — Named community palettes flash the Default palette on every page load (FOUC)

> **Severity:** MEDIUM  •  **Area:** `customise / theming`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

PREFS_BOOTSTRAP_SCRIPT (injected pre-hydration) applies only `blob.theme` per-var overrides; picking a named palette stores `palette.activeId` and writes `theme: {}` (presets), so the bootstrap applies nothing. The palette's cssVars are applied only inside PaletteProvider's `useEffect` after React hydrates.

## Affected code

- `src/lib/themes/use-palette.tsx:70-120 (and src/lib/bootstrap.ts:65-77)`

## Evidence

PREFS_BOOTSTRAP_SCRIPT (injected pre-hydration) applies only `blob.theme` per-var overrides; picking a named palette stores `palette.activeId` and writes `theme: {}` (presets), so the bootstrap applies nothing. The palette's cssVars are applied only inside PaletteProvider's `useEffect` after React hydrates. Measured headlessly with `{palette:{activeId:'catppuccin'}, theme:{}}` persisted: at DOMContentLoaded and first rAF `--primary` = '#f97316' (default coral) and `--background` = default paper; ~after hydration they become oklch(0.5547 0.2503 297.0156) / oklch(0.9578 ...) (Catppuccin). Every reload/navigation for a user on any community palette paints default-then-palette — exactly the flash ui-law §9.3 declares load-bearing to prevent.

<!-- evidence-embedded -->

**Captured screenshots:**

![Customise page in dark mode](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/bughunt-customise-dark.png)

*Customise page in dark mode.*

## Steps to reproduce

Pick any community palette (e.g. Catppuccin) in Customise → Appearance → Themes & mode. Reload any page; the chrome and accent paint in the default coral/paper palette for the first frames, then snap to the chosen palette.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Verified by code reading. PREFS_BOOTSTRAP_SCRIPT (src/lib/bootstrap.ts, injected pre-hydration in src/app/layout.tsx) reads only blob.appearance, blob.theme, and blob.banners — never blob.palette. Named-palette cssVars are applied exclusively by applyTheme() inside PaletteProvider's useEffect (src/lib/themes/use-palette.tsx:119), which runs after hydration/first paint; the inline styles it sets on documentElement do not survive a reload. When a user picks a named tweakcn palette, apply() writes only presets.themeOverrides to the theme slice, and the registry comment confirms shipped tweakcn themes carry no presets — so the bootstrap has nothing to paint and first frames render the globals.css default coral/paper palette. No alternative pre-paint path exists: registry's STORAGE_KEY 'ft-theme-id' is unused, there is no themes.css (theming is fully inline-override based), no SSR/cookie palette read, and next-themes' bootstrap handles only the dark class. The finder's headless measurement (default --primary at DOMContentLoaded/first rAF, palette vars after hydration) is exactly what the code predicts. Severity medium is fair: cosmetic but occurs on every load for every user on a community palette, contradicting the bootstrap script's own stated purpose and ui-law §9.3's load-bearing FOUC-prevention rule.

## Proposed fix

Extend the bootstrap script: also read `blob.palette.activeId`, look up the palette's cssVars (inline a compact id→vars map generated from themes.json at build time, or persist the resolved vars into the prefs blob when a palette is applied) and set them on documentElement before first paint, mirroring what applyTheme does.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **review:customise-prefs** — Named community palettes flash the Default palette on every page load — pre-hydration bootstrap never applies palette cssVars (`src/lib/themes/use-palette.tsx:70-120`)

## Suggested labels

`severity:medium` `area:customise` `ui`

---

_Found by: lane:appearance+responsive, review:customise-prefs. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-028-palette-fouc.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-028-palette-fouc.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
