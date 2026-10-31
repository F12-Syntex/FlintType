import { LAYOUTS } from "@/app/_components/keyboard/layouts";
import { lengthLabel } from "@/lib/test-name";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import type { MtGroupId, MtSettings, MtSlice } from "./types";

/** One review line per settings row. `fields` change together (a test's
 *  mode and length mean nothing apart); `when` hides a row the settings
 *  page would hide, so the import never sets something with no effect;
 *  `format` reads the settings as they will be after the import. Labels
 *  and values mirror the settings rows. */
export type RowSpec = {
  group: MtGroupId;
  slice: MtSlice;
  fields: readonly string[];
  label: string;
  format: (next: MtSettings) => string;
  when?: (next: MtSettings) => boolean;
};

export const GROUP_TITLES: Record<MtGroupId, string> = {
  test: "Your test",
  typing: "Typing",
  keyboard: "Keyboard",
  stats: "Stats & results",
  behaviour: "Behaviour",
  background: "Background",
};

const onOff = (v: boolean) => (v ? "On" : "Off");
const percent = (v: number) => `${Math.round(v * 100)}%`;
const named = (names: Record<string, string>) => (v: string) => names[v] ?? v;

const caretStyle = named({ line: "Line", block: "Block", underline: "Underline", outline: "Outline", off: "Off" });
const movement = named({ 0: "Off", 60: "Snappy", 120: "Smooth", 200: "Flow", 300: "Glide", 450: "Drift" });
const highlight = named({ off: "Off", letter: "Letter", word: "Word", "next-word": "Next word", "next-letter": "Next letter" });
const effect = named({ off: "Off", fade: "Fade", strike: "Strike" });
const tape = named({ off: "Off", word: "Word", letter: "Letter" });
const keymap = named({ off: "Off", static: "Static", react: "React", next: "Next" });
const arrangement = named({ staggered: "Staggered", matrix: "Matrix", split: "Split", alice: "Alice" });
const legend = named({ lowercase: "Lowercase", uppercase: "Uppercase", blank: "Blank", dynamic: "Dynamic" });
const topRow = named({ always: "Always", layout: "Auto", never: "Never" });
const liveStyle = named({ off: "Off", text: "Text", mini: "Mini", flash: "Flash" });
const confidence = named({ off: "Off", word: "Word", all: "All" });
const fit = named({ cover: "Cover", contain: "Contain", auto: "Auto", tile: "Tile" });
const UNIT_OF_MODE: Record<string, "words" | "time" | "quote"> = {
  WORDS: "words",
  TIME: "time",
  QUOTE: "quote",
};

const keyboardOn = (n: MtSettings) => n.appearance.keymap !== "off";

