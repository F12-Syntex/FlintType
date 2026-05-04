"use client";

import { DEFAULT_APPEARANCE, type AppearancePrefs } from "./appearance-prefs";
import { DEFAULT_BACKGROUND, type BackgroundPrefs } from "./background-prefs";
import { DEFAULT_BEHAVIOUR, type BehaviourPrefs } from "./behaviour-prefs";
import { DEFAULT_CARET, type CaretSettings } from "./caret-settings";
import { DEFAULT_KEYBOARD, type KeyboardSettings } from "./keyboard-settings";
import { findTheme, THEMES } from "./themes/registry";
import { getCache, loadPrefs, writeSlice } from "./prefs-store";
import type { ThemeOverrides } from "./theme-customization";

/** All known slice keys — every flinttype-managed pref slice the
 *  importer/exporter understands. Anything outside this list is left
 *  alone on import (so we never blow away a slice we don't recognize)
 *  and dropped on export (so old experiments don't leak into a JSON the
 *  user might paste into a different machine). */
const KNOWN_SLICES = [
  "caret",
  "appearance",
  "behaviour",
  "background",
  "keyboard",
  "theme",
  "palette",
  "practice",
] as const;

// ─── Export ──────────────────────────────────────────────────────────

export type FlinttypeExport = {
  app: "flinttype";
  version: 1;
  exportedAt: string;
  slices: Record<string, unknown>;
};

/** Build a JSON snapshot of the user's prefs blob. Awaits the initial
 *  load so a fresh tab still gets a usable export instead of `{}`. */
export async function buildFlinttypeExport(): Promise<FlinttypeExport> {
  await loadPrefs();
  const cache = getCache() ?? {};
  const slices: Record<string, unknown> = {};
  for (const key of KNOWN_SLICES) {
    if (key in cache) slices[key] = cache[key];
  }
  return {
    app: "flinttype",
    version: 1,
    exportedAt: new Date().toISOString(),
    slices,
  };
}

/** Trigger a browser download of the export blob. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Flinttype import ────────────────────────────────────────────────

/** Apply a previously exported flinttype JSON. Each slice is written
 *  through the prefs store (debounced backend save). Returns the count
 *  of slices imported so the caller can surface a user-visible total. */
export function importFlinttype(payload: unknown): number {
  if (!isFlinttypeExport(payload)) {
    throw new Error("Not a flinttype export — expected app: 'flinttype'.");
  }
  let n = 0;
  for (const key of KNOWN_SLICES) {
    const slice = payload.slices[key];
    if (slice == null || typeof slice !== "object") continue;
    writeSlice(key, slice);
    n += 1;
  }
  return n;
}

function isFlinttypeExport(v: unknown): v is FlinttypeExport {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    r.app === "flinttype" &&
    typeof r.version === "number" &&
    r.slices != null &&
    typeof r.slices === "object"
  );
}

// ─── Monkeytype import ───────────────────────────────────────────────

/** Subset of MonkeyType's settings JSON we know how to translate. The
 *  full schema is much larger; missing fields are simply ignored. */
type MonkeytypeSettings = Record<string, unknown>;

/** Apply a MonkeyType `settings.json` (the file the user gets from
 *  monkeytype.com → settings → "Export settings JSON"). We translate
 *  field-by-field; anything without a flinttype counterpart is dropped.
 *  Returns the count of slices that received any value so the caller
 *  can show a confirmation. */
export function importMonkeytype(payload: unknown): number {
  if (!payload || typeof payload !== "object") {
    throw new Error("Not a settings JSON object.");
  }
  const mt = payload as MonkeytypeSettings;

  const caret = mapCaret(mt);
  const behaviour = mapBehaviour(mt);
  const appearance = mapAppearance(mt);
  const background = mapBackground(mt);
  const practice = mapPractice(mt);
  // Theme handling — MT's `customTheme` flag decides which side of the
  // export is "active" for the user. When true, MT renders the
  // customThemeColors array instead of the named palette, so we mirror
  // that intent: write theme overrides and skip the palette pick.
  // When false (or absent), translate the theme name to a flinttype
  // palette id. Either way we also pull --ft-font-* out of fontFamily
  // / fontSize so typography rides along with the colour import.
  const useCustomColors = mt.customTheme === true;
  const themeOverrides = mapThemeOverrides(mt, useCustomColors);
  const palette = useCustomColors ? null : mapPalette(mt);

  let n = 0;
  if (caret) {
    writeSlice("caret", { ...DEFAULT_CARET, ...caret });
    n += 1;
  }
  if (behaviour) {
    writeSlice("behaviour", { ...DEFAULT_BEHAVIOUR, ...behaviour });
    n += 1;
  }
  if (appearance) {
    writeSlice("appearance", { ...DEFAULT_APPEARANCE, ...appearance });
    n += 1;
  }
  if (background) {
    writeSlice("background", { ...DEFAULT_BACKGROUND, ...background });
    n += 1;
  }
  if (palette) {
    writeSlice("palette", palette);
    n += 1;
  }
  if (themeOverrides) {
    writeSlice("theme", themeOverrides);
    n += 1;
  }
  if (practice) {
    writeSlice("practice", practice);
    n += 1;
  }
  return n;
}

