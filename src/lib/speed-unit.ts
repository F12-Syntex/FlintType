import type { TypingSpeedUnit } from "./appearance-prefs";

/** Convert a WPM number to whatever unit the user picked.
 *
 *  - WPM: words / minute (no change)
 *  - CPM: chars / minute (× 5, since WPM is defined as 5-char words)
 *  - WPS: words / second
 *  - CPS: chars / second
 *  - WPH: words / hour
 */
export function convertSpeed(wpm: number, unit: TypingSpeedUnit): number {
  switch (unit) {
    case "wpm":
      return wpm;
    case "cpm":
      return wpm * 5;
    case "wps":
      return wpm / 60;
    case "cps":
      return (wpm * 5) / 60;
    case "wph":
      return wpm * 60;
  }
}

/** Format a converted value with sensible defaults: integer for big
 *  numbers, one decimal for small ones — and an optional override that
 *  forces decimals (matches the "always show decimal places" pref). */
export function formatSpeed(
  wpm: number,
  unit: TypingSpeedUnit,
  alwaysDecimal = false,
): string {
  const v = convertSpeed(wpm, unit);
  if (alwaysDecimal) return v.toFixed(unit === "wps" || unit === "cps" ? 2 : 1);
  if (unit === "wps" || unit === "cps") return v.toFixed(2);
  return Math.round(v).toString();
}

export const SPEED_UNIT_LABEL: Record<TypingSpeedUnit, string> = {
  wpm: "wpm",
  cpm: "cpm",
  wps: "wps",
  cps: "cps",
  wph: "wph",
};