export const ROW_SPECS: readonly RowSpec[] = [
  {
    group: "test", slice: "practice", fields: ["mode", "length"], label: "Test",
    format: (n) => lengthLabel(UNIT_OF_MODE[n.practice.mode] ?? null, n.practice.length),
  },
  { group: "test", slice: "practice", fields: ["wordlist"], label: "Word list", format: (n) => wordlistLabel(n.practice.wordlist) },
  { group: "test", slice: "behaviour", fields: ["showSecondary"], label: "Numbers and punctuation", format: (n) => onOff(n.behaviour.showSecondary) },

  { group: "typing", slice: "caret", fields: ["style"], label: "Caret style", format: (n) => caretStyle(n.caret.style) },
  {
    group: "typing", slice: "caret", fields: ["smoothSpeed"], label: "Caret movement",
    format: (n) => movement(String(n.caret.smoothSpeed)),
    when: (n) => n.caret.style !== "off",
  },
  { group: "typing", slice: "appearance", fields: ["highlightMode"], label: "Highlight", format: (n) => highlight(n.appearance.highlightMode) },
  { group: "typing", slice: "appearance", fields: ["typedEffect"], label: "Typed words", format: (n) => effect(n.appearance.typedEffect) },
  { group: "typing", slice: "appearance", fields: ["tapeMode"], label: "Tape", format: (n) => tape(n.appearance.tapeMode) },
  {
    group: "typing", slice: "appearance", fields: ["tapeMargin"], label: "Caret position",
    format: (n) => `${n.appearance.tapeMargin}%`,
    when: (n) => n.appearance.tapeMode !== "off",
  },
  { group: "typing", slice: "appearance", fields: ["smoothLineScroll"], label: "Smooth scrolling", format: (n) => onOff(n.appearance.smoothLineScroll) },
  {
    group: "typing", slice: "appearance", fields: ["linesRendered"], label: "Lines shown",
    format: (n) => (n.appearance.linesRendered === 0 ? "All" : String(n.appearance.linesRendered)),
  },
  {
    group: "typing", slice: "appearance", fields: ["maxLineWidth"], label: "Line width",
    format: (n) => (n.appearance.maxLineWidth === 0 ? "Full" : `${n.appearance.maxLineWidth} characters`),
  },

  { group: "keyboard", slice: "appearance", fields: ["keymap"], label: "Show keyboard", format: (n) => keymap(n.appearance.keymap) },
  {
    group: "keyboard", slice: "appearance", fields: ["keymapLayout"], label: "Layout",
    format: (n) => LAYOUTS[n.appearance.keymapLayout as keyof typeof LAYOUTS]?.name ?? n.appearance.keymapLayout,
    when: keyboardOn,
  },
  { group: "keyboard", slice: "appearance", fields: ["keymapStyle"], label: "Key arrangement", format: (n) => arrangement(n.appearance.keymapStyle), when: keyboardOn },
  { group: "keyboard", slice: "appearance", fields: ["keymapLegend"], label: "Key labels", format: (n) => legend(n.appearance.keymapLegend), when: keyboardOn },
  { group: "keyboard", slice: "appearance", fields: ["keymapTopRow"], label: "Number row", format: (n) => topRow(n.appearance.keymapTopRow), when: keyboardOn },
  { group: "keyboard", slice: "appearance", fields: ["keymapSize"], label: "Size", format: (n) => `${n.appearance.keymapSize.toFixed(1)}×`, when: keyboardOn },
  { group: "keyboard", slice: "appearance", fields: ["keymapCompact"], label: "Letters only", format: (n) => onOff(n.appearance.keymapCompact), when: keyboardOn },

  { group: "stats", slice: "appearance", fields: ["liveProgressStyle"], label: "Timer", format: (n) => liveStyle(n.appearance.liveProgressStyle) },
  { group: "stats", slice: "appearance", fields: ["liveSpeedStyle"], label: "Speed", format: (n) => liveStyle(n.appearance.liveSpeedStyle) },
  { group: "stats", slice: "appearance", fields: ["liveAccuracyStyle"], label: "Accuracy", format: (n) => liveStyle(n.appearance.liveAccuracyStyle) },
  { group: "stats", slice: "appearance", fields: ["liveBurstStyle"], label: "Burst", format: (n) => liveStyle(n.appearance.liveBurstStyle) },
  { group: "stats", slice: "appearance", fields: ["liveStatsOpacity"], label: "Live stats opacity", format: (n) => percent(n.appearance.liveStatsOpacity) },
  { group: "stats", slice: "appearance", fields: ["typingSpeedUnit"], label: "Speed unit", format: (n) => n.appearance.typingSpeedUnit.toUpperCase() },
  { group: "stats", slice: "appearance", fields: ["alwaysShowDecimal"], label: "Always show decimals", format: (n) => onOff(n.appearance.alwaysShowDecimal) },
  { group: "stats", slice: "appearance", fields: ["startGraphsAtZero"], label: "Start graphs at zero", format: (n) => onOff(n.appearance.startGraphsAtZero) },

  { group: "behaviour", slice: "behaviour", fields: ["stopOnError"], label: "Stop on error", format: (n) => onOff(n.behaviour.stopOnError) },
  { group: "behaviour", slice: "behaviour", fields: ["confidence"], label: "Confidence mode", format: (n) => confidence(n.behaviour.confidence) },
  { group: "behaviour", slice: "behaviour", fields: ["strictSpace"], label: "Strict space", format: (n) => onOff(n.behaviour.strictSpace) },
  { group: "behaviour", slice: "behaviour", fields: ["blindMode"], label: "Blind mode", format: (n) => onOff(n.behaviour.blindMode) },
  { group: "behaviour", slice: "audio", fields: ["keypressClickEnabled"], label: "Key clicks", format: (n) => onOff(n.audio.keypressClickEnabled) },
  {
    group: "behaviour", slice: "audio", fields: ["keypressClickVolume"], label: "Click volume",
    format: (n) => `${n.audio.keypressClickVolume}%`,
    when: (n) => n.audio.keypressClickEnabled,
  },

  { group: "background", slice: "background", fields: ["imageUrl"], label: "Image link", format: (n) => n.background.imageUrl },
  { group: "background", slice: "background", fields: ["fit"], label: "Fit", format: (n) => fit(n.background.fit) },
  { group: "background", slice: "background", fields: ["opacity"], label: "Opacity", format: (n) => percent(n.background.opacity) },
  { group: "background", slice: "background", fields: ["blur"], label: "Blur", format: (n) => `${n.background.blur}px` },
  { group: "background", slice: "background", fields: ["darken"], label: "Darken", format: (n) => percent(n.background.darken) },
];

