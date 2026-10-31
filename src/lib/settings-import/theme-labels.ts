import { BACKGROUND_REACTIVE_ID } from "../themes/background-reactive";
import { CUSTOM_THEME_ID, findTheme } from "../themes/registry";
import { fontLabel, fontSizeLabel } from "./labels";

/** Settings row titles for the theme overrides (Settings → Theme, Font,
 *  Corners), their values in plain words, and the palette's name. Pure. */

const VAR_LABELS: Readonly<Record<string, string>> = {
  "--background": "Background",
  "--foreground": "Text",
  "--primary": "Accent",
  "--ft-passage-typed": "Typed letters",
  "--ft-passage-untyped": "Letters to type",
  "--ft-passage-error": "Wrong letters",
  "--card": "Cards",
  "--muted": "Quiet surfaces",
  "--muted-foreground": "Quiet text",
  "--primary-foreground": "Text on accent",
  "--accent": "Hover tint",
  "--accent-foreground": "Text on hover tint",
  "--border": "Outlines",
  "--input": "Input fields",
  "--ring": "Focus ring",
  "--card-foreground": "Text on cards",
  "--popover": "Menus",
  "--popover-foreground": "Text on menus",
  "--radius": "Corners",
  "--ft-font-family": "Typeface",
  "--ft-font-scale": "Size",
  "--ft-word-spacing": "Word spacing",
};

/** typography-row.tsx WORD_SPACING_PRESETS. */
const WORD_SPACING: Readonly<Record<string, string>> = {
  "0.05": "Tight",
  "0.15": "Snug",
  "0.25": "Normal",
  "0.45": "Loose",
  "0.7": "Airy",
};

/** The overrides that are colours (not corners, font, size or spacing). */
export const COLOUR_VARS: readonly string[] = Object.keys(VAR_LABELS).filter(
  (name) => !["--radius", "--ft-font-family", "--ft-font-scale", "--ft-word-spacing"].includes(name),
);

/** The colour each passage token falls back to while it's unset, as
 *  the passage paints it (`src/app/_components/passage/colors.ts`; the
 *  test keeps the two in step). */
export const PASSAGE_COLOUR_FALLBACK: Readonly<Record<string, string>> = {
  "--ft-passage-typed": "--primary",
  "--ft-passage-untyped": "--muted-foreground",
  "--ft-passage-error": "--destructive",
};

/** Each colour setting as it shows on screen, from a reader of computed
 *  custom properties. An unset passage token shows its fallback. */
export function shownColours(read: (name: string) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of COLOUR_VARS) {
    const fallback = Object.hasOwn(PASSAGE_COLOUR_FALLBACK, name) ? PASSAGE_COLOUR_FALLBACK[name] : undefined;
    const v = read(name).trim() || (fallback ? read(fallback).trim() : "");
    if (v) out[name] = v;
  }
  return out;
}

export function themeVarLabel(name: string): string {
  return Object.hasOwn(VAR_LABELS, name) ? VAR_LABELS[name] : "Colour";
}

/** The palette a palette slice selects, as the Theme picker names it. */
export function paletteName(activeId: unknown): string {
  if (activeId === CUSTOM_THEME_ID) return "Custom";
  if (activeId === BACKGROUND_REACTIVE_ID) return "Background reactive";
  if (typeof activeId !== "string") return "Default";
  return findTheme(activeId)?.name ?? "Default";
}

/** An override's value as the settings show it; unset reads as the
 *  palette's own value. */
export function themeValueLabel(name: string, value: string | null | undefined): string {
  switch (name) {
    case "--ft-font-family":
      return fontLabel(value);
    case "--ft-font-scale":
      return fontSizeLabel(value);
    case "--ft-word-spacing": {
      const em = value ? String(Number.parseFloat(value)) : "0.25";
      return (Object.hasOwn(WORD_SPACING, em) && WORD_SPACING[em]) || value || "Normal";
    }
    case "--radius":
      return value ?? "Palette's own";
    default:
      return value ? value.toLowerCase() : "Palette's own";
  }
}