// ─── MonkeyType field mappers ────────────────────────────────────────

function mapCaret(mt: MonkeytypeSettings): Partial<CaretSettings> | null {
  const out: Partial<CaretSettings> = {};
  // smoothCaret ms presets
  if (typeof mt.smoothCaret === "string") {
    const ms = SMOOTH_CARET_MS[mt.smoothCaret as keyof typeof SMOOTH_CARET_MS];
    if (ms !== undefined) out.smoothSpeed = ms;
  }
  // caretStyle: MT's "default" lines up with our "line"; "off" disables.
  if (typeof mt.caretStyle === "string") {
    const s = mt.caretStyle === "default" ? "line" : mt.caretStyle;
    if (CARET_STYLES.has(s)) out.style = s as CaretSettings["style"];
  }
  return Object.keys(out).length ? out : null;
}

const SMOOTH_CARET_MS = {
  off: 0,
  slow: 500,
  medium: 250,
  fast: 100,
} as const;

const CARET_STYLES = new Set<string>([
  "line",
  "block",
  "underline",
  "outline",
  "off",
]);

function mapBehaviour(mt: MonkeytypeSettings): Partial<BehaviourPrefs> | null {
  const out: Partial<BehaviourPrefs> = {};
  if (typeof mt.quickRestart === "string") {
    out.quickRestart = mt.quickRestart !== "off";
  }
  if (typeof mt.stopOnError === "string") {
    out.stopOnError = mt.stopOnError !== "off";
  }
  if (typeof mt.confidenceMode === "string") {
    if (mt.confidenceMode === "off") out.confidence = "off";
    else if (mt.confidenceMode === "max") out.confidence = "all";
    else if (mt.confidenceMode === "on") out.confidence = "word";
  }
  if (typeof mt.difficulty === "string") {
    // MT has "easy" only sometimes — we always accept.
    if (
      mt.difficulty === "easy" ||
      mt.difficulty === "normal" ||
      mt.difficulty === "expert" ||
      mt.difficulty === "master"
    ) {
      out.difficulty = mt.difficulty;
    }
  }
  if (typeof mt.blindMode === "boolean") out.blindMode = mt.blindMode;
  // Live indicators on the test screen — best-effort on/off.
  if (typeof mt.liveSpeedStyle === "string") {
    out.liveWpm = mt.liveSpeedStyle !== "off";
  }
  if (typeof mt.liveAccStyle === "string") {
    out.liveAccuracy = mt.liveAccStyle !== "off";
  }
  return Object.keys(out).length ? out : null;
}

