import type { AppearancePrefs } from "@/lib/appearance-prefs";
import { enumEntry, type Setter, toggle } from "./entry-helpers";
import type { CommandEntry } from "./types";

/** Settings → Interface: style, surfaces, corners and borders, top
 *  bar and footer. Labels and option names mirror the settings rows. */
export function interfaceEntries({
  ap,
  setAp,
}: {
  ap: AppearancePrefs;
  setAp: Setter<AppearancePrefs>;
}): CommandEntry[] {
  return [
    /* ─── Style ────────────────────────────────────────────────── */
    enumEntry(
      "a.controlShape",
      "Button shape",
      "The shape of buttons, chips and inputs",
      "Appearance",
      ap.controlShape,
      [
        { id: "pill", label: "Pill" },
        { id: "rounded", label: "Rounded" },
        { id: "square", label: "Square" },
      ] as const,
      (v) => setAp("controlShape", v),
      ["style", "radius", "corners", "round"],
    ),
    enumEntry(
      "a.depth",
      "Depth",
      "How far cards and menus lift off the page",
      "Appearance",
      ap.depth,
      [
        { id: "flat", label: "Flat" },
        { id: "soft", label: "Soft" },
        { id: "lifted", label: "Lifted" },
      ] as const,
      (v) => setAp("depth", v),
      ["style", "shadow", "elevation", "flat"],
    ),
    toggle(
      "a.buttonGlow",
      "Button glow",
      "A soft glow under the main button on each screen",
      "Appearance",
      ap.buttonGlow,
      (v) => setAp("buttonGlow", v),
      ["style", "shadow", "glow"],
    ),
    toggle(
      "a.pageAura",
      "Page glow",
      "A faint wash of your accent colour at the top of every page",
      "Appearance",
      ap.pageAura,
      (v) => setAp("pageAura", v),
      ["style", "aura", "gradient", "background"],
    ),
    enumEntry(
      "a.uiFont",
      "App font",
      "The font for menus and pages, not the text you type",
      "Appearance",
      ap.uiFont,
      [
        { id: "sans", label: "Sans" },
        { id: "mono", label: "Mono" },
        { id: "system", label: "System" },
      ] as const,
      (v) => setAp("uiFont", v),
      ["style", "font", "typeface", "interface"],
    ),
    enumEntry(
      "a.uiScale",
      "App size",
      "Make everything a little smaller or larger",
      "Appearance",
      ap.uiScale,
      [
        { id: "compact", label: "Compact" },
        { id: "default", label: "Default" },
        { id: "large", label: "Large" },
      ] as const,
      (v) => setAp("uiScale", v),
      ["style", "zoom", "scale", "text size", "density"],
    ),

    /* ─── Surfaces ─────────────────────────────────────────────── */
    enumEntry(
      "a.cardSurfaces",
      "Cards",
      "Solid, subtle or transparent cards",
      "Appearance",
      ap.cardSurfaces,
      [
        { id: "solid", label: "Solid" },
        { id: "subtle", label: "Subtle" },
        { id: "transparent", label: "Transparent" },
      ] as const,
      (v) => setAp("cardSurfaces", v),
      ["minimal", "monkeytype", "cards", "surfaces"],
    ),
    enumEntry(
      "a.dividers",
      "Dividers",
      "Lines between sections",
      "Appearance",
      ap.dividers,
      [
        { id: "hairline", label: "Hairline" },
        { id: "dotted", label: "Dashed" },
        { id: "hidden", label: "Hidden" },
      ] as const,
      (v) => setAp("dividers", v),
      ["minimal", "lines", "surfaces"],
    ),
    enumEntry(
      "a.pagePadding",
      "Page padding",
      "How much space surrounds each page",
      "Appearance",
      ap.pagePadding,
      [
        { id: "tight", label: "Tight" },
        { id: "comfortable", label: "Comfortable" },
        { id: "roomy", label: "Roomy" },
      ] as const,
      (v) => setAp("pagePadding", v),
      ["density", "spacing", "surfaces"],
    ),
    enumEntry(
      "a.backgroundFill",
      "Page colour",
      "Themed, or a bare neutral",
      "Appearance",
      ap.backgroundFill,
      [
        { id: "paper", label: "Themed" },
        { id: "bare", label: "Bare" },
      ] as const,
      (v) => setAp("backgroundFill", v),
      ["background", "surfaces"],
    ),
    toggle(
      "a.monochromeChrome",
      "Single accent",
      "Keep hover tints neutral so only the accent colour stands out",
      "Appearance",
      ap.monochromeChrome,
      (v) => setAp("monochromeChrome", v),
      ["editorial", "minimal", "monochrome"],
    ),

    /* ─── Corners & borders ────────────────────────────────────── */
    enumEntry(
      "a.borders",
      "Outlines",
      "The thin lines around cards and controls",
      "Appearance",
      ap.borders,
      [
        { id: "default", label: "Strong" },
        { id: "soft", label: "Soft" },
        { id: "hidden", label: "Hidden" },
      ] as const,
      (v) => setAp("borders", v),
      ["geometry", "borders"],
    ),

    /* ─── Top bar & footer ─────────────────────────────────────── */
    enumEntry(
      "a.topbarStyle",
      "Top bar",
      "Raised, flat or text only",
      "Appearance",
      ap.topbarStyle,
      [
        { id: "elevated", label: "Raised" },
        { id: "flat", label: "Flat" },
        { id: "text-only", label: "Text only" },
      ] as const,
      (v) => setAp("topbarStyle", v),
      ["chrome", "header"],
    ),
    enumEntry(
      "a.footerStyle",
      "Footer",
      "Visible, compact or hidden",
      "Appearance",
      ap.footerStyle,
      [
        { id: "visible", label: "Visible" },
        { id: "compact", label: "Compact" },
        { id: "hidden", label: "Hidden" },
      ] as const,
      (v) => setAp("footerStyle", v),
      ["chrome", "footer"],
    ),
    enumEntry(
      "a.autoHide",
      "Top bar and footer while typing",
      "Dim or hide the top bar and footer during a test",
      "Appearance",
      ap.autoHide,
      [
        { id: "off", label: "Off" },
        { id: "dim", label: "Dim" },
        { id: "fade", label: "Fade" },
      ] as const,
      (v) => setAp("autoHide", v),
      ["chrome", "focus", "hide", "while typing"],
    ),
  ];
}
