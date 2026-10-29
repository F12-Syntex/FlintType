import type { Change, ChangeKind, ChangesSection, TrendState } from "@/types/insights";
import { FRICTION_ORDER, type FixMode, type FrictionKey } from "@/types/typing-analysis";
import { median, round } from "../stats";
import { valueOf, type Adjustment } from "./difficulty";
import { seOf, sPerMin } from "./minute";
import { tTwoSidedP, welch, zForTwoSidedP } from "./t-test";
import { medianDiff, passes, zOf, type Unit } from "./usual";
import { dg, sameFix, type PooledTest, type Windows } from "./windows";

/** "What changed" (spec-10 §13.7): recent against earlier, each metric
 *  behind a noise gate in which sessions are clusters. */

export const CHANGE_MIN = 5;
export const CHANGE_MIN_SESSIONS = 2;
const Z_NEEDED = 2.5;
const PAIR_T = 3;
const PAIR_MIN_TESTS = 4;
const PAIR_MIN_EFFECT = 0.08;
/** The error rate shared by every pair tested (Bonferroni). */
const PAIR_FAMILY_ALPHA = 0.02;
const MAX_ITEMS = 3;
const MAX_DECLINES = 2;

export type Candidate = Change & { z: number; zNeeded: number };

function candidate(kind: ChangeKind, R: Unit[], E: Unit[], up: boolean, floor: number,
  unit: Change["unit"], dp: number): Candidate | null {
  if (R.length < CHANGE_MIN || E.length < CHANGE_MIN) return null;
  const r = medianDiff(R, E);
  if (!passes(r, Z_NEEDED) || Math.abs(r.d) < floor) return null;
  const z = zOf(r);
  const before = median(E.map((u) => u.v));
  const after = median(R.map((u) => u.v));
  return { kind, direction: (r.d > 0) === up ? "better" : "worse", before: round(before, dp), after: round(after, dp), unit, z, zNeeded: Z_NEEDED };
}

const perMinUnits = (ts: readonly PooledTest[], x: FrictionKey): Unit[] =>
  ts.map((t) => ({ v: sPerMin(dg(t), x), session: t.session, se: seOf(dg(t), x) }));

/** u_t = mean ln time of the pair in one test − ln(that test's pace). */
function pairValues(ts: readonly PooledTest[], key: string): number[] {
  const out: number[] = [];
  for (const t of ts) {
    const c = dg(t).pairs.find((p) => p[0] === key);
    if (c && c[1] >= 2 && dg(t).pace.P > 0) out.push(c[2] / c[1] - Math.log(dg(t).pace.P));
  }
  return out;
}

/** Pair changes, over tests, with each test's own pace taken out (so a
 *  uniform speed-up moves no pair). A pair passes at |t| ≥ 3, an 8%
 *  change, and a Welch p-value within its Bonferroni share of 2% over
 *  every pair tested. Values in ms at today's pace. */
export function pairCandidates(w: Windows): Candidate[] {
  if (w.recentD.length < CHANGE_MIN || w.earlierD.length < CHANGE_MIN) return [];
  const keys = [...new Set(w.recentD.flatMap((t) => dg(t).pairs.map((p) => p[0])))].sort();
  const P = median(w.recentD.map((t) => dg(t).pace.P));
  const tested = keys
    .map((key) => ({ key, R: pairValues(w.recentD, key), E: pairValues(w.earlierD, key) }))
    .filter((x) => x.R.length >= PAIR_MIN_TESTS && x.E.length >= PAIR_MIN_TESTS);
  const out: Candidate[] = [];
  const pNeeded = PAIR_FAMILY_ALPHA / Math.max(1, tested.length);
  for (const { key, R, E } of tested) {
    const r = welch(E, R);
    if (Math.abs(r.t) < PAIR_T || Math.abs(Math.exp(r.diff) - 1) < PAIR_MIN_EFFECT) continue;
    const p = tTwoSidedP(r.t, r.df);
    if (p > pNeeded) continue;
    const mE = E.reduce((s, x) => s + x, 0) / E.length;
    out.push({ kind: "pair", key, direction: r.t < 0 ? "better" : "worse", before: Math.round(Math.exp(mE) * P),
      after: Math.round(Math.exp(mE + r.diff) * P), unit: "ms", z: zForTwoSidedP(p), zNeeded: zForTwoSidedP(pNeeded) });
  }
  return out;
}