function mapAppearance(
  mt: MonkeytypeSettings,
): Partial<AppearancePrefs> | null {
  const out: Partial<AppearancePrefs> = {};
  if (LIVE_STAT_STYLES.has(asString(mt.liveSpeedStyle))) {
    out.liveSpeedStyle = mt.liveSpeedStyle as AppearancePrefs["liveSpeedStyle"];
  }
  if (LIVE_STAT_STYLES.has(asString(mt.liveAccStyle))) {
    out.liveAccuracyStyle =
      mt.liveAccStyle as AppearancePrefs["liveAccuracyStyle"];
  }
  if (LIVE_STAT_STYLES.has(asString(mt.liveBurstStyle))) {
    out.liveBurstStyle = mt.liveBurstStyle as AppearancePrefs["liveBurstStyle"];
  }
  if (HIGHLIGHT_MODES.has(asString(mt.highlightMode))) {
    out.highlightMode = mt.highlightMode as AppearancePrefs["highlightMode"];
  }
  // typedEffect: MT uses "keep" for "no effect" — we use "off".
  if (typeof mt.typedEffect === "string") {
    if (mt.typedEffect === "keep") out.typedEffect = "off";
    else if (mt.typedEffect === "fade" || mt.typedEffect === "strike") {
      out.typedEffect = mt.typedEffect;
    }
  }
  if (TAPE_MODES.has(asString(mt.tapeMode))) {
    out.tapeMode = mt.tapeMode as AppearancePrefs["tapeMode"];
  }
  if (typeof mt.tapeMargin === "number") out.tapeMargin = mt.tapeMargin;
  if (typeof mt.smoothLineScroll === "boolean") {
    out.smoothLineScroll = mt.smoothLineScroll;
  }
  if (typeof mt.showAllLines === "boolean") out.showAllLines = mt.showAllLines;
  if (typeof mt.maxLineWidth === "number") out.maxLineWidth = mt.maxLineWidth;
  if (typeof mt.alwaysShowDecimalPlaces === "boolean") {
    out.alwaysShowDecimal = mt.alwaysShowDecimalPlaces;
  }
  if (TYPING_SPEED_UNITS.has(asString(mt.typingSpeedUnit))) {
    out.typingSpeedUnit =
      mt.typingSpeedUnit as AppearancePrefs["typingSpeedUnit"];
  }
  if (typeof mt.startGraphsAtZero === "boolean") {
    out.startGraphsAtZero = mt.startGraphsAtZero;
  }
  if (KEYMAP_MODES.has(asString(mt.keymapMode))) {
    out.keymap = mt.keymapMode as AppearancePrefs["keymap"];
  }
  if (typeof mt.keymapLayout === "string" && mt.keymapLayout) {
    out.keymapLayout = mt.keymapLayout;
  }
  if (KEYMAP_STYLES.has(asString(mt.keymapStyle))) {
    out.keymapStyle = mt.keymapStyle as AppearancePrefs["keymapStyle"];
  }
  if (KEYMAP_LEGENDS.has(asString(mt.keymapLegendStyle))) {
    out.keymapLegend =
      mt.keymapLegendStyle as AppearancePrefs["keymapLegend"];
  }
  if (KEYMAP_TOP_ROWS.has(asString(mt.keymapShowTopRow))) {
    out.keymapTopRow =
      mt.keymapShowTopRow as AppearancePrefs["keymapTopRow"];
  }
  if (typeof mt.keymapSize === "number") out.keymapSize = mt.keymapSize;
  return Object.keys(out).length ? out : null;
}

