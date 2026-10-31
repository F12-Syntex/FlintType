import { findFontByStack } from "../fonts/catalog";
import { DEFAULT_HAND_LAYOUT } from "../hand-layout";
import { lengthLabel } from "../test-name";
import { wordlistLabel } from "../wordlists/use-wordlist";

/** How a flinttype value reads in the import review: exactly the option
 *  label the settings control shows ("Line", "Smooth", "Next word"), so
 *  the review and the settings page agree. Pure. */

type Labels = Readonly<Record<string, string>>;

const CARET_STYLE: Labels = {
  line: "Line",
  block: "Block",
  underline: "Under",
  outline: "Outline",
  off: "Off",
};
/** caret-row.tsx SMOOTH_PRESETS. */
export const MOVEMENT_PRESETS: Readonly<Record<number, string>> = {
  0: "Off",
  60: "Snappy",
  120: "Smooth",
  200: "Flow",
  300: "Glide",
  450: "Drift",
};
/** caret-row.tsx RADIUS_PRESETS. */
const CARET_CORNERS: Readonly<Record<number, string>> = { 0: "Sharp", 2: "Soft", 6: "Round" };
const BLINK_PRESETS: Readonly<Record<number, string>> = {
  0: "Off",
  1500: "Slow",
  1000: "Normal",
  500: "Fast",
};
const LIVE_STYLE: Labels = { off: "Off", text: "Text", mini: "Mini", flash: "Flash" };
const HIGHLIGHT: Labels = {
  off: "Off",
  letter: "Letter",
  word: "Word",
  "next-word": "Next word",
  "next-letter": "Next letter",
};
const TYPED_EFFECT: Labels = { off: "Off", fade: "Fade", strike: "Strike" };
const TAPE: Labels = { off: "Off", word: "Word", letter: "Letter" };
const KEYMAP: Labels = { off: "Off", static: "Static", react: "React", next: "Next" };
const KEYMAP_LAYOUT: Labels = { qwerty: "QWERTY", dvorak: "Dvorak", colemak: "Colemak" };
const KEYMAP_STYLE: Labels = {
  staggered: "Staggered",
  matrix: "Matrix",
  split: "Split",
  alice: "Alice",
};
const KEYMAP_LEGEND: Labels = {
  lowercase: "Lower",
  uppercase: "Upper",
  blank: "Blank",
  dynamic: "Dynamic",
};
const KEYMAP_TOP_ROW: Labels = { always: "Always", layout: "Auto", never: "Never" };
const CONFIDENCE: Labels = { off: "Off", word: "Word", all: "All" };
const FIT: Labels = { cover: "Cover", contain: "Contain", auto: "Auto", tile: "Tile" };
const MODE: Labels = { WORDS: "Words", TIME: "Time", QUOTE: "Quote", BURST: "Burst" };
const COLOUR_MODE: Labels = { light: "Light", dark: "Dark", system: "System" };
/** The mode bar's quote-length chips. */
const QUOTE_LENGTHS = ["Short", "Medium", "Long", "Extra long"];

const percent = (v: number) => `${Math.round(v * 100)}%`;

/** On / Off for booleans, the number for numbers, the text capitalised. */
export function plainValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "On" : "Off";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "None";
  if (typeof v === "string") {
    const s = v.replace(/[_-]+/g, " ").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "None";
  }
  return "None";
}

/** The option label for `v`; only the table's own entries match, so a
 *  value like "constructor" reads as itself. */
function pick(table: Labels, v: unknown): string {
  return (typeof v === "string" && Object.hasOwn(table, v) && table[v]) || plainValue(v);
}

type Finger = { enabled?: unknown; homeKey?: unknown };

/** The hand layout in a few words: fingers in use, and whether the home
 *  keys are the standard ones. */
export function handLayoutLabel(v: unknown): string {
  if (!v || typeof v !== "object") return "Standard";
  const fingers = v as Record<string, Finger | undefined>;
  const ids = Object.keys(DEFAULT_HAND_LAYOUT.fingers) as (keyof typeof DEFAULT_HAND_LAYOUT.fingers)[];
  const used = ids.filter((id) => fingers[id]?.enabled !== false).length;
  const standard = ids.every((id) => (fingers[id]?.homeKey ?? DEFAULT_HAND_LAYOUT.fingers[id].homeKey) === DEFAULT_HAND_LAYOUT.fingers[id].homeKey);
  return `${used} ${used === 1 ? "finger" : "fingers"}, ${standard ? "standard" : "your own"} home keys`;
}