/** Every metric that passed its gate, before ordering. Empty when the
 *  sessions gate fails. Digest metrics need `digests`. */
export function changeCandidates(w: Windows, adj: Adjustment, fixKey: FixMode | null, digests: boolean): Candidate[] {
  if (w.sessionsInRecent < CHANGE_MIN_SESSIONS) return [];
  const units = (ts: readonly PooledTest[], f: (t: PooledTest) => number): Unit[] => ts.map((t) => ({ v: f(t), session: t.session }));
  const out: (Candidate | null)[] = [];
  const speedE = median(w.earlier.map((t) => valueOf(adj, t)));
  out.push(candidate("speed", units(w.recent, (t) => valueOf(adj, t)), units(w.earlier, (t) => valueOf(adj, t)), true,
    Math.max(1.5, 0.02 * speedE), "wpm", 0));
  out.push(candidate("accuracy", units(w.recent, (t) => t.accuracy), units(w.earlier, (t) => t.accuracy), true, 1, "points", 1));
  if (digests && w.recentD.length >= CHANGE_MIN && w.earlierD.length >= CHANGE_MIN) {
    for (const x of FRICTION_ORDER) {
      const R = x === "fixing" ? sameFix(w.recentD, fixKey) : w.recentD;
      const E = x === "fixing" ? sameFix(w.earlierD, fixKey) : w.earlierD;
      out.push(candidate(x, perMinUnits(R, x), perMinUnits(E, x), false, 0.5, "sPerMin", 1));
    }
    const flowed = (ts: readonly PooledTest[]) => ts.filter((t) => dg(t).flow !== null);
    const fE = flowed(w.earlierD);
    out.push(candidate("flow", units(flowed(w.recentD), (t) => dg(t).flow!), units(fE, (t) => dg(t).flow!), true,
      Math.max(2, 0.02 * (fE.length ? median(fE.map((t) => dg(t).flow!)) : 0)), "wpm", 0));
    out.push(...pairCandidates(w));
  }
  return out.filter((c): c is Candidate => c !== null);
}

/** Drops what the headline already says, puts improvements first (each
 *  group by |z| / z needed), and keeps at most 3, with at most 2 declines
 *  when there is an improvement. */
export function orderChanges(cands: readonly Candidate[], trend: TrendState): Change[] {
  let list = cands.filter((c) => !(c.kind === "speed" && (trend === "improving" || trend === "slipping")));
  const speed = list.find((c) => c.kind === "speed");
  if (speed) list = list.filter((c) => !(c.kind === "flow" && c.direction === speed.direction));
  const rank = (a: Candidate, b: Candidate) => Math.abs(b.z) / b.zNeeded - Math.abs(a.z) / a.zNeeded;
  const better = list.filter((c) => c.direction === "better").sort(rank);
  const worse = list.filter((c) => c.direction === "worse").sort(rank);
  const picked = [...better, ...worse.slice(0, better.length ? MAX_DECLINES : MAX_ITEMS)].slice(0, MAX_ITEMS);
  return picked.map(({ z: _z, zNeeded: _n, ...c }) => c);
}

/** The section: learning until the trend's own gates pass (15 tests,
 *  2 sessions in the recent window). */
export function changesSection(w: Windows, cands: readonly Candidate[], trend: TrendState): ChangesSection {
  const n = w.tests.length;
  if (w.recent.length < CHANGE_MIN || w.earlier.length < CHANGE_MIN) {
    return { status: "learning", gate: { have: n, need: 15, unit: "tests" } };
  }
  if (w.sessionsInRecent < CHANGE_MIN_SESSIONS) {
    return { status: "learning", gate: { have: w.sessionsInRecent, need: CHANGE_MIN_SESSIONS, unit: "sessions" } };
  }
  return { status: "ready", items: orderChanges(cands, trend), earlierN: w.earlier.length };
}
