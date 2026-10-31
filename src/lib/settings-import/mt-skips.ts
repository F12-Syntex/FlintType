import type { SkippedItem, SkipReason } from "@/types/settings-import";
import { LEGACY_KEYS } from "./mt-legacy";
import { sameJson } from "./plan";
import type { MtColours } from "./mt-theme";
import { lookup, mtText, own, str, type Mt } from "./mt-values";

/** MonkeyType settings flinttype doesn't import, each with a plain
 *  reason. A setting is listed only when the file changes it from
 *  MonkeyType's default, so the list shows what the user chose, not
 *  every key MonkeyType saves. Labels are MonkeyType's names, and never
 *  repeat a flinttype row's name ("MonkeyType's strict space"). Pure. */

type Skip = { label: string; reason: SkipReason; note?: string; default: unknown };

const MIN_NOTE = "Failing a test below a set speed or accuracy isn't available.";
const FUNBOX_NOTE = "Funbox modes aren't available.";
const PACE_NOTE = "A pace caret isn't available.";
const THEME_SWITCH_NOTE = "Use the Light, Dark and System switch under Theme.";
const SHOW_NOTE = "Your average and best are on Insights and your profile.";

const skip = (label: string, reason: SkipReason, dflt: unknown, note?: string): Skip => ({
  label, reason, default: dflt, ...(note ? { note } : {}),
});

/** Every MonkeyType key that isn't mapped, with MonkeyType's default. */
export const SKIPS: Readonly<Record<string, Skip>> = {
  quickRestart: skip("Quick restart", "own-way", "off", "Tab always restarts a test."),
  freedomMode: skip("Freedom mode", "own-way", false, "You can go back only into a word with a mistake."),
  strictSpace: skip("MonkeyType's strict space", "own-way", false, "Here, Strict space is set from your Stop on error setting instead."),
  quickEnd: skip("Quick end", "own-way", false, "The test ends when you type the last letter of the last word right. Otherwise press space."),
  indicateTypos: skip("Indicate typos", "own-way", "off", "The letter you typed always shows in place of the right one."),
  hideExtraLetters: skip("Hide extra letters", "own-way", false, "Extra letters always show. Turn off Allow extra letters to ignore them."),
  singleListCommandLine: skip("Single list command line", "own-way", "on", "The command palette always works the same way."),
  layout: skip("Layout emulator", "own-way", "default", "Keys aren't remapped, so set your layout on your computer."),
  alwaysShowWordsHistory: skip("Always show words history", "own-way", false, "The text heatmap is its own card on the result screen."),
  autoSwitchTheme: skip("Auto switch theme", "own-way", false, THEME_SWITCH_NOTE),
  themeLight: skip("Light theme", "own-way", "serika", THEME_SWITCH_NOTE),
  themeDark: skip("Dark theme", "own-way", "serika_dark", THEME_SWITCH_NOTE),
  showKeyTips: skip("Key tips", "own-way", true, "The Tab hint always shows."),
  showAverage: skip("Show average", "own-way", "off", SHOW_NOTE),
  showPb: skip("Show personal best", "own-way", false, SHOW_NOTE),
  difficulty: skip("Difficulty", "not-in-flinttype", "normal", "Expert and master aren't available. The sudden death drill is the closest."),
  oppositeShiftMode: skip("Opposite shift mode", "not-in-flinttype", "off"),
  deleteOnError: skip("Delete on error", "not-in-flinttype", "off"),
  lazyMode: skip("Lazy mode", "not-in-flinttype", false),
  britishEnglish: skip("British English", "not-in-flinttype", false, "British spellings aren't swapped in."),
  repeatQuotes: skip("Repeat quotes", "not-in-flinttype", "off"),
  compositionDisplay: skip("Composition display", "not-in-flinttype", "replace"),
  codeUnindentOnBackspace: skip("Code unindent on backspace", "not-in-flinttype", false),
  capsLockWarning: skip("Caps Lock warning", "not-in-flinttype", true),
  showOutOfFocusWarning: skip("Out of focus warning", "not-in-flinttype", true),
  playSoundOnError: skip("Error sound", "not-in-flinttype", "off"),
  playTimeWarning: skip("Time warning", "not-in-flinttype", "off"),
  randomTheme: skip("Random theme", "not-in-flinttype", "off"),
  funbox: skip("Funbox", "not-in-flinttype", [], FUNBOX_NOTE),
  customLayoutfluid: skip("Layoutfluid layouts", "not-in-flinttype", ["qwerty", "dvorak", "colemak"], FUNBOX_NOTE),
  customPolyglot: skip("Polyglot languages", "not-in-flinttype", ["english", "spanish", "french", "german"], FUNBOX_NOTE),
  paceCaret: skip("Pace caret", "not-in-flinttype", "off", PACE_NOTE),
  paceCaretCustomSpeed: skip("Pace caret speed", "not-in-flinttype", 100, PACE_NOTE),
  paceCaretStyle: skip("Pace caret style", "not-in-flinttype", "default", PACE_NOTE),
  repeatedPace: skip("Repeated pace", "not-in-flinttype", true, PACE_NOTE),
  minWpm: skip("Minimum speed", "not-in-flinttype", "off", MIN_NOTE),
  minWpmCustomSpeed: skip("Minimum speed value", "not-in-flinttype", 100, MIN_NOTE),
  minAcc: skip("Minimum accuracy", "not-in-flinttype", "off", MIN_NOTE),
  minAccCustom: skip("Minimum accuracy value", "not-in-flinttype", 90, MIN_NOTE),
  minBurst: skip("Minimum burst", "not-in-flinttype", "off", MIN_NOTE),
  minBurstCustomSpeed: skip("Minimum burst value", "not-in-flinttype", 100, MIN_NOTE),
};

