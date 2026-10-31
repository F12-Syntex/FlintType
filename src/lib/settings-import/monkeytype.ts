import type { CurrentSettings, ImportPlan, SkipReason } from "@/types/settings-import";
import { mapBackground, mapInput, mapSound, mapTestSetup } from "./mt-behaviour";
import { migrateLegacy } from "./mt-legacy";
import { mapCaret, mapKeyboard, mapTypingArea } from "./mt-display";
import { mapLiveStats, mapResult } from "./mt-stats";
import { MT_KNOWN_KEYS, mtSkipped } from "./mt-skips";
import { customColours, mapThemeAndFont, type MtColours } from "./mt-theme";
import { MT_GROUPS, MtCollector, own, type Mt } from "./mt-values";
import { buildGroups, tallySettings } from "./plan";

/** Plan a MonkeyType settings import against the user's current
 *  settings. Pure: nothing is written until the plan is applied. */

/** How many MonkeyType keys an object has: two or more reads as a
 *  MonkeyType settings file. */
export function monkeytypeKeyCount(v: unknown): number {
  if (!v || typeof v !== "object" || Array.isArray(v)) return 0;
  return Object.keys(v).filter((k) => MT_KNOWN_KEYS.has(k)).length;
}

/** Skipped settings, ordered: values that couldn't be used, then what
 *  flinttype does its own way, then what it doesn't have. */
const REASON_ORDER: readonly SkipReason[] = ["bad-value", "own-way", "not-in-flinttype", "unrecognised"];

/** Run every mapper over a file already read the way MonkeyType reads
 *  it (`migrateLegacy`): what it sets, what it can't, and which of its
 *  keys set something. */
export function collectMonkeytype(payload: Mt, current: CurrentSettings): { col: MtCollector; colours: MtColours | null } {
  const col = new MtCollector(payload);
  const colours = customColours(payload);
  if (own(payload, "customTheme") === true && !colours) {
    // Listed as the custom theme, which is what can't be imported.
    col.bad("customTheme", "Custom theme", "Some of its colours couldn't be read.", "Custom");
  }
  mapThemeAndFont(col, colours);
  mapBackground(col, current.uploadedImage === true);
  mapCaret(col);
  mapTypingArea(col);
  mapKeyboard(col);
  mapLiveStats(col, colours);
  mapResult(col);
  mapInput(col);
  mapSound(col);
  mapTestSetup(col, current.slices.practice);
  return { col, colours };
}

export function planMonkeytype(
  file: Mt,
  current: CurrentSettings,
  fileLabel: string | null,
): ImportPlan {
  // Read an old file the way MonkeyType itself would.
  const payload = migrateLegacy(file);
  const { col, colours } = collectMonkeytype(payload, current);
  const skipped = [...col.skipped, ...mtSkipped(payload, col.used, colours)]
    .sort((a, b) => REASON_ORDER.indexOf(a.reason) - REASON_ORDER.indexOf(b.reason));
  const settingsInFile = Object.keys(file).length;
  return {
    source: "monkeytype",
    fileLabel,
    settingsInFile,
    tally: tallySettings(Object.keys(payload), col.used, skipped, settingsInFile),
    groups: buildGroups(MT_GROUPS, col.out, current, col.notes),
    skipped,
  };
}
