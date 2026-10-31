import type { Mt } from "./mt-values";

/** MonkeyType's own conversions for settings saved by older versions
 *  (its `replaceLegacyValues` in frontend/src/ts/config/utils.ts), run
 *  before mapping so an old export reads the way MonkeyType reads it.
 *  Keys that only exist in old files are folded into their new form
 *  and dropped. Pure: the file object is never changed. */

/** Settings that only old MonkeyType files have. */
export const LEGACY_KEYS: ReadonlySet<string> = new Set([
  "quickTab", "swapEscAndTab", "alwaysShowCPM", "showTimerProgress",
  "showLiveWpm", "showLiveBurst", "showLiveAcc", "keymapShowTopRow",
]);

const has = (o: object, k: string) => Object.hasOwn(o, k);

function liveStyle(out: Record<string, unknown>, legacy: string, key: string): void {
  if (out[legacy] !== true || has(out, key)) return;
  const timer = out.timerStyle;
  out[key] = typeof timer === "string" && timer !== "bar" && timer !== "off" ? timer : "mini";
}

/** Old string font sizes: "125" and "15" meant 1.25 and 1.5 rem. */
function fontSize(v: string): number {
  if (v === "125") return 1.25;
  if (v === "15") return 1.5;
  return Number.parseInt(v, 10);
}

export function migrateLegacy(mt: Mt): Mt {
  const out: Record<string, unknown> = { ...mt };
  if (out.quickTab === true && !has(out, "quickRestart")) out.quickRestart = "tab";
  if (out.swapEscAndTab === true && !has(out, "quickRestart")) out.quickRestart = "esc";
  if (typeof out.smoothCaret === "boolean") out.smoothCaret = out.smoothCaret ? "medium" : "off";
  if (out.alwaysShowCPM === true && !has(out, "typingSpeedUnit")) out.typingSpeedUnit = "cpm";
  if (out.showTimerProgress === false && !has(out, "timerStyle")) out.timerStyle = "off";
  liveStyle(out, "showLiveWpm", "liveSpeedStyle");
  liveStyle(out, "showLiveBurst", "liveBurstStyle");
  liveStyle(out, "showLiveAcc", "liveAccStyle");
  if (typeof out.playSoundOnError === "boolean") out.playSoundOnError = out.playSoundOnError ? "1" : "off";
  if (typeof out.indicateTypos === "boolean") out.indicateTypos = out.indicateTypos ? "replace" : "off";
  if (typeof out.funbox === "string") out.funbox = out.funbox === "none" ? [] : out.funbox.split("#");
  if (typeof out.customLayoutfluid === "string") out.customLayoutfluid = out.customLayoutfluid.split("#");
  if (typeof out.fontSize === "string") out.fontSize = fontSize(out.fontSize);
  else if (typeof out.fontSize === "number" && out.fontSize < 0) out.fontSize = 1;
  // Nine colours: saved before sub alt existed, which MonkeyType fills with black.
  if (Array.isArray(out.customThemeColors) && out.customThemeColors.length === 9) {
    const colours = [...out.customThemeColors];
    colours.splice(4, 0, "#000000");
    out.customThemeColors = colours;
  }
  if (Array.isArray(out.customBackgroundFilter) && out.customBackgroundFilter.length === 5) {
    out.customBackgroundFilter = out.customBackgroundFilter.slice(0, 4);
  }
  if (typeof out.quoteLength === "number") {
    out.quoteLength = out.quoteLength === -1 ? [0, 1, 2, 3] : [out.quoteLength];
  }
  if (out.showAverage === "wpm") out.showAverage = "speed";
  // MonkeyType's own bounds: the tape caret sits 10% to 90% across, and
  // a line width other than 0 (full) is 20 to 1,000 characters.
  if (typeof out.tapeMargin === "number") out.tapeMargin = Math.min(Math.max(out.tapeMargin, 10), 90);
  if (typeof out.maxLineWidth === "number" && out.maxLineWidth !== 0) {
    out.maxLineWidth = Math.min(Math.max(out.maxLineWidth, 20), 1000);
  }
  if (has(out, "keymapShowTopRow") && !has(out, "keymapKeys")) {
    const row = out.keymapShowTopRow;
    if (row === "always") out.keymapKeys = "minimal_numrow";
    else if (row === "never" || row === "layout") out.keymapKeys = "minimal";
  }
  for (const k of LEGACY_KEYS) delete out[k];
  return out;
}
