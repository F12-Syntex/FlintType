"use client";

import { DEFAULT_APPEARANCE, type AppearancePrefs } from "./appearance-prefs";
import { DEFAULT_BACKGROUND, type BackgroundPrefs } from "./background-prefs";
import { DEFAULT_BEHAVIOUR, type BehaviourPrefs } from "./behaviour-prefs";
import { DEFAULT_CARET, type CaretSettings } from "./caret-settings";
import { DEFAULT_KEYBOARD, type KeyboardSettings } from "./keyboard-settings";
import { CUSTOM_THEME_ID, findTheme, THEMES } from "./themes/registry";
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

// ─── Import plans ───────────────────────────────────────────────────
//
// `import*` functions both return a plan rather than committing
// directly. The UI shows the plan in a confirmation dialog, then
// invokes `apply()` once the user accepts. This way the user sees what
// will change *before* their settings are stomped, and a misclicked
// import is recoverable (just hit Cancel).

/** A single human-readable change row in an import plan. */
export type ImportChange = {
  /** Slice the row will write to. */
  slice: string;
  /** Short headline describing what the slice will contain. */
  label: string;
  /** Optional list of bullet-point details (specific keys / values). */
  details?: string[];
};

/** What a planned import will do, plus the commit fn that performs it. */
export type ImportPlan = {
  source: "flinttype" | "monkeytype";
  /** Title of the source the import was parsed from — surfaced as the
   *  dialog header. */
  title: string;
  /** Each slice the import will write, in the order it'll be applied. */
  changes: ImportChange[];
  /** Run the import. Returns the count of slices touched. */
  apply: () => number;
};

// ─── Flinttype import ────────────────────────────────────────────────

/** Plan a flinttype JSON import. Each slice in the export becomes one
 *  change row; the row's details list the top-level keys that will be
 *  written so the user can see roughly what's coming over. */
export function planFlinttypeImport(payload: unknown): ImportPlan {
  if (!isFlinttypeExport(payload)) {
    throw new Error("Not a flinttype export — expected app: 'flinttype'.");
  }
  const slices = payload.slices;
  const changes: ImportChange[] = [];
  for (const key of KNOWN_SLICES) {
    const slice = slices[key];
    if (slice == null || typeof slice !== "object") continue;
    changes.push({
      slice: key,
      label: SLICE_LABELS[key] ?? key,
      details: Object.keys(slice as object).slice(0, 8),
    });
  }
  return {
    source: "flinttype",
    title: "Import flinttype settings",
    changes,
    apply: () => {
      let n = 0;
      for (const c of changes) {
        const slice = slices[c.slice];
        if (slice == null || typeof slice !== "object") continue;
        writeSlice(c.slice, slice);
        n += 1;
      }
      return n;
    },
  };
}

/** Legacy direct-apply entrypoint — kept for tests and any caller that
 *  doesn't want the dialog flow. */
export function importFlinttype(payload: unknown): number {
  return planFlinttypeImport(payload).apply();
}

const SLICE_LABELS: Record<string, string> = {
  caret: "Caret",
  appearance: "Appearance",
  behaviour: "Behaviour",
  background: "Background image",
  keyboard: "Keyboard",
  theme: "Theme overrides",
  palette: "Palette",
  practice: "Practice mode",
};

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

/** Plan a MonkeyType `settings.json` import. Translates the JSON
 *  field-by-field into a list of change rows, then returns an `apply`
 *  fn that writes them to the prefs store. The UI shows the rows in a
 *  confirmation dialog before calling apply — the user sees exactly
 *  what's going to land before their settings are stomped. */
