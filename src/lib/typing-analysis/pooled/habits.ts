import type { FixMode } from "@/types/typing-analysis";
import type { Gate, Habit, HabitKind, HabitsSection } from "@/types/insights";
import { median, round, signTestP, twoPropZ } from "../stats";
import { lengthRates } from "./barriers";
import { handsOf } from "./hands";
import type { Fatigue, WarmUp } from "./sessions";
import { dg, sameFix, type PooledTest } from "./windows";

/** Plain answers about how you type (spec-10 §13.9). Each habit is either
 *  answered or pending with the count it is waiting for. */

export const MISTAKE_MIN_FIXED = 10;
export const MISTAKE_MIN_DIGESTS = 3;
export const NOTICE_MIN_DIGESTS = 10;
export const LONG_MIN_BOUNDARIES = 150;
export const LONG_MIN_LONG = 30;
export const FADE_MIN_DIGESTS = 8;
const QUITE_RATIO = 2;
const LITTLE_RATIO = 1.3;
const LONG_Z = 2;
const FADE_DOWN = 0.95;
const FADE_UP = 1.05;
const SIGN_P = 0.05;

type Result = Habit | { kind: HabitKind; gate: Gate } | null;

/** A figure, never a verdict: noticing and backspacing take a roughly
 *  fixed time, so a band would only reflect typing speed. Only for fix
 *  mode `fix` (with backspace off or stop on error the time means
 *  something else); omitted otherwise. */
export function mistakeCostOf(usualD: readonly PooledTest[], fixKey: FixMode | null): Result {
  if (usualD.length > 0 && fixKey !== "fix") return null;
  const ts = sameFix(usualD, "fix").filter((t) => dg(t).err.fixed >= 1 && dg(t).err.med !== null);
  const fixed = ts.reduce((s, t) => s + dg(t).err.fixed, 0);
  if (fixed < MISTAKE_MIN_FIXED) return { kind: "mistakeCost", gate: { have: fixed, need: MISTAKE_MIN_FIXED, unit: "fixes" } };
  if (ts.length < MISTAKE_MIN_DIGESTS) return { kind: "mistakeCost", gate: { have: ts.length, need: MISTAKE_MIN_DIGESTS, unit: "tests" } };
  const nk = ts.flatMap((t) => (dg(t).err.nk !== null ? [dg(t).err.nk!] : []));
  return {
    kind: "mistakeCost",
    costMs: Math.round(median(ts.map((t) => dg(t).err.med!))),
    costKeys: round(median(ts.filter((t) => dg(t).pace.P > 0).map((t) => dg(t).err.med! / dg(t).pace.P)), 1),
    noticeKeys: nk.length >= NOTICE_MIN_DIGESTS ? round(median(nk), 1) : null,
    n: ts.length,
  };
}

export function longWordsOf(usualD: readonly PooledTest[]): Result {
  const { short, long, all } = lengthRates(usualD);
  if (all < LONG_MIN_BOUNDARIES) return { kind: "longWords", gate: { have: all, need: LONG_MIN_BOUNDARIES, unit: "gaps" } };
  if (long[0] < LONG_MIN_LONG) return { kind: "longWords", gate: { have: long[0], need: LONG_MIN_LONG, unit: "gaps" } };
  const shortRate = short[0] > 0 ? short[1] / short[0] : 0;
  const longRate = long[1] / long[0];
  const z = twoPropZ(short[1], short[0], long[1], long[0]);
  const ratio = shortRate > 0 ? longRate / shortRate : longRate > 0 ? Infinity : 1;
  const answer = ratio >= QUITE_RATIO && z >= LONG_Z ? "yes-quite" : ratio >= LITTLE_RATIO && z >= LONG_Z ? "a-little" : "not-really";
  return { kind: "longWords", answer, longRate: round(longRate, 3), shortRate: round(shortRate, 3), n: all };
}

export function paceToEndOf(usualD: readonly PooledTest[]): Result {
  const ratios = usualD.flatMap((t) => {
    const f = dg(t).fade;
    return f && f[0] > 0 ? [f[1] / f[0]] : [];
  });
  const of = ratios.length;
  if (of < FADE_MIN_DIGESTS) return { kind: "paceToEnd", gate: { have: of, need: FADE_MIN_DIGESTS, unit: "tests" } };
  const m = median(ratios);
  const slower = ratios.filter((r) => r < 1).length;
  const faster = ratios.filter((r) => r > 1).length;
  const answer = signTestP(slower, of) < SIGN_P && m <= FADE_DOWN ? "fade-a-little"
    : signTestP(faster, of) < SIGN_P && m >= FADE_UP ? "speed-up" : "yes";
  return { kind: "paceToEnd", answer, slower, of, n: of };
}

const warmUpHabit = (w: WarmUp): Result => ("gate" in w ? { kind: "warmUp", gate: w.gate }
  : { kind: "warmUp", answer: w.found ? "usually" : "not-really", wpm: w.wpm, n: w.n });
const fatigueHabit = (f: Fatigue): Result => ("gate" in f ? { kind: "fatigue", gate: f.gate }
  : { kind: "fatigue", answer: f.found ? "after-20" : "not-that-we-can-see", accuracyDrop: f.accuracyDrop, n: f.n });

/** Every habit, in the fixed order. Without digests (the store is
 *  unavailable) only the habits built from tests are listed. */
export function habitsOf(o: {
  usualD: readonly PooledTest[] | null; fixKey: FixMode | null; warmUp: WarmUp; fatigue: Fatigue;
}): HabitsSection {
  const d = o.usualD;
  const all: Result[] = [
    d ? mistakeCostOf(d, o.fixKey) : null,
    d ? longWordsOf(d) : null,
    d ? paceToEndOf(d) : null,
    warmUpHabit(o.warmUp),
    fatigueHabit(o.fatigue),
    d ? (() => { const h = handsOf(d); return "gate" in h ? { kind: "hands" as const, gate: h.gate } : h; })() : null,
  ];
  const items: Habit[] = [];
  const pending: HabitsSection["pending"] = [];
  for (const r of all) {
    if (!r) continue;
    if ("gate" in r) pending.push({ kind: r.kind, gate: r.gate });
    else items.push(r);
  }
  return { items, pending };
}
