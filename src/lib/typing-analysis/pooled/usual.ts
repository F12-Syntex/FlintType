import type { RangeSummary } from "@/types/insights";
import { mad, median, quantile } from "../stats";
import { normalTwoSidedP, tTwoSidedP, zForTwoSidedP } from "./t-test";

/** Usual ranges and the noise models every "did it change" test shares
 *  (spec-10 §13.1). */

const MAD_SD = 1.4826;
/** √(π/2): the standard error of a median over that of a mean (normal). */
const MEDIAN_EFF = Math.PI / 2;
const RANGE_MIN = 5;
const MIDDLE_MIN = 10;
const NOISE_MIN = 15;
const NOISE_WINDOW = 10;
const NOISE_FIRST = 3;
const WITHIN_MIN = 6;
const BETWEEN_MIN_SESSIONS = 4;

/** n < 5 → null; 5–9 → min..max; 10 or more → Q10..Q90 (type 7). mid is the median. */
export function usualRange(values: readonly number[]): RangeSummary | null {
  const n = values.length;
  if (n < RANGE_MIN) return null;
  const mid = median(values);
  if (n < MIDDLE_MIN) return { low: Math.min(...values), mid, high: Math.max(...values), n, rule: "min-max" };
  return { low: quantile(values, 0.1), mid, high: quantile(values, 0.9), n, rule: "middle-80" };
}

/** Test-to-test noise from n ≥ 15 chronological values: each residual is a
 *  value against the median of the (up to) 10 before it, never itself. */
export function noise(valuesChronological: readonly number[]): { sem: number; mdc: number } | null {
  const v = valuesChronological;
  if (v.length < NOISE_MIN) return null;
  const res: number[] = [];
  for (let i = NOISE_FIRST; i < v.length; i++) res.push(v[i]! - median(v.slice(Math.max(0, i - NOISE_WINDOW), i)));
  const sem = MAD_SD * mad(res);
  return { sem, mdc: 1.96 * Math.SQRT2 * sem };
}

export type Unit = { v: number; session: number; se?: number };

type Side = { units: readonly Unit[]; sessions: Map<number, number[]> };

function sideOf(units: readonly Unit[]): Side {
  const sessions = new Map<number, number[]>();
  for (const u of units) {
    const list = sessions.get(u.session);
    if (list) list.push(u.v);
    else sessions.set(u.session, [u.v]);
  }
  return { units, sessions };
}

const meanOf = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Σ (x − mean)² of one group. */
function sumSq(xs: readonly number[]): number {
  const m = meanOf(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0);
}

/** Within-session SD: the pooled within-session variance (n − 1 per
 *  session) over sessions of 2 or more tests, both sides. With fewer than
 *  5 degrees of freedom, the pooled SD of each side about its own mean.
 *  Classical variances, not MADs: friction is 0 in most tests, which
 *  collapses a MAD, and a median-centred spread in groups of 2 or 3 runs
 *  well below the real one. */
function withinSd(sides: readonly Side[]): number {
  let ss = 0;
  let df = 0;
  for (const s of sides) for (const vs of s.sessions.values()) {
    if (vs.length < 2) continue;
    ss += sumSq(vs);
    df += vs.length - 1;
  }
  if (df < WITHIN_MIN - 1) {
    ss = 0;
    df = 0;
    for (const s of sides) {
      ss += sumSq(s.units.map((u) => u.v));
      df += s.units.length - 1;
    }
  }
  return df > 0 ? Math.sqrt(ss / df) : 0;
}

/** Between-session SD: the session effect alone. Session medians vary
 *  by the session effect plus their own sampling noise ((π/2)·σ_w²/k for
 *  a session of k), so that noise is taken off (method of moments). It is
 *  never below half the within SD (the spec's fallback, used outright
 *  with fewer than 4 sessions): with sessions of one test the two can't
 *  be told apart, and assuming sittings don't differ at all is what
 *  makes a lucky session look like a change. */
function betweenSd(sides: readonly Side[], sw: number): number {
  let ss = 0;
  let df = 0;
  let count = 0;
  let inv = 0;
  for (const s of sides) {
    const meds = [...s.sessions.values()].map((vs) => median(vs));
    count += meds.length;
    for (const vs of s.sessions.values()) inv += 1 / vs.length;
    if (meds.length < 2) continue;
    ss += sumSq(meds);
    df += meds.length - 1;
  }
  const floor = 0.5 * sw;
  if (count < BETWEEN_MIN_SESSIONS || df < 2) return floor;
  const excess = ss / df - MEDIAN_EFF * sw * sw * (inv / count);
  return Math.max(floor, Math.sqrt(Math.max(0, excess)));
}

export type MedianDiff = { d: number; se: number; df: number };

/** Recent minus earlier, with a standard error that treats sessions as
 *  clusters (tests from one sitting move together): for each side
 *  Var = (π/2)·σ_w²/n + σ_b²/s, and stored per-test standard errors (the
 *  friction slices' jackknife SE) set a floor, so a metric that is 0 in
 *  most tests never gets a zero SE. `df` = sessions − 2: the variance
 *  comes from a few sessions, so d/se is judged as a t (`passes`). */
export function medianDiff(R: readonly Unit[], E: readonly Unit[]): MedianDiff {
  if (R.length === 0 || E.length === 0) return { d: 0, se: 0, df: 0 };
  const sides = [sideOf(R), sideOf(E)];
  const d = median(R.map((u) => u.v)) - median(E.map((u) => u.v));
  const sw = withinSd(sides);
  const sb = betweenSd(sides, sw);
  const varOf = (s: Side) => (MEDIAN_EFF * sw * sw) / s.units.length + (sb * sb) / s.sessions.size;
  const withSe = [...R, ...E].filter((u) => u.se !== undefined && Number.isFinite(u.se));
  const floor = withSe.length
    ? Math.sqrt(meanOf(withSe.map((u) => u.se! * u.se!)) * (1 / R.length + 1 / E.length))
    : 0;
  const df = Math.max(1, sides[0]!.sessions.size + sides[1]!.sessions.size - 2);
  return { d, se: Math.max(Math.sqrt(varOf(sides[0]!) + varOf(sides[1]!)), floor), df };
}

/** The normal z with the same two-sided p as d/se under t(df), signed
 *  like d; 0 when there is no spread to judge against. So "z ≥ 2.5"
 *  keeps its normal meaning (p ≤ 0.012) however few sessions there are. */
export function zOf(r: MedianDiff): number {
  if (!(r.se > 0) || r.d === 0) return 0;
  return Math.sign(r.d) * zForTwoSidedP(tTwoSidedP(r.d / r.se, r.df));
}

/** |d| passes a z threshold, judged as a t with the estimate's df. */
export function passes(r: MedianDiff, zNeeded: number): boolean {
  return r.se > 0 && tTwoSidedP(r.d / r.se, r.df) <= normalTwoSidedP(zNeeded);
}
