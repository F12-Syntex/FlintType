import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { dateShort, dateTime, plural, speed } from "@/lib/format-figure";

/** Copy for "Your speed over time" (spec-40 §3.5): the legend, the
 *  fields under the chart, the tooltip and the table twin. Pure, no JSX
 *  (trend-copy.test.ts).
 *
 *  Two things change what a dot is, and the copy follows them:
 *  - `adjusted`: Adapt speeds allow for passage difficulty, but personal
 *    bests are typed speeds, so the chart marks none (a best could sit
 *    mid-cloud) and the tooltip gives both figures.
 *    The pooled "All Adapt tests" view is `adjusted` too: its speeds are
 *    scaled for each test's length (`allowing`).
 *  - `daily`: above 150 tests the server sends one point a day, the
 *    middle of that day's tests (each personal best stays a test of its
 *    own), so those dots and rows are days, not tests. */
export type TrendView = {
  adjusted: boolean;
  daily: boolean;
  /** What the charted speed allows for, when `adjusted`. */
  allowing?: "difficulty" | "length" | "length and difficulty";
};

/** What the tooltip and the table need of a point. */
export type TrendPointCopy = {
  t: number; valueWpm: number; typedWpm: number; acc: number; pb: boolean; day: boolean;
  /** The usual-range band at this point, in wpm (trend-data.ts). */
  ref: readonly [number, number] | null;
};

export const RANGE_LABEL = "Range of the chart";
export const CHART_TOO_FEW = "Your chart appears after 2 tests.";
export const RANGE_EMPTY = "No tests in this range yet. Pick a longer range to see them.";
export const TABLE_SUMMARY = "Show as a table";
export const FIELD_TESTS = "Tests";
export const FIELD_FIRST = "First test";

export function legendLabels(v: TrendView): { median: string; band: string; test: string; pb: string } {
  return {
    median: "Typical speed",
    band: "Usual range",
    test: v.daily ? "Middle of a day's tests" : "One test",
    pb: "Personal best",
  };
}

/** The best figure is always a typed speed; say so when the chart isn't. */
export function fieldBest(v: TrendView): string {
  return v.adjusted ? "Best typed speed" : "Best";
}

/** With a single point in the range there is no trend to draw. */
export function rangeOne(v: TrendView): string {
  return `Only one ${v.daily ? "day" : "test"} in this range. Pick a longer range to see your trend.`;
}

export function chartLabel(v: TrendView): string {
  return v.daily
    ? "Your speed over time, one dot a day. The table below lists the same days."
    : "Your speed over time. The table below lists the same tests.";
}

export function tableCaption(v: TrendView): string {
  return v.daily
    ? "One row a day, showing the middle of that day's tests, newest first. A personal best gets a row of its own."
    : "Your most recent tests, newest first.";
}

export function tableHeaders(v: TrendView): { date: string; speed: string; typed: string; accuracy: string } {
  return { date: v.daily ? "Day" : "Date", speed: "Speed", typed: "Typed speed", accuracy: "Accuracy" };
}

/** A row's date cell: the day alone in the daily view. */
export function rowWhen(p: TrendPointCopy, v: TrendView): string {
  return v.daily ? dateShort(p.t) : dateTime(p.t);
}

/** The muted line under a personal best's date in the table. */
export function rowNote(p: TrendPointCopy, v: TrendView): string | null {
  if (!p.pb) return null;
  return v.adjusted ? "Typed personal best" : "Personal best";
}

/** Where a speed sits against the usual range as it stood then: the
 *  band drawn at that point, both on the chart's scale. "At the time"
 *  names the reference, since today's range (the verdict card's) can
 *  differ once your speed has moved. Nothing before the band starts. */
export function rangePosition(wpm: number, ref: readonly [number, number] | null): string | null {
  if (!ref) return null;
  if (wpm > ref[1]) return "Above your usual range at the time";
  if (wpm < ref[0]) return "Below your usual range at the time";
  return "Inside your usual range at the time";
}

/** The tooltip: when, the figure (both figures when adjusted), what the
 *  dot is when it isn't one test, then a best or where it sat against
 *  the usual range at the time. */
export function tooltipLines(
  p: TrendPointCopy,
  v: TrendView,
  unit: TypingSpeedUnit,
): { when: string; figure: string; notes: string[] } {
  const acc = `${Math.round(p.acc)}% accuracy`;
  const notes: string[] = [];
  let figure: string;
  if (v.adjusted) {
    figure = `${speed(p.valueWpm, unit)} allowing for ${v.allowing ?? "difficulty"}`;
    notes.push(`${speed(p.typedWpm, unit)} typed, ${acc}`);
  } else {
    figure = `${speed(p.valueWpm, unit)}, ${acc}`;
  }
  if (p.day) notes.push("The middle of that day's tests");
  const where = p.pb ? (v.adjusted ? "A personal best for typed speed" : "A personal best") : rangePosition(p.valueWpm, p.ref);
  if (where) notes.push(where);
  return { when: p.day ? dateShort(p.t) : dateTime(p.t), figure, notes };
}

/** Shown under the chart while the trend reads levelled off. */
export function plateauLine(usual: number, weeks: number, unit: TypingSpeedUnit): string {
  return `Your speed has held around ${speed(usual, unit)} for about ${plural(weeks, "week", "weeks")}. A different word list or a longer test is a good way to move again.`;
}
