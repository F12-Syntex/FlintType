"use client";

import { DEFAULT_APPEARANCE, type AppearancePrefs } from "./appearance-prefs";
import { DEFAULT_BACKGROUND, type BackgroundPrefs } from "./background-prefs";
import { DEFAULT_BEHAVIOUR, type BehaviourPrefs } from "./behaviour-prefs";
import { DEFAULT_CARET, type CaretSettings } from "./caret-settings";
import { type KeyboardSettings } from "./keyboard-settings";
import { getCache, loadPrefs, writeSlice } from "./prefs-store";

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
  "audio",
  "handLayout",
] as const;

// Deliberately excluded from the settings round-trip:
//   - "spectate"  — carries a per-friend privacy blocklist; a relationship
//                   decision, not a portable visual/behaviour setting.
//   - "profileRank", "drillProgress", "monkeytypeStats", "lifetimeStats",
//     "monkeytypeDismissed" — identity / progress / one-shot UI state, not
//                   "settings" the user means to carry between machines.
// Anything not in KNOWN_SLICES is left untouched on import (never blown
// away) and omitted from export.

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

/** Key/value detail row inside a change card. The UI renders these as
 *  a clean two-column grid (`Style ── line`, `Smooth ── 250ms`) instead
 *  of a bulleted list, so the dialog reads like a spec sheet. */
export type ImportChangeDetail = {
  key: string;
  value: string;
};

/** A single human-readable change row in an import plan. */
export type ImportChange = {
  /** Slice the row will write to. */
  slice: string;
  /** Short headline describing what the slice will contain. */
  label: string;
  /** Optional ordered list of key/value details. */
  details?: ImportChangeDetail[];
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
    const keys = Object.keys(slice as object);
    const preview = keys.slice(0, 6).join(", ");
    const summary = keys.length > 6 ? `${preview}, …` : preview;
    changes.push({
      slice: key,
      label: SLICE_LABELS[key] ?? key,
      details: [
        {
          key: `${keys.length} field${keys.length === 1 ? "" : "s"}`,
          value: summary || "—",
        },
      ],
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
  // Theme appearance (palette / colour overrides / fonts / radius) is
  // intentionally NOT imported from MonkeyType. Reasons:
  //   - flinttype's editorial-mechanical brand is paper-and-ink + the
  //     coral spark; MT's named themes (catppuccin, monokai, …) clash
  //     with the rest of the chrome and don't reproduce 1:1 anyway
  //   - MT serialises customThemeColors even when the user is on a
  //     named theme, so importing them was either accurate (custom
  //     mode) or actively wrong (named mode), and the previous fallback
  //     made the wrong path silent
  // The user can still pick a flinttype palette or import a flinttype
  // export afterwards if they want their visuals to follow.

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
  if (practice) {
    changes.push({
      slice: "practice",
      label: "Practice mode",
      details: [
        { key: "Mode", value: practice.mode.toLowerCase() },
        { key: "Length", value: String(practice.length) },
      ],
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

function describeCaret(c: Partial<CaretSettings>): ImportChangeDetail[] {
  const out: ImportChangeDetail[] = [];
  if (c.style) out.push({ key: "Style", value: c.style });
  if (c.smoothSpeed != null)
    out.push({ key: "Smooth", value: `${c.smoothSpeed}ms` });
  return out;
}

function describeBehaviour(b: Partial<BehaviourPrefs>): ImportChangeDetail[] {
  const out: ImportChangeDetail[] = [];
  if (b.confidence) out.push({ key: "Confidence", value: b.confidence });
  if (b.stopOnError != null)
    out.push({ key: "Stop on error", value: b.stopOnError ? "On" : "Off" });
  if (b.quickRestart != null)
    out.push({ key: "Quick restart", value: b.quickRestart ? "On" : "Off" });
  if (b.blindMode != null)
    out.push({ key: "Blind mode", value: b.blindMode ? "On" : "Off" });
  return out;
}

function describeAppearance(a: Partial<AppearancePrefs>): ImportChangeDetail[] {
  const out: ImportChangeDetail[] = [];
  if (a.keymap) out.push({ key: "Keymap", value: a.keymap });
  if (a.keymapLayout) out.push({ key: "Layout", value: a.keymapLayout });
  if (a.highlightMode) out.push({ key: "Highlight", value: a.highlightMode });
  if (a.tapeMode) out.push({ key: "Tape", value: a.tapeMode });
  if (a.typingSpeedUnit)
    out.push({ key: "Speed unit", value: a.typingSpeedUnit });
  if (a.maxLineWidth != null)
    out.push({
      key: "Max line",
      value: a.maxLineWidth === 0 ? "stretch" : `${a.maxLineWidth}ch`,
    });
  if (a.liveStatsOpacity != null)
    out.push({ key: "Stats opacity", value: String(a.liveStatsOpacity) });
  return out;
}

function describeBackground(b: Partial<BackgroundPrefs>): ImportChangeDetail[] {
  const out: ImportChangeDetail[] = [];
  if (b.imageUrl) out.push({ key: "Image", value: truncateUrl(b.imageUrl) });
  if (b.fit) out.push({ key: "Fit", value: b.fit });
  if (b.blur != null) out.push({ key: "Blur", value: String(b.blur) });
  if (b.opacity != null) out.push({ key: "Opacity", value: String(b.opacity) });
  return out;
}

function truncateUrl(url: string): string {
  if (url.length <= 40) return url;
  return url.slice(0, 37) + "…";
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
  // MT's `difficulty` (easy/normal/expert/master) is intentionally
  // dropped: flinttype's casual mode picks uniformly and adaptive
  // mode picks purely from the bigram model — neither honours a
  // length-skew bias.
  if (typeof mt.blindMode === "boolean") out.blindMode = mt.blindMode;
  // Live indicator on/off used to live here; the appearance live-*
  // styles already encode it via the "off" value, so this section is
  // intentionally just behaviour now (blind mode + future flags).
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
  // MT toggle maps cleanly: `true` = unbounded, `false` = original 3-line cap.
  if (typeof mt.showAllLines === "boolean") {
    out.linesRendered = mt.showAllLines ? 0 : 3;
  }
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
  if (typeof mt.liveStatsOpacity === "number") {
    out.liveStatsOpacity = clamp(mt.liveStatsOpacity, 0, 1);
  }
  // liveStatsColor and pageWidth-as-maxLineWidth used to map here too,
  // but both reference MT's theme-token vocabulary ("main" / "sub" /
  // "text") which only resolves to a real hex after a colour import.
  // Since the colour import path is gone, dropping these mappings keeps
  // the appearance slice from carrying half-resolved theme references
  // that would otherwise paint as transparent or "black" surprises.
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
