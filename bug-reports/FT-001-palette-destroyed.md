# FT-001 — Choosing a community palette then overriding any single setting silently destroys the palette on reload

> **Severity:** HIGH  •  **Area:** `customise/theming`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

setVar() writes only the single var to the 'theme' slice and pins `writeSlice("palette", { activeId: CUSTOM_THEME_ID })`, but never snapshots the base palette's cssVars. On the next load, PaletteProvider (src/lib/themes/use-palette.tsx:86) early-returns for activeId === 'custom' and nothing re-applies the named palette's inline vars (they only existed as in-session inline styles;

## Affected code

- `src/lib/theme-customization.ts:123-134`

## Evidence

setVar() writes only the single var to the 'theme' slice and pins `writeSlice("palette", { activeId: CUSTOM_THEME_ID })`, but never snapshots the base palette's cssVars. On the next load, PaletteProvider (src/lib/themes/use-palette.tsx:86) early-returns for activeId === 'custom' and nothing re-applies the named palette's inline vars (they only existed as in-session inline styles; the pre-hydration bootstrap only replays blob.theme). Verified live in the browser: applied Catppuccin via the Theme dropdown (primary became oklch(0.5547 0.2503 297.0156), background oklch(0.9578 0.0058 264.5321)), clicked the Geometry 'Pillowy' radius chip (palette slice flipped to {activeId:"custom"}, theme slice {--radius:"1.25rem"}), reloaded — primary reverted to #f97316 and background to the Default paper while only the radius override survived; the picker reads 'Custom'. The AI studio has the same hole: useApplyPatch.apply() routes through setVar, and its revert() (src/app/customise/_components/use-apply-patch.ts:102-119) restores vars but never restores the palette slice, so even an undone AI suggestion costs the user their named palette across reloads.

## Steps to reproduce

1) /customise/appearance → Theme dropdown → pick Catppuccin (confirm).
2) In Geometry, click any radius chip (or change any colour row).
3) Reload the page. All Catppuccin colours are gone (Default palette paints); only the nudged var persists; picker shows 'Custom'.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Code reading confirms every element of the report. (1) Named palettes persist only their id: PaletteProvider.apply() (src/lib/themes/use-palette.tsx:122-150) writes {activeId} and presets.themeOverrides (empty for all tweakcn themes per src/lib/themes/registry.ts comment); the palette's cssVars are applied only as in-session inline styles via applyTheme. (2) setVar (src/lib/theme-customization.ts:123-134) writes the single var to the theme slice and pins palette to CUSTOM_THEME_ID without snapshotting the base palette's cssVars; the Geometry radius chip (src/app/customise/appearance/page.tsx:188) and all colour/typography rows route through it. (3) On reload, the pre-hydration bootstrap (src/lib/bootstrap.ts:67-77) replays only blob.theme, and PaletteProvider's effect early-returns for activeId==="custom" (use-palette.tsx:86) — so the named palette's vars are never re-applied; globals.css Default paints with only the nudged var surviving, matching the finder's browser observation. migrateThemeState (src/lib/themes/overrides.ts:114-134) only strips legacy baked values and does not repair this. (4) The AI-studio sub-claim holds: useApplyPatch.apply() routes through setVar and revert() (src/app/customise/_components/use-apply-patch.ts:102-119) restores vars but never the palette slice, and clearVar deliberately never demotes. No guard or test contradicts any of this; overrides.test.ts covers only the pure helpers. Severity high is fair: a named palette plus any single var tweak structurally cannot survive a reload — silent loss of a core customisation choice triggered by prominent controls.

## Proposed fix

When setVar forks a named palette to 'custom', copy the active palette's resolved cssVars (for the current mode) into the theme-overrides slice first so the fork is self-contained — or store `{ activeId: 'custom', baseId: '<previous id>' }` and have PaletteProvider apply baseId underneath custom overrides on load. Also make useApplyPatch snapshot/restore the palette slice on revert.

## Suggested labels

`severity:high` `area:customise` `data-loss`

---

_Found by: review:customise-prefs. Generated from scan run `wf_a630179b-84b`._