/** Saved by MonkeyType for its own account features: never listed. */
const HIDDEN = new Set([
  "ads", "resultSaving", "accountChart", "favThemes", "monkey", "monkeyPowerLevel",
]);

/** Every MonkeyType key: the skip table plus the keys the mappers read
 *  (or that only feed them). Used to tell a MonkeyType file apart. */
export const MT_KNOWN_KEYS: ReadonlySet<string> = new Set([
  ...Object.keys(SKIPS), ...HIDDEN, ...LEGACY_KEYS, "theme", "customTheme", "customThemeColors",
  "flipTestColors", "colorfulMode", "fontFamily", "fontSize", "smoothCaret", "caretStyle",
  "highlightMode", "typedEffect", "tapeMode", "tapeMargin", "showAllLines", "maxLineWidth",
  "smoothLineScroll", "keymapMode", "keymapLayout", "keymapStyle", "keymapLegendStyle",
  "keymapKeys", "keymapSize", "timerStyle", "liveSpeedStyle", "liveAccStyle", "liveBurstStyle",
  "timerColor", "timerOpacity", "typingSpeedUnit", "alwaysShowDecimalPlaces",
  "startGraphsAtZero", "burstHeatmap", "stopOnError", "confidenceMode", "blindMode",
  "playSoundOnClick", "soundVolume", "mode", "words", "time", "quoteLength", "language",
  "punctuation", "numbers", "customBackground", "customBackgroundSize", "customBackgroundFilter",
]);

/** What isn't imported, given the keys the mappers used. A custom
 *  theme's colours with no slot here are part of an imported setting, so
 *  they're said in the Colours group's note (`colourNotes`), never here. */
export function mtSkipped(mt: Mt, used: ReadonlySet<string>, colours: MtColours | null): SkippedItem[] {
  const out: SkippedItem[] = [];
  // MonkeyType ignores the named theme while the custom theme is on.
  const theme = own(mt, "customTheme") === true ? undefined : str(mt, "theme");
  if (!colours && theme !== undefined && theme !== "serika_dark") {
    out.push({
      key: "theme",
      label: "Theme",
      value: mtText(theme),
      reason: "not-in-flinttype",
      note: "MonkeyType's named themes aren't available. Pick a palette under Theme to match it.",
    });
  }
  let unknown = 0;
  for (const [key, value] of Object.entries(mt)) {
    if (!MT_KNOWN_KEYS.has(key)) {
      unknown += 1;
      continue;
    }
    const s = lookup(SKIPS, key);
    if (!s || used.has(key) || sameJson(value, s.default)) continue;
    out.push({ key, label: s.label, value: mtText(value), reason: s.reason, ...(s.note ? { note: s.note } : {}) });
  }
  if (unknown > 0) out.push(unknownSummary(unknown));
  return out;
}

/** Settings this version doesn't know, as one line rather than a list
 *  a strange file could make endless. */
function unknownSummary(n: number): SkippedItem {
  const one = n === 1;
  return {
    key: "unrecognised",
    label: `${n} ${one ? "setting" : "settings"}`,
    reason: "unrecognised",
    count: n,
    note: one ? "It may come from a newer version of MonkeyType." : "They may come from a newer version of MonkeyType.",
  };
}
