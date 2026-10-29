import { FRICTION_ORDER, SLICE_ORDER, type FrictionKey, type SliceSet } from "@/types/typing-analysis";
import type { Budget } from "./budget";
import { JACKKNIFE_MIN_WORDS } from "./constants";
import { round } from "./stats";

/** Per-test standard errors of each friction slice in seconds per minute,
 *  from a leave-one-word-out jackknife (spec-10 §8.7). Every unit is
 *  attributed to one word (§7.4); dropping word w removes its allocation
 *  a_{x,w} from the slice and its total τ_w from the test's time.
 *
 *  The thresholds (P, β, catch and pause levels) are held fixed across
 *  the replicates rather than re-estimated without word w. That slightly
 *  understates the SE; the pooled noise tests add a session-level term
 *  and use this only as a floor (medianDiff), so the bias is harmless. */
export function jackknifeSE(budget: Budget, T: number): Record<FrictionKey, number> | null {
  const byWord = new Map<number, SliceSet>();
  for (const u of budget.units) {
    let cur = byWord.get(u.word);
    if (!cur) byWord.set(u.word, (cur = { typing: 0, fixing: 0, before: 0, inside: 0, breaks: 0 }));
    cur.typing += u.typing;
    cur.fixing += u.fixing;
    cur.before += u.before;
    cur.inside += u.inside;
    cur.breaks += u.breaks;
  }
  const rows = [...byWord.values()]
    .map((s) => ({ s, tau: SLICE_ORDER.reduce((a, x) => a + s[x], 0) }))
    .filter((r) => r.tau > 0 && T - r.tau > 0);
  const n = rows.length;
  if (n < JACKKNIFE_MIN_WORDS) return null;
  const out = { fixing: 0, before: 0, inside: 0 };
  for (const x of FRICTION_ORDER) {
    const A = rows.reduce((a, r) => a + r.s[x], 0);
    const theta = rows.map((r) => (60 * (A - r.s[x])) / (T - r.tau));
    const mean = theta.reduce((a, v) => a + v, 0) / n;
    const ss = theta.reduce((a, v) => a + (v - mean) ** 2, 0);
    out[x] = round(Math.sqrt(((n - 1) / n) * ss), 3);
  }
  return out;
}
