import type { Barrier, BarrierDetail, BarriersSection, BarrierVariant, Range } from "@/types/insights";
import { FRICTION_ORDER, type FixMode, type FrictionKey, type TestDigestV1 } from "@/types/typing-analysis";
import { clamp, median, medianRankCI, round, twoPropZ } from "../stats";
import { kelleyQ25, recentFixing, sPerMin, type Better } from "./minute";
import { barrierPlan, type Readiness } from "./next-step";
import { normalTwoSidedP, tTwoSidedP } from "./t-test";
import { dg, sameFix, type PooledTest, type Windows } from "./windows";

/** What would help most (spec-10 §13.6): time you could win back against
 *  your own better days, per friction slice, with a distribution-free
 *  range on "now". At most 3, the largest lower bound first. */

export const BARRIERS_MIN_RECENT = 5;
export const BARRIERS_MIN_USUAL = 10;
const SHOW_MIN = 0.5;
const MAX_ITEMS = 3;
const FREQ_Z = 2.5;
const FREQ_P = normalTwoSidedP(FREQ_Z);
const FREQ_RATIO = 1.2;
const LONG_RATIO = 2;
const LONG_Z = 2;
const LONG_MIN = 30;
const PAIR_MIN_CATCHES = 3;
const PAIR_MIN_SEEN = 10;
const PAIR_RATE_RATIO = 2;

const minutes = (ts: readonly PooledTest[]) => ts.reduce((s, t) => s + dg(t).ms / 60000, 0);
const errors = (ts: readonly PooledTest[]) => ts.reduce((s, t) => s + dg(t).err.n, 0);

/** Pearson dispersion of each session's mistake count around `rate`
 *  (never below 1), with its degrees of freedom (sessions − 1): bad days
 *  and sessions make counts vary more than Poisson, and the tests of one
 *  session share them. */
export function dispersion(ts: readonly PooledTest[], rate: number): { phi: number; df: number } {
  const by = new Map<number, [count: number, minutes: number]>();
  for (const t of ts) {
    const c = by.get(t.session) ?? [0, 0];
    c[0] += dg(t).err.n;
    c[1] += dg(t).ms / 60000;
    by.set(t.session, c);
  }
  const cells = [...by.values()];
  const df = Math.max(1, cells.length - 1);
  if (cells.length < 2 || rate <= 0) return { phi: 1, df };
  const chi = cells.reduce((s, [o, m]) => s + (o - rate * m) ** 2 / (rate * m), 0);
  return { phi: Math.max(1, chi / (cells.length - 1)), df };
}

/** Mistakes more often than before: a rate test on counts against the
 *  tests before (never a median against a Q25 of small counts). The test
 *  is quasi-Poisson over sessions: the variance is scaled by the earlier
 *  sessions' dispersion and counts the noise in the earlier rate too, and
 *  z is judged as Student t with the dispersion's degrees of freedom (at
 *  the normal p of FREQ_Z), so a few sessions never pass as certainty.
 *  Otherwise the time each mistake costs. With backspace off ("none")
 *  nothing is fixed, so there is no cost per fix to show: only frequency
 *  can name the slice, and without it the fixing barrier is skipped. */
export function fixingDetail(w: Windows, fixKey: FixMode | null): { variant: BarrierVariant; detail: BarrierDetail } | null {
  const R = sameFix(w.recentD, fixKey);
  const E = sameFix(w.earlierD, fixKey);
  const rR = minutes(R) > 0 ? errors(R) / minutes(R) : 0;
  if (E.length >= BARRIERS_MIN_RECENT && minutes(E) > 0) {
    const rE = errors(E) / minutes(E);
    const expected = Math.max(rE * minutes(R), 0.5);
    const { phi, df } = dispersion(E, rE);
    const z = (errors(R) - expected) / Math.sqrt(phi * expected * (1 + minutes(R) / minutes(E)));
    if (z > 0 && tTwoSidedP(z, df) <= FREQ_P && rR >= FREQ_RATIO * rE) {
      return { variant: "frequency", detail: { perMin: [round(rR, 1), round(rE, 1)] } };
    }
  }
  if (fixKey === "none") return null;
  const keys = (ts: readonly PooledTest[]) => ts.flatMap((t) => (dg(t).err.med !== null && dg(t).pace.P > 0 ? [dg(t).err.med! / dg(t).pace.P] : []));
  const kR = keys(R);
  const kU = keys(sameFix(w.usualD, fixKey));
  return { variant: "cost", detail: kR.length && kU.length ? { costKeys: [Math.round(median(kR)), Math.round(median(kU))] } : {} };
}

/** Pooled [boundaries, pauses] before short (≤ 4) and long (≥ 8) words. */
export function lengthRates(ts: readonly PooledTest[]): { short: [number, number]; long: [number, number]; all: number } {
  const short: [number, number] = [0, 0];
  const long: [number, number] = [0, 0];
  let all = 0;
  for (const t of ts) {
    const bl = dg(t).bl;
    short[0] += bl[0][0]; short[1] += bl[0][1];
    long[0] += bl[2][0]; long[1] += bl[2][1];
    all += bl[0][0] + bl[1][0] + bl[2][0];
  }
  return { short, long, all };
}

