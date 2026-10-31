import { WORDLIST_IDS } from "@/data/wordlists/catalog";
import type { ImportSliceKey } from "@/types/settings-import";

/** Every field a flinttype settings file may set, with the values it
 *  accepts and its settings row title. A field missing from this table,
 *  or a value outside its spec, is never written: a shared file can't
 *  store an unknown value or break the page. Pure. */

export type Spec =
  | { kind: "enum"; values: readonly string[] }
  | { kind: "bool" }
  /** `zero`: 0 is allowed as well, as an "unbounded" choice (Full). */
  | { kind: "num"; min: number; max: number; int?: boolean; zero?: boolean }
  | { kind: "colour" }
  | { kind: "url" };

export type Field = { spec: Spec; label?: string };

const e = (label: string | undefined, ...values: string[]): Field => ({ spec: { kind: "enum", values }, label });
const b = (label?: string): Field => ({ spec: { kind: "bool" }, label });
const n = (label: string | undefined, min: number, max: number, int = false, zero = false): Field => ({
  spec: { kind: "num", min, max, int, ...(zero ? { zero } : {}) },
  label,
});

const LIVE = ["off", "text", "mini", "flash"];

export const FT_FIELDS: Readonly<Record<ImportSliceKey, Readonly<Record<string, Field>>>> = {
  appearance: {
    liveProgressStyle: e("Timer", ...LIVE),
    liveSpeedStyle: e("Speed", ...LIVE),
    liveAccuracyStyle: e("Accuracy", ...LIVE),
    liveBurstStyle: e("Burst", ...LIVE),
    liveStatsColor: { spec: { kind: "colour" }, label: "Colour" },
    liveStatsOpacity: n("Opacity", 0.1, 1),
    highlightMode: e("Highlight", "off", "letter", "word", "next-word", "next-letter"),
    typedEffect: e("Typed words", "off", "fade", "strike"),
    markIncompleteWord: b("Mark skipped words"),
    mistakeStyle: e("Mistakes", "color", "bold", "underline", "highlight"),
    tapeMode: e("Tape", "off", "word", "letter"),
    tapeMargin: n("Caret position", 0, 100, true),
    tapeFade: e("Edge fade", "off", "soft", "strong"),
    smoothLineScroll: b("Smooth scrolling"),
    linesRendered: n("Lines shown", 0, 20, true),
    maxLineWidth: n("Line width", 30, 200, true, true),
    alwaysShowDecimal: b("Always show decimals"),
    typingSpeedUnit: e("Speed unit", "wpm", "cpm", "wps", "cps", "wph"),
    startGraphsAtZero: b("Start graphs at zero"),
    resultShowHeatmap: b("Text heatmap"),
    resultShowExtras: b("Run details"),
    resultShowPerLetter: b("Slowest letters"),
    resultShowHandBalance: b("Hand split"),
    resultShowAnalysis: b("Show analysis"),
    keymap: e("Show keyboard", "off", "static", "react", "next"),
    keymapLayout: e("Layout", "qwerty", "dvorak", "colemak"),
    keymapStyle: e("Key arrangement", "staggered", "matrix", "split", "alice"),
    keymapLegend: e("Key labels", "lowercase", "uppercase", "blank", "dynamic"),
    keymapTopRow: e("Number row", "always", "layout", "never"),
    keymapSize: n("Size", 0.5, 3.5),
    keymapCompact: b("Letters only"),
    borders: e("Outlines", "default", "soft", "hidden"),
    burstReps: n("Burst reps", 1, 10, true),
    multiplayerPlayerColors: b("Player colours"),
    multiplayerOpponentMarker: e("Opponents in the text", "off", "tint", "text"),
    multiplayerRaceFeed: b("Race feed"),
    multiplayerShowOpponentWpm: b("Opponent speed"),
    cardSurfaces: e("Cards", "solid", "subtle", "transparent"),
    dividers: e("Dividers", "hairline", "dotted", "hidden"),
    pagePadding: e("Page padding", "comfortable", "tight", "roomy"),
    backgroundFill: e("Page colour", "paper", "bare"),
    topbarStyle: e("Top bar", "elevated", "flat", "text-only"),
    footerStyle: e("Footer", "visible", "compact", "hidden"),
    autoHide: e("While typing", "off", "dim", "fade"),
    statStripSurface: e("Live stats background", "card", "plain", "none"),
    resultChrome: e("Result layout", "framed", "spare"),
    caretIdle: e("Pulse before you start", "off", "pulse"),
    quoteAttribution: e("Quote credit", "below", "chip", "hidden"),
    monochromeChrome: b("Single accent"),
    controlShape: e("Button shape", "pill", "rounded", "square"),
    depth: e("Depth", "flat", "soft", "lifted"),
    pageAura: b("Page glow"),
    uiFont: e("App font", "sans", "mono", "system"),
    uiScale: e("App size", "compact", "default", "large"),
  },
  caret: {
    style: e("Style", "line", "block", "underline", "outline", "off"),
    width: n("Thickness", 1, 8, true),
    radius: n("Corners", 0, 12, true),
    blinkSpeed: n("Blink", 0, 3000, true),
    smoothSpeed: n("Movement", 0, 1000, true),
  },
  behaviour: {
    // Nothing reads quickRestart, so it's kept but never listed.
    quickRestart: b(),
    stopOnError: b("Stop on error"),
    confidence: e("Confidence mode", "off", "word", "all"),
    allowExtras: b("Allow extra letters"),
    strictSpace: b("Strict space"),
    blindMode: b("Blind mode"),
    minWordLength: n("Shortest word", 1, 8, true),
    showSecondary: b("Numbers and punctuation"),
    excludeCasualFromAdapt: b("Ignore casual runs"),
    burstThreshold: n("Target speed", 0, 300, true),
  },
  background: {
    imageUrl: { spec: { kind: "url" }, label: "Image link" },
    fit: e("Fit", "cover", "contain", "auto", "tile"),
    scope: e("Cover", "page", "content"),
    opacity: n("Opacity", 0, 1),
    blur: n("Blur", 0, 30),
    darken: n("Darken", 0, 1),
  },
  keyboard: {
    design: e("Key style", "solid", "outline", "ghost", "lifted", "glass"),
    shape: e("Key shape", "square", "rounded", "pill"),
    compact: b("Compact keyboard"),
    highlightHomeRow: b("Home row bumps"),
    showShiftLabels: b("Shift symbols"),
  },
  audio: {
    keypressClickEnabled: b("Key clicks"),
    keypressClickVolume: n("Volume", 0, 100, true),
  },
  practice: {
    mode: e("Mode", "WORDS", "TIME", "QUOTE", "BURST"),
    // Checked against the mode by `validLength`.
    length: n("Length", 0, 1000, true),
    adapt: b("Adaptive"),
    wordlist: e("Word list", ...(WORDLIST_IDS as readonly string[])),
  },
  // Checked as a whole by `validHandLayout`.
  handLayout: {},
};

/** The value if it fits the spec (numbers clamped into range), else
 *  undefined. */
export function validValue(spec: Spec, v: unknown): unknown {
  switch (spec.kind) {
    case "enum":
      return typeof v === "string" && spec.values.includes(v) ? v : undefined;
    case "bool":
      return typeof v === "boolean" ? v : undefined;
    case "num": {
      if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
      if (spec.zero && v <= 0) return v === 0 ? 0 : undefined;
      const c = Math.min(Math.max(v, spec.min), spec.max);
      return spec.int ? Math.round(c) : c;
    }
    case "colour":
      return typeof v === "string" && /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8})?$/i.test(v) ? v : undefined;
    case "url":
      return typeof v === "string" && v.length <= 2048 && (v === "" || /^https?:\/\/\S+$/i.test(v))
        ? v
        : undefined;
  }
}