const LIVE_STAT_STYLES = new Set(["off", "text", "mini", "flash"]);
const HIGHLIGHT_MODES = new Set([
  "off",
  "letter",
  "word",
  "next-word",
  "next-letter",
]);
const TAPE_MODES = new Set(["off", "word", "letter"]);
const TYPING_SPEED_UNITS = new Set(["wpm", "cpm", "wps", "cps", "wph"]);
const KEYMAP_MODES = new Set(["off", "static", "react", "next"]);
const KEYMAP_STYLES = new Set(["staggered", "matrix", "split", "alice"]);
const KEYMAP_LEGENDS = new Set(["lowercase", "uppercase", "blank", "dynamic"]);
const KEYMAP_TOP_ROWS = new Set(["always", "layout", "never"]);

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function mapBackground(
  mt: MonkeytypeSettings,
): Partial<BackgroundPrefs> | null {
  const out: Partial<BackgroundPrefs> = {};
  if (typeof mt.customBackground === "string" && mt.customBackground) {
    out.imageUrl = mt.customBackground;
  }
  if (typeof mt.customBackgroundSize === "string") {
    if (
      mt.customBackgroundSize === "cover" ||
      mt.customBackgroundSize === "contain"
    ) {
      out.fit = mt.customBackgroundSize;
    } else if (mt.customBackgroundSize === "max") {
      out.fit = "auto";
    }
  }
  // MT shape: customBackgroundFilter = [blur, brightness, saturation, opacity]
  if (Array.isArray(mt.customBackgroundFilter)) {
    const arr = mt.customBackgroundFilter as unknown[];
    const blur = typeof arr[0] === "number" ? arr[0] : null;
    const brightness = typeof arr[1] === "number" ? arr[1] : null;
    const opacity = typeof arr[3] === "number" ? arr[3] : null;
    if (blur != null) out.blur = clamp(blur, 0, 30);
    if (opacity != null) out.opacity = clamp(opacity, 0, 1);
    // Brightness < 1 reads as a darken on top of the image — translate
    // into our 0..1 darken scrim. Brightness ≥ 1 leaves darken at the
    // mapped 70% default we ship.
    if (brightness != null && brightness < 1) {
      out.darken = clamp(1 - brightness, 0, 1);
    }
  }
  return Object.keys(out).length ? out : null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

// ─── MT theme + colour mapping ───────────────────────────────────────

/** Translate MonkeyType's customThemeColors hex array, fontFamily, and
 *  fontSize into the flinttype `theme` overrides slice.
 *
 *  MT's customThemeColors is a fixed-order array of CSS colours (any
 *  format MT accepts — usually `#rrggbb`):
 *    0 bgColor          → page background
 *    1 mainColor        → brand accent
 *    2 captionColor     → very dim caption text
 *    3 subColor         → muted secondary text
 *    4 textColor        → full-strength foreground
 *    5 errorColor       → incorrect-key red
 *    6 errorExtraColor  → "extra" character red
 *    7 colorfulErrorColor       (when colorfulMode is on)
 *    8 colorfulErrorExtraColor  (when colorfulMode is on)
 *
 *  flinttype's user-overridable token set is smaller (see THEME_VARS in
 *  theme-customization.ts), so we fan one MT token onto every flinttype
 *  token whose role overlaps:
 *    bg   → --background, --card, --muted, --input, --primary-foreground, --accent-foreground
 *    main → --primary, --accent, --ring
 *    sub  → --muted-foreground, --border
 *    text → --foreground, --card-foreground
 *    caption → ignored (no clean fit; --muted-foreground already gets sub)
 *    error → ignored (--destructive lives on the active palette, not
 *             in the user-override list)
 *
 *  fontFamily ("JetBrains_Mono", "Fira_Code", …) becomes --ft-font-family
 *  with an underscore→space normalization and a sensible fallback.
 *  fontSize is a multiplier (1.0 default) → --ft-font-scale. */
function mapThemeOverrides(
  mt: MonkeytypeSettings,
  applyColors: boolean,
): ThemeOverrides | null {
  const out: ThemeOverrides = {};

  if (applyColors && Array.isArray(mt.customThemeColors)) {
    const arr = mt.customThemeColors as unknown[];
    const bg = pickColor(arr, 0);
    const main = pickColor(arr, 1);
    const sub = pickColor(arr, 3);
    const text = pickColor(arr, 4);
    if (bg) {
      out["--background"] = bg;
      out["--card"] = bg;
      out["--muted"] = bg;
      out["--input"] = bg;
      out["--primary-foreground"] = bg;
      out["--accent-foreground"] = bg;
    }
    if (main) {
      out["--primary"] = main;
      out["--accent"] = main;
      out["--ring"] = main;
    }
    if (sub) {
      out["--muted-foreground"] = sub;
      out["--border"] = sub;
    }
    if (text) {
      out["--foreground"] = text;
      out["--card-foreground"] = text;
    }
  }

  if (typeof mt.fontFamily === "string" && mt.fontFamily) {
    const family = mt.fontFamily.replace(/_/g, " ");
    // Default MT mono fallback — keeps text legible if the named family
    // isn't installed locally.
    out["--ft-font-family"] = `"${family}", ui-monospace, monospace`;
  }
  if (typeof mt.fontSize === "number" && mt.fontSize > 0) {
    out["--ft-font-scale"] = String(clamp(mt.fontSize, 0.5, 3));
  }

  return Object.keys(out).length ? out : null;
}

/** Read a hex/colour string from MT's customThemeColors at a given
 *  index. MT validates these on the way out, so we accept any non-empty
 *  string (`#rrggbb`, `#rgb`, `rgb(...)`, even bare names). */
function pickColor(arr: unknown[], i: number): string | null {
  const v = arr[i];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapPalette(mt: MonkeytypeSettings): { activeId: string | null } | null {
  // The user picked a community palette in MT — try to match by id. If
  // we don't have it, leave the palette alone (don't surprise-clear the
  // existing one).
  const id = typeof mt.theme === "string" ? mt.theme : null;
  if (!id) return null;
  if (findTheme(id)) return { activeId: id };
  // Fall back to the closest fuzzy-matched theme so MT theme names that
  // sneaked into our registry under a different slug still apply.
  const slug = id.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fuzzy = THEMES.find(
    (t) => t.id.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug,
  );
  return fuzzy ? { activeId: fuzzy.id } : null;
}

function mapPractice(mt: MonkeytypeSettings): {
  mode: "WORDS" | "TIME" | "QUOTE";
  length: number;
} | null {
  const out: { mode?: "WORDS" | "TIME" | "QUOTE"; length?: number } = {};
  if (mt.mode === "words" || mt.mode === "time" || mt.mode === "quote") {
    out.mode = mt.mode.toUpperCase() as "WORDS" | "TIME" | "QUOTE";
  }
  // MT keeps the words and time counts as separate top-level fields;
  // pick the one matching the chosen mode (or fall back to words).
  if (out.mode === "TIME" && typeof mt.time === "number") out.length = mt.time;
  else if (typeof mt.words === "number") out.length = mt.words;
  if (out.mode == null || out.length == null) return null;
  return { mode: out.mode, length: out.length };
}

// Re-export the slice keys so tests can reference them as a constant.
export { KNOWN_SLICES };
export type { CaretSettings, BehaviourPrefs, AppearancePrefs, BackgroundPrefs, KeyboardSettings };