export function beforeDetail(w: Windows): { variant: BarrierVariant; detail: BarrierDetail } {
  const share = (d: TestDigestV1) => d.n.pa / d.n.bd;
  const R = w.recentD.filter((t) => dg(t).n.bd > 0);
  const U = w.usualD.filter((t) => dg(t).n.bd > 0);
  const recent = R.reduce((s, t) => s + dg(t).n.pa, 0) / Math.max(1, R.reduce((s, t) => s + dg(t).n.bd, 0));
  const se = U.map((t) => {
    const n = dg(t).n.bd;
    const p = clamp(share(dg(t)), 0.5 / n, 1 - 0.5 / n);
    return Math.sqrt((p * (1 - p)) / n);
  });
  const better = U.length ? kelleyQ25(U.map((t) => share(dg(t))), se) : recent;
  const detail: BarrierDetail = { pauseOneIn: [round(recent, 3), round(Math.max(0, better), 3)] };
  const { short, long } = lengthRates(w.usualD);
  const sRate = short[0] > 0 ? short[1] / short[0] : 0;
  const lRate = long[0] > 0 ? long[1] / long[0] : 0;
  const longWords = long[0] >= LONG_MIN && short[0] > 0 && lRate >= LONG_RATIO * sRate && lRate > 0
    && twoPropZ(short[1], short[0], long[1], long[0]) >= LONG_Z;
  return { variant: longWords ? "longWords" : "flat", detail };
}

/** A pair you hesitate at far more often than elsewhere, rate-normalised
 *  so a frequent pair can't win by volume. */
export function insideDetail(w: Windows): { variant: BarrierVariant; detail: BarrierDetail } {
  const caught = new Map<string, [catches: number, seen: number]>();
  let ca = 0;
  let inWord = 0;
  for (const t of w.recentD) {
    const d = dg(t);
    ca += d.n.ca;
    inWord += d.n.in;
    for (const [key, c] of d.ip) {
      const cell = d.pairs.find((p) => p[0] === key);
      if (!cell) continue;
      const acc = caught.get(key) ?? [0, 0];
      caught.set(key, [acc[0] + c, acc[1] + cell[1]]);
    }
  }
  const base = inWord > 0 ? ca / inWord : 0;
  let pick: { key: string; rate: number } | null = null;
  for (const [key, [c, seen]] of [...caught].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const rate = c / seen;
    if (c >= PAIR_MIN_CATCHES && seen >= PAIR_MIN_SEEN && rate >= PAIR_RATE_RATIO * base && (!pick || rate > pick.rate)) pick = { key, rate };
  }
  return pick ? { variant: "pair", detail: { pair: pick.key } } : { variant: "flat", detail: {} };
}

const gainOf = (W: number, r: number) => Math.round(W * (60 / (60 - Math.min(r, 59)) - 1));

/** `better` is the shrunk better days (minute.ts); W the headline usual. */
export function barriersOf(w: Windows, o: {
  fixKey: FixMode | null; better: Better; fixingSuppressed: boolean; W: number; readiness: Readiness;
}): { section: BarriersSection; whatIf: Range | null } {
  if (w.recentD.length < BARRIERS_MIN_RECENT || w.usualD.length < BARRIERS_MIN_USUAL) {
    return { section: { status: "learning", gate: { have: w.usualD.length, need: BARRIERS_MIN_USUAL, unit: "tests" } }, whatIf: null };
  }
  const items: (Barrier & { lo: number; hi: number })[] = [];
  for (const x of FRICTION_ORDER) {
    if (x === "fixing" && o.fixingSuppressed) continue;
    const ts = x === "fixing" ? recentFixing(w, o.fixKey).ts : w.recentD;
    const vals = ts.map((t) => sPerMin(dg(t), x)).sort((a, b) => a - b);
    const G = o.better[x];
    const now = median(vals);
    const [l, u] = medianRankCI(vals.length, 0.2);
    const lo = Math.max(0, vals[l - 1]! - G);
    const hi = Math.max(0, vals[u - 1]! - G);
    if (lo < SHOW_MIN) continue;
    const v = x === "fixing" ? fixingDetail(w, o.fixKey) : x === "before" ? beforeDetail(w) : insideDetail(w);
    if (!v) continue;
    items.push({
      kind: x, variant: v.variant, recent: round(now, 1), better: round(G, 1),
      recoverable: { low: round(lo, 1), high: round(hi, 1) },
      gain: { low: gainOf(o.W, lo), high: gainOf(o.W, hi) },
      detail: v.detail, action: barrierPlan(x, v.variant, o.readiness).action, lo, hi,
    });
  }
  const order: Record<FrictionKey, number> = { fixing: 0, before: 1, inside: 2 };
  items.sort((a, b) => b.lo - a.lo || order[a.kind] - order[b.kind]);
  const shown = items.slice(0, MAX_ITEMS);
  const sumLo = shown.reduce((s, b) => s + b.lo, 0);
  const sumHi = shown.reduce((s, b) => s + b.hi, 0);
  const whatIf = shown.length
    ? { low: Math.round((o.W * 60) / (60 - Math.min(sumLo, 59))), high: Math.round((o.W * 60) / (60 - Math.min(sumHi, 59))) }
    : null;
  return {
    section: { status: "ready", items: shown.map(({ lo: _lo, hi: _hi, ...b }) => b) },
    whatIf: whatIf && whatIf.low >= Math.round(o.W) + 1 ? whatIf : null,
  };
}
