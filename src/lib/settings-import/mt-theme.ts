import { FONT_CATALOG } from "../fonts/catalog";
import {
  bestInk,
  contrast,
  luminance,
  mix,
  normaliseHex,
  reachContrast,
} from "./colour";
import { fontLabel, fontSizeLabel } from "./labels";
import { bool, clamp, mtText, num, own, type Mt, type MtCollector } from "./mt-values";

/** MonkeyType's custom theme and font, as flinttype theme overrides.
 *  MonkeyType saves its custom colours even while a named theme is on,
 *  so they're read only when `customTheme` is true. Pure. */

/** `customThemeColors`, in MonkeyType's order. */
const ROLES = [
  "bg", "main", "caret", "sub", "subAlt", "text",
  "error", "errorExtra", "colorfulError", "colorfulErrorExtra",
] as const;
export type MtColours = Record<(typeof ROLES)[number], string>;

/** The custom colours, or null when the custom theme is off or any of
 *  its ten colours can't be read. */
export function customColours(mt: Mt): MtColours | null {
  const list = own(mt, "customThemeColors");
  if (own(mt, "customTheme") !== true || !Array.isArray(list)) return null;
  const out = {} as MtColours;
  for (const [i, role] of ROLES.entries()) {
    const hex = normaliseHex(list[i]);
    if (!hex) return null;
    out[role] = hex;
  }
  return out;
}

/** `from` is the review's whole "where it came from" line. */
export type DerivedColour = { name: string; label: string; from: string; value: string };

/** flinttype's colours from a MonkeyType scheme, in the order the review
 *  lists them. Chrome text keeps WCAG contrast (accent 3:1, quiet text
 *  4.5:1); the passage keeps MonkeyType's own letter colours (test.scss:
 *  typed letters are Text, or Main in colourful mode; flipped swaps). */
export function deriveColours(
  c: MtColours,
  { flipped = false, colourful = false } = {},
): DerivedColour[] {
  const primary = contrast(c.main, c.bg) >= 3 ? c.main : reachContrast(c.main, c.text, [c.bg], 3);
  const primaryFrom = primary === c.main ? "From Main" : "From Main, adjusted for contrast";
  const quiet = reachContrast(c.sub, c.text, [c.bg, c.subAlt], 4.5);
  const onAccent = contrast(c.bg, primary) >= 4.5 ? c.bg : bestInk(primary);
  const outline = mix(c.sub, c.bg, 0.4);
  const lead = colourful ? c.main : c.text;
  const typed = flipped ? c.sub : lead;
  const untyped = flipped ? lead : c.sub;
  const leadName = colourful ? "Main" : "Text";
  const row = (name: string, label: string, from: string, value: string): DerivedColour => ({ name, label, from, value });
  const of = (slot: string) => `From ${slot}`;
  return [
    row("--background", "Background", of("Background"), c.bg),
    row("--foreground", "Text", of("Text"), c.text),
    row("--primary", "Accent", primaryFrom, primary),
    row("--ft-passage-typed", "Typed letters", of(flipped ? "Sub" : leadName), typed),
    row("--ft-passage-untyped", "Letters to type", of(flipped ? leadName : "Sub"), untyped),
    row("--ft-passage-error", "Wrong letters", of(colourful ? "Colourful error" : "Error"), colourful ? c.colorfulError : c.error),
    row("--card", "Cards", of("Sub alt"), c.subAlt),
    row("--muted", "Quiet surfaces", of("Sub alt"), c.subAlt),
    row("--muted-foreground", "Quiet text", quiet === c.sub ? of("Sub") : "From Sub, adjusted for contrast", quiet),
    row("--primary-foreground", "Text on accent", onAccent === c.bg ? of("Background") : "Picked for contrast", onAccent),
    row("--accent", "Hover tint", of("Sub alt and Text"), mix(c.subAlt, c.text, 0.08)),
    row("--accent-foreground", "Text on hover tint", of("Text"), c.text),
    row("--border", "Outlines", of("Sub and Background"), outline),
    row("--input", "Input fields", of("Sub and Background"), outline),
    row("--ring", "Focus ring", primaryFrom, primary),
    row("--card-foreground", "Text on cards", of("Text"), c.text),
    row("--popover", "Menus", of("Sub alt"), c.subAlt),
    row("--popover-foreground", "Text on menus", of("Text"), c.text),
  ];
}