export function planMonkeytypeImport(payload: unknown): ImportPlan {
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
  // export is "active" for the user. We follow MT's semantics first,
  // then add a single fallback: if the user is on a named MT theme that
  // flinttype doesn't ship, fall back to their `customThemeColors` blob
  // (MT's last-saved custom palette) rather than dropping the colour
  // import entirely. Without the fallback the user sees their full
  // settings imported but no theme change — which is what triggered the
  // "background/text colours didn't import" bug.
  const customThemeColorsPresent = Array.isArray(mt.customThemeColors);
  const namedThemeRequested =
    mt.customTheme !== true && typeof mt.theme === "string";
  const namedPaletteCandidate = namedThemeRequested ? mapPalette(mt) : null;
  const fellBackToCustom =
    namedThemeRequested && !namedPaletteCandidate && customThemeColorsPresent;
  const applyColors =
    customThemeColorsPresent &&
    (mt.customTheme === true || fellBackToCustom);
  const colorOverrides = applyColors ? mapColorOverrides(mt) : null;
  const typographyOverrides = mapTypographyOverrides(mt);
  const themeOverrides = combineOverrides(colorOverrides, typographyOverrides);
  // Color overrides fork the user off whatever palette they were on →
  // palette becomes "custom". Typography-only imports keep the named
  // palette mapping below so the user lands on the right colours and
  // also gets the font.
  const namedPalette = colorOverrides ? null : namedPaletteCandidate;

  const changes: ImportChange[] = [];
  if (caret) {
    changes.push({
      slice: "caret",
      label: "Caret",
      details: describeCaret(caret),
    });
  }
  if (behaviour) {
    changes.push({
      slice: "behaviour",
      label: "Behaviour",
      details: describeBehaviour(behaviour),
    });
  }
  if (appearance) {
    changes.push({
      slice: "appearance",
      label: "Appearance",
      details: describeAppearance(appearance),
    });
  }
  if (background) {
    changes.push({
      slice: "background",
      label: "Background image",
      details: describeBackground(background),
    });
  }
  if (themeOverrides) {
    const detail: string[] = [];
    if (colorOverrides) {
      const keys = Object.keys(colorOverrides).filter((k) =>
        k.startsWith("--"),
      );
      detail.push(`${keys.length} colour token${keys.length === 1 ? "" : "s"}`);
      if (fellBackToCustom) {
        // The user was on an MT named theme flinttype doesn't ship —
        // surface the fallback so they understand why the picker says
        // "Custom" instead of carrying the named theme over.
        detail.push(
          `theme "${asString(mt.theme)}" not in library — using your custom colours`,
        );
      }
    }
    if (typographyOverrides?.["--ft-font-family"]) {
      const family = typographyOverrides["--ft-font-family"]
        .split(",")[0]
        ?.trim()
        .replace(/^['"]|['"]$/g, "");
      if (family) detail.push(`font: ${family}`);
    }
    if (typographyOverrides?.["--ft-font-scale"]) {
      detail.push(`size: ${typographyOverrides["--ft-font-scale"]}×`);
    }
    changes.push({
      slice: "theme",
      label: colorOverrides ? "Theme (Custom)" : "Theme typography",
      details: detail,
    });
  }
  if (namedPalette) {
    changes.push({
      slice: "palette",
      label: "Palette",
      details: [namedPalette.activeId ?? "default"],
    });
  } else if (colorOverrides) {
    changes.push({
      slice: "palette",
      label: "Palette",
      details: ["custom (driven by imported colours)"],
    });
  }
  if (practice) {
    changes.push({
      slice: "practice",
      label: "Practice mode",
      details: [`${practice.mode.toLowerCase()} · ${practice.length}`],
    });
  }

  return {
    source: "monkeytype",
    title: "Import MonkeyType settings",
    changes,
    apply: () => {
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
      if (themeOverrides) {
        writeSlice("theme", themeOverrides);
        n += 1;
      }
      // Palette write order: color-driven custom > named palette mapping.
      if (colorOverrides) {
        writeSlice("palette", { activeId: CUSTOM_THEME_ID });
      } else if (namedPalette) {
        writeSlice("palette", namedPalette);
      }
      if (practice) {
        writeSlice("practice", practice);
        n += 1;
      }
      return n;
    },
  };
}

/** Legacy direct-apply entrypoint — kept for tests and any caller that
 *  doesn't want the dialog flow. */
export function importMonkeytype(payload: unknown): number {
  return planMonkeytypeImport(payload).apply();
}

// ─── Plan-row detail formatters ──────────────────────────────────────

function describeCaret(c: Partial<CaretSettings>): string[] {
  const out: string[] = [];
  if (c.style) out.push(`style: ${c.style}`);
  if (c.smoothSpeed != null) out.push(`smooth: ${c.smoothSpeed}ms`);
  return out;
}

function describeBehaviour(b: Partial<BehaviourPrefs>): string[] {
  const out: string[] = [];
  if (b.confidence) out.push(`confidence: ${b.confidence}`);
  if (b.difficulty) out.push(`difficulty: ${b.difficulty}`);
  if (b.stopOnError != null)
    out.push(`stop on error: ${b.stopOnError ? "on" : "off"}`);
  if (b.quickRestart != null)
    out.push(`quick restart: ${b.quickRestart ? "on" : "off"}`);
  if (b.blindMode != null)
    out.push(`blind mode: ${b.blindMode ? "on" : "off"}`);
  return out;
}

function describeAppearance(a: Partial<AppearancePrefs>): string[] {
  const out: string[] = [];
  if (a.keymap) out.push(`keymap: ${a.keymap}`);
  if (a.keymapLayout) out.push(`layout: ${a.keymapLayout}`);
  if (a.highlightMode) out.push(`highlight: ${a.highlightMode}`);
  if (a.tapeMode) out.push(`tape: ${a.tapeMode}`);
  if (a.typingSpeedUnit) out.push(`speed unit: ${a.typingSpeedUnit}`);
  if (a.maxLineWidth != null)
    out.push(`max line: ${a.maxLineWidth === 0 ? "stretch" : a.maxLineWidth + "ch"}`);
  if (a.liveStatsOpacity != null)
    out.push(`stats opacity: ${a.liveStatsOpacity}`);
  if (a.liveStatsColor) out.push(`stats colour: ${a.liveStatsColor}`);
  return out;
}

function describeBackground(b: Partial<BackgroundPrefs>): string[] {
  const out: string[] = [];
  if (b.imageUrl) out.push(`image: ${truncateUrl(b.imageUrl)}`);
  if (b.fit) out.push(`fit: ${b.fit}`);
  if (b.blur != null) out.push(`blur: ${b.blur}`);
  if (b.opacity != null) out.push(`opacity: ${b.opacity}`);
  return out;
}

function truncateUrl(url: string): string {
  if (url.length <= 40) return url;
  return url.slice(0, 37) + "…";
}

function combineOverrides(
  a: ThemeOverrides | null,
  b: ThemeOverrides | null,
): ThemeOverrides | null {
  if (!a && !b) return null;
  return { ...(a ?? {}), ...(b ?? {}) };
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
  // Live-stats container styling — opacity is a 0..1 multiplier that
  // multiplies the rendered colour; colour is a named MT token that we
  // resolve to a hex below.
  if (typeof mt.liveStatsOpacity === "number") {
    out.liveStatsOpacity = clamp(mt.liveStatsOpacity, 0, 1);
  }
  const statsColor = resolveStatsColor(mt);
  if (statsColor != null) out.liveStatsColor = statsColor;
  // pageWidth: MT ships "100" | "125" | "150" | "200" | "max" as a
  // page-content width hint. Translate the numeric variants to a
  // character-width budget on the practice passage; "max" means
  // unconstrained which we encode as 0 (the same sentinel the appearance
  // page uses for "stretch to container").
  if (typeof mt.pageWidth === "string") {
    const map: Record<string, number> = {
      "100": 80,
      "125": 100,
      "150": 120,
      "200": 160,
      max: 0,
    };
    const w = map[mt.pageWidth];
    if (w != null) out.maxLineWidth = w;
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

/** MT's `liveStatsColor` is one of "black" | "sub" | "text" | "main" —
 *  references into its own colour vocabulary. Resolve to a literal hex
 *  by looking up the corresponding slot in `customThemeColors` when the
 *  user is on a custom theme. Returns null if the field is absent or
 *  the user is on a named MT theme (we'd need that theme's full palette
 *  to translate, which we don't ship). */
function resolveStatsColor(mt: MonkeytypeSettings): string | null {
  const v = mt.liveStatsColor;
  if (typeof v !== "string") return null;
  if (v === "black") return "#000000";
  if (mt.customTheme !== true || !Array.isArray(mt.customThemeColors)) {
    return null;
  }
  const arr = mt.customThemeColors as unknown[];
  // 1 main, 3 sub, 4 text — same indices used by the colour mapping
  // below so the live-stats colour visually matches the typed/untyped
  // text the user sees in the passage.
  const idx: Record<string, number> = { main: 1, sub: 3, text: 4 };
  if (idx[v] === undefined) return null;
  return pickColor(arr, idx[v]);
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
 *    main → --primary, --accent, --ring, --ft-passage-typed
 *           Note: MT renders typed-correctly letters in mainColor (not
 *           textColor) — and flinttype's passage now consumes
 *           --ft-passage-typed directly so the chrome's --foreground
 *           stays whatever the active palette / textColor says.
 *    sub  → --muted-foreground, --border, --ft-passage-untyped
 *           Untyped passage chars use this role in MT.
 *    text → --foreground, --card-foreground
 *           MT's textColor is the chrome body text role (buttons,
 *           headers) — distinct from the typed-letter colour.
 *    caption → ignored (no clean fit; --muted-foreground already gets sub)
 *    error → --ft-passage-error (the passage-only error colour). MT's
 *           --destructive token isn't in flinttype's user-override list
 *           by design — the chrome destructive stays on the active
 *           palette. errorExtraColor (index 6) and the colourful-mode
 *           variants are still ignored; flinttype draws extras and
 *           wrong chars with the same role.
 *
 *  fontFamily ("JetBrains_Mono", "Fira_Code", …) becomes --ft-font-family
 *  with an underscore→space normalization and a sensible fallback.
 *  fontSize is a multiplier (1.0 default) → --ft-font-scale. */
/** Pull just the colour overrides out of a MT settings object. Callers
 *  combine with `mapTypographyOverrides` when they want a single
 *  flinttype `theme` slice. Split into two so the import flow can ask
 *  "did the user import any *colour* changes?" — colour changes drive
 *  the palette into Custom mode; typography on its own doesn't. */
function mapColorOverrides(mt: MonkeytypeSettings): ThemeOverrides | null {
  if (!Array.isArray(mt.customThemeColors)) return null;
  const out: ThemeOverrides = {};
  {
    const arr = mt.customThemeColors as unknown[];
    const bg = pickColor(arr, 0);
    const main = pickColor(arr, 1);
    const sub = pickColor(arr, 3);
    const text = pickColor(arr, 4);
    const error = pickColor(arr, 5);
    // colorfulMode (default: true on MT) controls whether typed-correctly
    // letters paint in mainColor (true) or textColor (false). Default
    // matches MT — only turn it off if the import explicitly says false.
    const colorful = mt.colorfulMode !== false;
    // flipTestColors swaps which token paints typed vs. untyped letters
    // in the passage. MT default: typed = main/text, untyped = sub.
    // Flipped: typed = sub, untyped = main/text.
    const flipped = mt.flipTestColors === true;
    const typedColor = colorful ? main : text;
    const untypedColor = sub;
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
      // MT's textColor is the *chrome* body text colour (buttons,
      // headers, captions) — distinct from typed-letter colour.
      out["--foreground"] = text;
      out["--card-foreground"] = text;
    }
    if (error) {
      // Mistyped/extra chars in the passage. Scoped to the passage so
      // chrome --destructive (toasts, delete buttons) keeps tracking
      // the active palette.
      out["--ft-passage-error"] = error;
    }
    // Passage typed/untyped — driven by the colorfulMode + flipTestColors
    // pair, separately from the chrome tokens above so the passage roles
    // can diverge from --primary / --muted-foreground when MT's flags
    // demand it.
    if (typedColor) {
      out["--ft-passage-typed"] = flipped
        ? (untypedColor ?? typedColor)
        : typedColor;
    }
    if (untypedColor) {
      out["--ft-passage-untyped"] = flipped
        ? (typedColor ?? untypedColor)
        : untypedColor;
    }
  }

  return Object.keys(out).length ? out : null;
}

/** Pull --ft-font-family / --ft-font-scale out of a MT settings object.
 *  Always safe to apply (independent of customTheme / customThemeColors)
 *  — typography overrides ride along with whichever palette the user
 *  ends up on. */
function mapTypographyOverrides(
  mt: MonkeytypeSettings,
): ThemeOverrides | null {
  const out: ThemeOverrides = {};
  if (typeof mt.fontFamily === "string" && mt.fontFamily) {
    const family = mt.fontFamily.replace(/_/g, " ");
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
