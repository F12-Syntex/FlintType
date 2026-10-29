import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import type { FixMode, SliceKey } from "@/types/typing-analysis";

/** Figures in units people feel (ui-law §27 rule 2): seconds, counts,
 *  "1 in 5", "about as long as typing 4 letters". Isomorphic and pure;
 *  every helper reads junk (NaN, ±Infinity) as 0, and durations below 0
 *  as 0, so a bad input never prints "NaN" in a sentence. */

const finite = (x: number): number => (Number.isFinite(x) ? x : 0);
const COUNT = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** "1,240", "4.5": counts in UK grouping, at most one decimal. */
function count(n: number): string {
  return COUNT.format(finite(n));
}

/** The seconds figure: one decimal under 10 s ("0.4", "9.6"), whole
 *  from 10 s ("12"), and a trailing ".0" dropped ("9", "1"). */
function secondsFigure(ms: number): string {
  const s = Math.max(0, finite(ms)) / 1000;
  const tenths = Math.round(s * 10);
  if (tenths < 100) return tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
  return count(Math.round(s));
}

/** "0.4 seconds", "12 seconds", "1 second". */
export function seconds(ms: number): string {
  const fig = secondsFigure(ms);
  return `${fig} ${fig === "1" ? "second" : "seconds"}`;
}

/** "0.4 s", "12 s", "0 s". */
export function secShort(ms: number): string {
  return `${secondsFigure(ms)} s`;
}

/** Seconds per minute: "4.5 seconds a minute", "under half a second a minute". */
export function perMinute(s: number): string {
  const v = finite(s);
  if (v < 0.5) return "under half a second a minute";
  return `${seconds(v * 1000)} a minute`;
}

/** A per-key time: "0.14 s" under a second, "1.4 s" from a second. */
export function perKey(ms: number): string {
  const v = Math.max(0, finite(ms));
  return Math.round(v / 10) < 100 ? `${(v / 1000).toFixed(2)} s` : `${(v / 1000).toFixed(1)} s`;
}

const ONE_IN_LADDER = [2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50, 100] as const;

/** A rate as "1 in N" on a fixed ladder (nearest step in ratio terms).
 *  From 0.45 it reads "about half"; past 0.6 it climbs "2 in 3", "3 in 4",
 *  "4 in 5", "9 in 10" and "almost all", so a high rate is never
 *  understated as half. */
export function oneIn(rate: number): string {
  const r = finite(rate);
  if (r < 0.01) return "fewer than 1 in 100";
  if (r >= 0.95) return "almost all";
  if (r >= 0.87) return "9 in 10";
  if (r >= 0.78) return "4 in 5";
  if (r >= 0.7) return "3 in 4";
  if (r >= 0.6) return "2 in 3";
  if (r >= 0.45) return "about half";
  const target = Math.log(1 / r);
  let best: number = ONE_IN_LADDER[0];
  for (const step of ONE_IN_LADDER) {
    if (Math.abs(Math.log(step) - target) < Math.abs(Math.log(best) - target)) best = step;
  }
  return `1 in ${best}`;
}

/** A duration ratio in words: "about twice as long as". */
export function asLongAs(ratio: number): string {
  const r = finite(ratio);
  if (r < 1.2) return "about as long as";
  if (r < 1.4) return "a bit longer than";
  if (r < 1.8) return "about one and a half times as long as";
  if (r < 2.3) return "about twice as long as";
  return "more than twice as long as";
}

/** "typing 4 letters", "typing 1 letter" (rounded, at least 1). */
export function keysWorth(k: number): string {
  const n = Math.max(1, Math.round(finite(k)));
  return `typing ${count(n)} ${n === 1 ? "letter" : "letters"}`;
}

/** "72 wpm", in the user's unit. */
export function speed(wpm: number, unit: TypingSpeedUnit, decimals = false): string {
  return `${formatSpeed(finite(wpm), unit, decimals)} ${SPEED_UNIT_LABEL[unit]}`;
}