/** The font a `--ft-font-family` stack names, as the picker labels it. */
export function fontLabel(stack: string | null | undefined): string {
  if (!stack) return "Default";
  if (stack.startsWith("Georgia")) return "Georgia";
  return findFontByStack(stack)?.family ?? plainValue(stack.split(",")[0]?.replace(/["']/g, ""));
}

/** `--ft-font-scale` as the Size control shows it (px of 40). */
export function fontSizeLabel(scale: string | null | undefined): string {
  const n = scale ? Number.parseFloat(scale) : 1;
  return `${Math.round((Number.isFinite(n) ? n : 1) * 40)}px`;
}

/** The test length as the mode bar names it. */
export function practiceLengthLabel(mode: unknown, length: unknown): string {
  const n = typeof length === "number" ? length : Number.NaN;
  if (mode === "QUOTE") return QUOTE_LENGTHS[n] ?? "Quote";
  return lengthLabel(mode === "TIME" ? "time" : "words", n);
}

/** Label for a slice field's value. `practiceMode` resolves "length". */
export function sliceValueLabel(
  slice: string,
  field: string,
  v: unknown,
  practiceMode?: unknown,
): string {
  switch (`${slice}.${field}`) {
    case "caret.style": return pick(CARET_STYLE, v);
    case "caret.smoothSpeed":
      return typeof v === "number" ? (MOVEMENT_PRESETS[v] ?? `${v} ms`) : plainValue(v);
    case "caret.blinkSpeed":
      return typeof v === "number" ? (BLINK_PRESETS[v] ?? `${v} ms`) : plainValue(v);
    case "caret.width": return `${plainValue(v)}px`;
    case "caret.radius":
      return typeof v === "number" ? (CARET_CORNERS[v] ?? `${v}px`) : plainValue(v);
    case "appearance.liveProgressStyle":
    case "appearance.liveSpeedStyle":
    case "appearance.liveAccuracyStyle":
    case "appearance.liveBurstStyle":
      return pick(LIVE_STYLE, v);
    case "appearance.liveStatsColor": return v ? String(v).toLowerCase() : "Accent";
    case "appearance.liveStatsOpacity":
    case "background.opacity":
    case "background.darken":
      return typeof v === "number" ? percent(v) : plainValue(v);
    case "appearance.highlightMode": return pick(HIGHLIGHT, v);
    case "appearance.typedEffect": return pick(TYPED_EFFECT, v);
    case "appearance.tapeMode": return pick(TAPE, v);
    case "appearance.tapeMargin": return `${plainValue(v)}%`;
    case "appearance.linesRendered": return v === 0 ? "All" : plainValue(v);
    case "appearance.maxLineWidth": return v === 0 ? "Full" : `${plainValue(v)} ch`;
    case "appearance.typingSpeedUnit": return typeof v === "string" ? v.toUpperCase() : plainValue(v);
    case "appearance.keymap": return pick(KEYMAP, v);
    case "appearance.keymapLayout": return pick(KEYMAP_LAYOUT, v);
    case "appearance.keymapStyle": return pick(KEYMAP_STYLE, v);
    case "appearance.keymapLegend": return pick(KEYMAP_LEGEND, v);
    case "appearance.keymapTopRow": return pick(KEYMAP_TOP_ROW, v);
    case "appearance.keymapSize": return typeof v === "number" ? keymapSizeLabel(v) : plainValue(v);
    case "behaviour.confidence": return pick(CONFIDENCE, v);
    case "background.fit": return pick(FIT, v);
    case "background.blur": return `${plainValue(v)}px`;
    case "background.imageUrl": return v ? String(v) : "None";
    case "audio.keypressClickVolume": return `${plainValue(v)}%`;
    case "practice.mode": return pick(MODE, v);
    case "practice.length": return practiceLengthLabel(practiceMode, v);
    case "practice.wordlist": return typeof v === "string" ? wordlistLabel(v) : plainValue(v);
    case "handLayout.fingers": return handLayoutLabel(v);
    default: return plainValue(v);
  }
}

/** The keyboard Size slider's own format (keymap-rows.tsx): "1.1×". */
export const keymapSizeLabel = (v: number) => `${v.toFixed(1)}×`;

/** Label for light, dark or system mode. */
export function colourModeLabel(v: string | null): string {
  return (v && Object.hasOwn(COLOUR_MODE, v) && COLOUR_MODE[v]) || "System";
}
