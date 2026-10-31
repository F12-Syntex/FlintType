import { same } from "./mt-display";
import type { MtColours } from "./mt-theme";
import { bool, clamp, lookup, mtText, num, own, percentText, type MtCollector } from "./mt-values";

/** MonkeyType's live stats and result screen settings, mapped onto
 *  flinttype's. A mapped key whose value can't be used is listed, never
 *  dropped silently. Pure. */

const TIMER: Record<string, string> = {
  off: "off", text: "text", mini: "mini", flash_text: "flash", flash_mini: "flash",
};
const LIVE = same("off", "text", "mini", "flash");
const UNITS = same("wpm", "cpm", "wps", "cps", "wph");

function mapTimerColour(col: MtCollector, colours: MtColours | null): void {
  const colour = own(col.mt, "timerColor");
  if (typeof colour !== "string") return col.junk("timerColor", "Timer colour");
  // Main follows the accent, which is the imported Main.
  const hex = colour === "main" ? "" : colour === "black" ? "#000000"
    : colour === "sub" ? colours?.sub : colour === "text" ? colours?.text : undefined;
  if (hex !== undefined) {
    col.use("timerColor");
    col.slice("live", "appearance", "liveStatsColor", "Colour", mtText(colour), hex, {
      extra: { liveStatsColorPicked: true },
      ...(hex ? { swatch: hex } : {}),
    });
  } else if (colour === "sub" || colour === "text") {
    col.bad("timerColor", "Timer colour", "It follows your theme colours, which aren't in this file.");
  } else col.junk("timerColor", "Timer colour");
}

export function mapLiveStats(col: MtCollector, colours: MtColours | null): void {
  const { mt } = col;
  const timerId = own(mt, "timerStyle");
  const timer = lookup(TIMER, timerId);
  if (timer) {
    col.use("timerStyle");
    col.slice("live", "appearance", "liveProgressStyle", "Timer", mtText(timerId), timer);
  } else if (timerId === "bar") {
    col.bad("timerStyle", "Timer style", "The bar style isn't available.");
  } else col.junk("timerStyle", "Timer style");

  const pairs = [
    ["liveSpeedStyle", "liveSpeedStyle", "Speed", "Live speed style"],
    ["liveAccStyle", "liveAccuracyStyle", "Accuracy", "Live accuracy style"],
    ["liveBurstStyle", "liveBurstStyle", "Burst", "Live burst style"],
  ] as const;
  for (const [key, field, label, mtLabel] of pairs) {
    const v = lookup(LIVE, own(mt, key));
    if (!v) {
      col.junk(key, mtLabel);
      continue;
    }
    col.use(key);
    col.slice("live", "appearance", field, label, mtText(v), v);
  }

  mapTimerColour(col, colours);

  const opacity = num(mt, "timerOpacity");
  if (opacity !== undefined) {
    col.use("timerOpacity");
    const value = clamp(opacity, 0.1, 1);
    col.slice("live", "appearance", "liveStatsOpacity", "Opacity", percentText(opacity), value);
  } else col.junk("timerOpacity", "Timer opacity");
}

export function mapResult(col: MtCollector): void {
  const { mt } = col;
  const unit = lookup(UNITS, own(mt, "typingSpeedUnit"));
  if (unit) {
    col.use("typingSpeedUnit");
    col.slice("result", "appearance", "typingSpeedUnit", "Speed unit", unit.toUpperCase(), unit);
  } else col.junk("typingSpeedUnit", "Typing speed unit");

  const flags = [
    ["alwaysShowDecimalPlaces", "alwaysShowDecimal", "Always show decimals", "Always show decimal places"],
    ["startGraphsAtZero", "startGraphsAtZero", "Start graphs at zero", "Start graphs at zero"],
    ["burstHeatmap", "resultShowHeatmap", "Text heatmap", "Burst heatmap"],
  ] as const;
  for (const [key, field, label, mtLabel] of flags) {
    const v = bool(mt, key);
    if (v === undefined) {
      col.junk(key, mtLabel);
      continue;
    }
    col.use(key);
    col.slice("result", "appearance", field, label, mtText(v), v);
  }
}
