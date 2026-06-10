# FT-048 — Command palette 'Theme palette' enum cannot represent or select the Default palette (or Custom)

> **Severity:** LOW  •  **Area:** `command-palette/theming`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

The enum's value is `(paletteId ?? 'default')` but its options are only `themes.map(...)` — the synthetic reactive entry plus the tweakcn palettes.

## Affected code

- `src/lib/command-palette/use-command-entries.ts:135-144`

## Evidence

The enum's value is `(paletteId ?? 'default')` but its options are only `themes.map(...)` — the synthetic reactive entry plus the tweakcn palettes. There is no 'default' (nor 'custom') option, so when the user is on the Default palette no option reads as current, and there is no palette-route back to Default from the palette switcher — the customise page's Theme dropdown has an explicit Default entry (themes-row.tsx:236) but the command palette does not.

<!-- evidence-embedded -->

**Captured screenshots:**

![Catppuccin palette on home](https://github.com/F12-Syntex/flinttype/raw/bug-reports-deep-scan/bug-reports/images/bughunt-dark-catppuccin-home.png)

*Catppuccin palette on home.*

## Steps to reproduce

Ctrl+K → Theme palette → no 'Default' row; after picking any palette you cannot return to Default from the command palette.

## Proposed fix

Prepend a { id: 'default', label: 'Default' } option that calls usePalette().reset(), and map activeId null → 'default' / CUSTOM_THEME_ID → a disabled 'Custom' marker.

## Suggested labels

`severity:low` `area:command-palette`

---

_Found by: review:customise-prefs. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-048-cmdpalette-default-palette.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-048-cmdpalette-default-palette.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
