import type { CurrentSettings } from "@/types/settings-import";
import { THEME_VARS } from "../theme-customization";
import { BACKGROUND_REACTIVE_ID } from "../themes/background-reactive";
import { paletteSliceFor } from "../themes/palette-baseline";
import { resolvePaletteBase, type PaletteSlice } from "../themes/palette-fork";
import { CUSTOM_THEME_ID, findTheme } from "../themes/registry";
import { isObject, type FtCollector } from "./ft-collect";
import { safeCssValue } from "./ft-values";
import { paletteName, themeValueLabel, themeVarLabel } from "./theme-labels";

/** A flinttype file's colours, fonts and palette. A file that carries
 *  either `theme` or `palette` describes the whole colour state, as an
 *  export does: an override you have that the file doesn't is cleared,
 *  and a file without a palette means Default. Every value is checked;
 *  the palette is rebuilt from the registry. Pure. */

const THEME_VAR_SET = new Set<string>(THEME_VARS);
const HEX = /^#[0-9a-f]{3,8}$/i;

/** A CSS length as rem ("0.5rem", "8px", "0"), or undefined. */
function remOf(v: string): number | undefined {
  const m = /^(\d*\.?\d+)(rem|px)?$/.exec(v);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === "px" ? n / 16 : n;
}

/** Numeric overrides must be values their controls can set. */
const RANGES: Readonly<Record<string, (v: string) => boolean>> = {
  // Size: 20px to 80px of a 40px base.
  "--ft-font-scale": (v) => /^\d*\.?\d+$/.test(v) && Number(v) >= 0.5 && Number(v) <= 2,
  // Word spacing: the presets run from 0.05em to 0.7em.
  "--ft-word-spacing": (v) => /^\d*\.?\d+em$/.test(v) && Number.parseFloat(v) <= 1,
  // Corners: the presets run from 0 to 1.5rem.
  "--radius": (v) => {
    const rem = remOf(v);
    return rem !== undefined && rem <= 1.5;
  },
};

/** An override value the setting can take, or undefined. */
export function validThemeValue(name: string, raw: unknown): string | undefined {
  const value = safeCssValue(raw);
  if (value === undefined) return undefined;
  const inRange = Object.hasOwn(RANGES, name) ? RANGES[name] : undefined;
  return !inRange || inRange(value) ? value : undefined;
}

/** The palette slice a file names, rebuilt from the registry (a file's
 *  own colour snapshots are never trusted), or undefined. */
export function validPalette(v: unknown): PaletteSlice | undefined {
  if (!isObject(v)) return undefined;
  const id = Object.hasOwn(v, "activeId") ? v.activeId : undefined;
  if (id === null) return { activeId: null };
  if (typeof id !== "string") return undefined;
  if (id === BACKGROUND_REACTIVE_ID) return { activeId: id };
  if (id === CUSTOM_THEME_ID) {
    const baseId = isObject(v.base) && typeof v.base.id === "string" ? v.base.id : null;
    const base = baseId ? resolvePaletteBase(baseId) : undefined;
    return base ? { activeId: id, base } : { activeId: id };
  }
  return findTheme(id) ? paletteSliceFor(id) : undefined;
}

function planOverrides(col: FtCollector, theme: Record<string, unknown>, current: CurrentSettings): void {
  for (const [name, raw] of Object.entries(theme)) {
    if (!THEME_VAR_SET.has(name)) {
      col.unrecognised();
      continue;
    }
    const value = validThemeValue(name, raw);
    if (value === undefined) {
      col.reject(`theme.${name}`, themeVarLabel(name));
      continue;
    }
    col.add({
      id: `theme.${name}`,
      label: themeVarLabel(name),
      to: themeValueLabel(name, value),
      target: { kind: "theme", name },
      value,
      ...(HEX.test(value) ? { swatch: value } : {}),
    });
  }
  // Overrides the file doesn't have go back to the palette's own value.
  for (const name of THEME_VARS) {
    if (Object.hasOwn(theme, name) || !current.theme[name]) continue;
    col.add({
      id: `theme.${name}`,
      label: themeVarLabel(name),
      to: themeValueLabel(name, null),
      target: { kind: "theme", name },
      value: null,
    });
  }
}

export function planColours(col: FtCollector, slices: Record<string, unknown>, current: CurrentSettings): void {
  const hasTheme = Object.hasOwn(slices, "theme");
  const hasPalette = Object.hasOwn(slices, "palette");
  const theme = hasTheme ? slices.theme : {};
  if (hasTheme && !isObject(theme)) col.reject("theme", "Colours and fonts");
  // Nothing usable about colours: leave them as they are.
  if (!hasPalette && !(hasTheme && isObject(theme))) return;
  if (isObject(theme)) planOverrides(col, theme, current);

  const value = hasPalette ? validPalette(slices.palette) : { activeId: null };
  if (!value) {
    col.reject("palette", "Palette");
    return;
  }
  col.add({ id: "palette", label: "Palette", to: paletteName(value.activeId), target: { kind: "palette" }, value });
}