/** Dark mode when the background is dark (relative luminance < 0.18). */
export function isDarkBackground(bg: string): boolean {
  return luminance(bg) < 0.18;
}

/** The custom theme's colours flinttype has no slot for, as sentences
 *  for the Colours group: part of a theme that is imported. */
export function colourNotes(c: MtColours): string[] {
  const out: string[] = [];
  if (c.caret !== c.main) out.push(`The caret uses your accent colour, so ${c.caret} isn't used.`);
  if (c.errorExtra !== c.error) out.push(`Extra letters use your wrong-letter colour, so ${c.errorExtra} isn't used.`);
  return out;
}

/** Colours (with light or dark mode), typeface and size. The theme keys
 *  count as used only when colours come from them: with a named theme
 *  they change nothing here. */
export function mapThemeAndFont(col: MtCollector, colours: MtColours | null): void {
  const { mt } = col;
  if (bool(mt, "customTheme") === undefined) col.junk("customTheme", "Custom theme");
  if (bool(mt, "flipTestColors") === undefined) col.junk("flipTestColors", "Flip test colours");
  if (bool(mt, "colorfulMode") === undefined) col.junk("colorfulMode", "Colourful mode");
  if (colours) {
    col.use("customTheme", "customThemeColors", "flipTestColors", "colorfulMode");
    for (const text of colourNotes(colours)) col.note("colours", text);
    const derived = deriveColours(colours, {
      flipped: own(mt, "flipTestColors") === true,
      colourful: own(mt, "colorfulMode") === true,
    });
    for (const d of derived) col.theme("colours", d.name, d.label, d.from, d.value, d.value, d.value);
    const dark = isDarkBackground(colours.bg);
    col.out.push({
      id: "mode",
      group: "colours",
      label: "Mode",
      origin: dark ? "From a dark background" : "From a light background",
      to: dark ? "Dark" : "Light",
      target: { kind: "mode" },
      value: dark ? "dark" : "light",
    });
  }

  mapFont(col);
}

function mapFont(col: MtCollector): void {
  const { mt } = col;
  const family = own(mt, "fontFamily");
  if (typeof family === "string") {
    col.use("fontFamily");
    const name = family.replace(/_+/g, " ").trim();
    const entry = FONT_CATALOG.find((e) => e.family.toLowerCase() === name.toLowerCase());
    const stack = entry?.stack ?? (name.toLowerCase() === "georgia" ? "Georgia, 'Times New Roman', serif" : null);
    if (stack) col.theme("font", "--ft-font-family", "Typeface", `From ${mtText(family)}`, stack, fontLabel(stack));
    // The row already shows the file's font name (cut to fit), so the
    // note never repeats it: one long name can't flood the list.
    else col.bad("fontFamily", "Font", "This font isn't included.");
  } else col.junk("fontFamily", "Font");

  const size = num(mt, "fontSize");
  if (size !== undefined && size > 0) {
    col.use("fontSize");
    // MonkeyType sizes are rem (16px); flinttype's Size is px of 40.
    const px = clamp(Math.round(size * 16), 20, 80);
    const scale = Math.round((px / 40) * 100) / 100;
    const value = Math.abs(scale - 1) < 0.001 ? null : String(scale);
    col.theme("font", "--ft-font-scale", "Size", `From size ${mtText(size)}`, value, fontSizeLabel(value));
  } else col.junk("fontSize", "Font size");
}
