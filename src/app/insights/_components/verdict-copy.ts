import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { speed } from "@/lib/format-figure";
import { formatSpeed } from "@/lib/speed-unit";
import type { SpeedHeadline } from "@/types/insights";
import { cap, moreOf, type TestKind } from "./copy-phrases";
import { READY_TESTS } from "./insights-copy";

/** The verdict card's speed column (spec-40 §3.1): its label, the
 *  sentence under the hero and the range track's spoken label. Pure,
 *  no JSX (verdict-copy.test.ts). */

export function speedLabel(ready: boolean): string {
  return ready ? "Your usual speed" : "Your last test";
}

/** The sentence under the hero: the usual range, or how many tests are
 *  left before there is one. A range whose ends round alike reads as
 *  one figure. */
export function rangeSentence(h: SpeedHeadline, unit: TypingSpeedUnit, kind: TestKind, tests: number): string {
  const r = h.range;
  if (!r) return `${cap(moreOf(Math.max(1, READY_TESTS - tests), kind))} to see your usual range.`;
  const one = formatSpeed(r.low, unit) === formatSpeed(r.high, unit);
  const mid = speed((r.low + r.high) / 2, unit);
  if (r.rule === "min-max") {
    return one
      ? `Your last ${r.n} tests were all about ${mid}.`
      : `Your last ${r.n} tests ranged from ${formatSpeed(r.low, unit)} to ${speed(r.high, unit)}.`;
  }
  const land = one ? `at about ${mid}` : `between ${formatSpeed(r.low, unit)} and ${speed(r.high, unit)}`;
  return `Most of your tests land ${land}. Your last one was ${speed(h.last, unit)}.`;
}

/** What a screen reader hears for the range track. */
export function rangeTrackLabel(h: SpeedHeadline, unit: TypingSpeedUnit): string {
  const r = h.range;
  const last = `Your last test ${speed(h.last, unit)}.`;
  if (!r) return last;
  const one = formatSpeed(r.low, unit) === formatSpeed(r.high, unit);
  const usual = one
    ? `Usual range about ${speed((r.low + r.high) / 2, unit)}.`
    : `Usual range ${formatSpeed(r.low, unit)} to ${speed(r.high, unit)}.`;
  return `${usual} ${last}`;
}
