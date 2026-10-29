import { perMinute } from "@/lib/format-figure";
import type { Gate, RangeSummary } from "@/types/insights";
import { FRICTION_ORDER, type FixMode, type FrictionKey, type RunAnalysis } from "@/types/typing-analysis";

/** Every string in "Compared with your usual" (spec-50 §4.4), and the
 *  rule that picks its one slice line. Pure; tested for I11. */

export const COMPARE_HEADING = "Compared with your usual";
export const LOAD_ERROR = "Couldn't load your usual.";
/** The anonymous line reads "Sign in" (the link) followed by this. */
export const SIGN_IN_TAIL = " to compare each test with your usual.";

export const ADAPT_NOTE =
  "Adapt picks harder or easier words depending on your recent form, so one test can land outside your range for that reason alone.";

/** Which tests the comparison is against: "Against your previous 30
 *  Adapt tests of 25 words." `group` is `formatTestName(...).group`. */
export function referenceLine(r: { kind: "usual" | "earlier-today"; n: number }, group: string): string {
  return r.kind === "earlier-today"
    ? `Against your ${r.n} earlier ${group} today.`
    : `Against your previous ${r.n} ${group}.`;
}

export type RangePhrase = "Inside your usual range" | "Above your usual range" | "Below your usual range";

/** Where a value sits against a usual range. A label, so no full stop. */
export function rangePhrase(value: number, range: RangeSummary): RangePhrase {
  if (value > range.high) return "Above your usual range";
  if (value < range.low) return "Below your usual range";
  return "Inside your usual range";
}

/** The `RangeTrack`'s spoken label. "between … and …" rather than "… to
 *  …": an accuracy range would otherwise read "96% to 98%" (ui-law §27).
 *  One number only when both ends print alike, the same test the track
 *  uses for its visible label, so the two never disagree. */
export function rangeLabel(
  kind: "speed" | "accuracy",
  range: RangeSummary,
  value: number,
  fmt: (n: number) => string,
): string {
  const low = fmt(range.low);
  const high = fmt(range.high);
  const usual = low === high ? `about ${fmt(range.mid)}` : `between ${low} and ${high}`;
  return `Your usual ${kind} is ${usual}, and this test was ${fmt(value)}.`;
}

/** Shown until the bucket has enough tests to compare against. */
export function learningLine(gate: Gate, noun: string, group: string): string {
  const k = Math.max(1, Math.round(gate.need - gate.have));
  return k === 1
    ? `After 1 more ${noun} you'll see how this test compares with your usual.`
    : `After ${k} more ${group} you'll see how this test compares with your usual.`;
}

const SLICE_NAME: Record<FrictionKey, string> = {
  fixing: "Fixing mistakes",
  before: "Pauses before words",
  inside: "Hesitations inside words",
};

/** The one slice line: this test's seconds a minute, then the usual. */
export function sliceLines(key: FrictionKey, thisPerMin: number, usualPerMin: number): { lead: string; follow: string } {
  return {
    lead: `${SLICE_NAME[key]} took ${perMinute(thisPerMin)} in this test.`,
    follow: `Usually it takes ${perMinute(usualPerMin)}.`,
  };
}

/** A part has to differ from the usual by at least this (seconds a minute). */
export const SLICE_MIN_DIFF = 1.5;
const SLICE_MIN_INTERVALS = 15;
const SLICE_MIN_MS = 10_000;

/** The friction part that differs most from the usual, or null (spec-50
 *  §3.7): only on a whole, well-paced test of 10 s or more, and never
 *  Fixing with backspace off. */
export function sliceLineFor(a: {
  analysis: Pick<RunAnalysis, "perMinute" | "pace" | "quality" | "T">;
  usual: Record<FrictionKey, number> | null | undefined;
  fixMode: FixMode;
}): { key: FrictionKey; thisPerMin: number; usualPerMin: number } | null {
  const { analysis, usual } = a;
  if (!usual || !analysis.perMinute || !analysis.pace) return null;
  if (analysis.pace.intervals < SLICE_MIN_INTERVALS || analysis.quality.partial || analysis.T < SLICE_MIN_MS) return null;
  let best: { key: FrictionKey; thisPerMin: number; usualPerMin: number; d: number } | null = null;
  for (const key of FRICTION_ORDER) {
    if (key === "fixing" && a.fixMode === "none") continue;
    const here = analysis.perMinute[key];
    const there = usual[key];
    if (!Number.isFinite(here) || !Number.isFinite(there)) continue;
    const d = Math.abs(here - there);
    if (!best || d > best.d) best = { key, thisPerMin: here, usualPerMin: there, d };
  }
  if (!best || best.d < SLICE_MIN_DIFF) return null;
  return { key: best.key, thisPerMin: best.thisPerMin, usualPerMin: best.usualPerMin };
}