/** "about 77 to 81 wpm", or "about 79 wpm" when both ends round alike. */
export function speedRange(lo: number, hi: number, unit: TypingSpeedUnit, decimals = false): string {
  const [a, b] = [finite(lo), finite(hi)].sort((x, y) => x - y);
  const low = formatSpeed(a, unit, decimals);
  const high = formatSpeed(b, unit, decimals);
  if (low === high) return `about ${formatSpeed((a + b) / 2, unit, decimals)} ${SPEED_UNIT_LABEL[unit]}`;
  return `about ${low} to ${high} ${SPEED_UNIT_LABEL[unit]}`;
}

/** Calendar day number in the runtime's own time zone. */
function dayNumber(ms: number): number {
  const d = new Date(ms);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long" });

/** How long ago, in calendar days: "earlier today", "yesterday",
 *  "3 days ago", "2 weeks ago", "about a month ago", "in August" (with
 *  the year when it isn't this year's). A future time reads as today. */
export function ago(ms: number, nowMs: number): string {
  const days = Math.max(0, dayNumber(finite(nowMs)) - dayNumber(finite(ms)));
  if (days === 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 25) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days <= 45) return "about a month ago";
  const then = new Date(finite(ms));
  const sameYear = then.getFullYear() === new Date(finite(nowMs)).getFullYear();
  return `in ${MONTH.format(then)}${sameYear ? "" : ` ${then.getFullYear()}`}`;
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();
function dateFormat(key: string, locale: string | undefined, o: Intl.DateTimeFormatOptions) {
  const id = `${key}:${locale ?? ""}`;
  const f = dateFormats.get(id) ?? new Intl.DateTimeFormat(locale, o);
  dateFormats.set(id, f);
  return f;
}

/** "27 Oct", in the user's locale (pass `locale` to pin it). */
export function dateShort(ms: number, locale?: string): string {
  return dateFormat("short", locale, { day: "numeric", month: "short" }).format(finite(ms));
}

/** "Tue 27 Oct, 14:05", in the user's locale (pass `locale` to pin it). */
export function dateTime(ms: number, locale?: string): string {
  return dateFormat("time", locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(finite(ms));
}

/** "w, s and x". */
export function list(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** "1 mistake", "3 mistakes", "1,240 tests". The form follows the printed
 *  count, so 1.04 reads "1 test", never "1 tests". */
export function plural(n: number, one: string, many: string): string {
  const text = count(n);
  return `${text} ${text === "1" ? one : many}`;
}

/** The break threshold β: "2 seconds" at the floor, otherwise to one
 *  decimal at any size ("3.4 seconds", "12.5 seconds"), so the clause
 *  never misstates which stops count as breaks by more than 0.05 s
 *  (spec-00 J2). A threshold, unlike a duration, keeps its decimal past
 *  10 s. */
export function breakSeconds(breakMs: number): string {
  const b = finite(breakMs);
  return b <= 2000 ? "2 seconds" : `${count(Math.round(b / 100) / 10)} seconds`;
}

/** The Breaks row's clause; β above 2 s names its own threshold. */
export function breakClause(breakMs: number): string {
  return `Stops of ${breakSeconds(breakMs)} or more, and the wait before your first key in a race.`;
}

/** The Fixing row's clause; with backspace off there is no fix, only
 *  the time until you move on. */
export function fixingClause(fixMode: FixMode): string {
  return fixMode === "none"
    ? "With backspace off, the extra time after a mistake until you move on."
    : "The extra time from a mistake until you're back on track.";
}

/** The five slices' user-facing labels (spec-00 §4.1), fixed everywhere. */
export const SLICE_LABEL: Record<SliceKey, string> = {
  typing: "Typing",
  fixing: "Fixing mistakes",
  before: "Pauses before words",
  inside: "Hesitations inside words",
  breaks: "Breaks",
};

/** The clauses that never change with the run (spec-00 §4.1). */
export const SLICE_CLAUSE: Record<"typing" | "before" | "inside", string> = {
  typing: "Pressing keys at your own pace.",
  before: "Extra time before you start the next word.",
  inside: "Stalls partway through a word.",
};

/** Each slice's muted clause. Fixing and Breaks depend on the run. */
export function sliceClause(key: SliceKey, run: { breakMs: number; fixMode: FixMode }): string {
  if (key === "fixing") return fixingClause(run.fixMode);
  if (key === "breaks") return breakClause(run.breakMs);
  return SLICE_CLAUSE[key];
}
