import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { oneIn, seconds, speed, speedRange } from "@/lib/format-figure";
import { formatSpeed } from "@/lib/speed-unit";
import { formatTestName } from "@/lib/test-name";
import type { BarrierDetail, Gate, InsightsBucket, Range } from "@/types/insights";

/** Phrase builders shared by the /insights copy modules. Pure, no JSX;
 *  every figure goes through `@/lib/format-figure` (ui-law §27). */

/** How the page names the kind of test it is about: the singular noun
 *  ("Adapt test of 25 words") and the plural group ("Adapt tests of 25
 *  words"). With no bucket yet, a generic "test of the same kind". */
export type TestKind = { noun: string; group: string };

export function testKindOf(bucket: InsightsBucket | null): TestKind {
  if (!bucket) return { noun: "test of the same kind", group: "tests of the same kind" };
  const n = formatTestName({
    mode: bucket.mode,
    lengthMode: bucket.lengthMode,
    length: bucket.length,
    touch: bucket.touch,
  });
  // The touch suffix lives on the group only; the noun gets it too, so a
  // singular count names the same kind.
  return { noun: bucket.touch ? `${n.noun} on a touch screen` : n.noun, group: n.group };
}

/** How many more a gate is waiting for (at least 1 while it is shut). */
export function remaining(gate: Gate): number {
  return Math.max(1, Math.ceil(gate.need - gate.have));
}

/** "1 more Adapt test of 25 words", "3 more Adapt tests of 25 words". */
export function moreOf(k: number, kind: TestKind): string {
  return k === 1 ? `1 more ${kind.noun}` : `${k} more ${kind.group}`;
}

/** "the one Adapt test of 25 words", "the 3 Adapt tests of 25 words". */
export function countOf(n: number, kind: TestKind): string {
  return n === 1 ? `one ${kind.noun}` : `${n} ${kind.group}`;
}

const HALF = 0.5;

/** Seconds a minute as a phrase that reads after "takes" or "for":
 *  "about 4.5 seconds of every minute", "under half a second of every
 *  minute". Avoids "seconds a minute of every minute". */
export function ofEveryMinute(s: number): string {
  return s < HALF ? "under half a second of every minute" : `about ${seconds(s * 1000)} of every minute`;
}

/** A per-minute figure standing alone: "about 1.2 seconds", "under half a second". */
export function aboutSeconds(s: number): string {
  return s < HALF ? "under half a second" : `about ${seconds(s * 1000)}`;
}

/** Upper-cases the first letter of a phrase that opens a sentence. */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A share of words: "about 1 in 5 words", "about half your words",
 *  "almost all your words", "fewer than 1 in 100 words". */
export function shareOf(rate: number, noun: string): string {
  const s = oneIn(rate);
  if (s === "about half") return `about half your ${noun}`;
  if (s === "almost all") return `almost all your ${noun}`;
  if (s.startsWith("fewer")) return `${s} ${noun}`;
  return `about ${s} ${noun}`;
}

/** A speed gain as a phrase after "worth": "about 3 to 5 wpm", "about
 *  4 wpm", "up to about 2 wpm", "less than 1 wpm". */
export function worthPhrase(gain: Range, unit: TypingSpeedUnit): string {
  const lo = Math.min(gain.low, gain.high);
  const hi = Math.max(gain.low, gain.high);
  const zero = formatSpeed(0, unit);
  if (formatSpeed(hi, unit) === zero) return `less than ${speed(1, unit)}`;
  if (formatSpeed(lo, unit) === zero) return `up to about ${speed(hi, unit)}`;
  return speedRange(lo, hi, unit);
}

/** A speed difference: "4 wpm", in the user's unit. */
export function speedDelta(wpm: number, unit: TypingSpeedUnit): string {
  return speed(Math.abs(wpm), unit);
}

const ONE_DP = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** A rate to one decimal: "1.5", "0.8", "2". */
export function oneDecimal(n: number): string {
  return ONE_DP.format(n);
}

/** The earlier mistake rate after "up from": "about 0.8" (or "0.8"
 *  without `about`), and "almost none" when it rounds to 0, as it does
 *  after an error-free stretch. Never a zero figure. */
export function earlierRate(n: number, o: { about: boolean }): string {
  const s = oneDecimal(n);
  if (s === "0") return "almost none";
  return o.about ? `about ${s}` : s;
}

/** True only when each fix now costs more keys' worth of time than
 *  usual. The server rounds `costKeys`, so equal means unchanged. The
 *  "cost" variant is also the fallback when the mistake rate test does
 *  not pass, so copy may call fixing slower only when this holds. */
export function fixCostRose(d: BarrierDetail): boolean {
  return !!d.costKeys && d.costKeys[0] > d.costKeys[1];
}
