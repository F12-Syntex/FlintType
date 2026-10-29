import { computeTaintMask } from "@/lib/keystrokes/taint";
import type { GapClass, RunInput } from "@/types/typing-analysis";
import {
  BOUNDARY_CLAMP,
  BOUNDARY_MIN,
  BOUNDARY_PRIOR,
  BREAK_FACTOR,
  BREAK_FLOOR_MS,
  CATCH_MAX_FACTOR,
  CATCH_MIN_FACTOR,
  CATCH_Z,
  CHUNK_MS,
  CLASS_MIN,
  CLASS_PRIOR,
  CLASS_PRIOR_WEIGHT,
  CLASS_RATIO_CLAMP,
  PACE_GOOD_MIN,
  PACE_QUANTILE,
  PACE_ROUGH_MIN,
  SIGMA_PRIOR,
  SIGMA_PRIOR_WEIGHT,
  STATS_FLOOR_KEY_MS,
  STATS_FLOOR_MS,
} from "./constants";
import { isShifted } from "./context";
import { gapClasses } from "./gaps";
import { clamp, quantile } from "./stats";
import { buildTimeline, usableInput, type Timeline } from "./timeline";

/** The clean in-word set, the run's own pace and every threshold, all
 *  relative to that pace (spec-10 §5). Gap kinds and classes are in gaps.ts. */

/** computeTaintMask, plus (v2) the first char event after any edit mark. */
export function taintOf(tl: Timeline): boolean[] {
  const taint = computeTaintMask(tl.ev);
  if (tl.capture === 2) {
    for (let k = 0; k < tl.K; k++) if (tl.marks[k]!.some((m) => m.kind === "edit")) taint[k] = true;
  }
  return taint;
}

/** §5.2: the clean in-word set I, as a per-gap flag. */
export function cleanSet(tl: Timeline, taint: readonly boolean[]): Uint8Array {
  const inI = new Uint8Array(tl.K);
  for (let k = 1; k < tl.K; k++) {
    const a = tl.ev[k - 1]!;
    const b = tl.ev[k]!;
    if (a.wordIndex !== b.wordIndex || !a.correct || !b.correct || taint[k - 1] || taint[k]) continue;
    if (a.expected.length === 0 || b.expected.length === 0) continue;
    if (tl.capture === 2 && tl.marks[k]!.length > 0) continue;
    if (tl.dt[k]! < CHUNK_MS) continue;
    const keyClock = tl.useHt && a.src === undefined && b.src === undefined && !tl.quantised;
    if (tl.ds[k]! >= (keyClock ? STATS_FLOOR_KEY_MS : STATS_FLOOR_MS)) inI[k] = 1;
  }
  return inI;
}

export type PaceBase = {
  P: number | null;
  sigma: number;
  quality: "good" | "rough" | "none";
  inI: Uint8Array;
  intervals: number;
  cls: GapClass[];
  /** Per-run class ratios ρ_c (priors for a rough pace). */
  rho: Record<GapClass, number>;
};

/** §5.3: P (Q40 of class-normalised clean gaps), σ and the class ratios. */
export function estimatePace(tl: Timeline, taint: readonly boolean[]): PaceBase {
  const inI = cleanSet(tl, taint);
  const cls = gapClasses(tl);
  const rho = { ...CLASS_PRIOR };
  const r: number[] = [];
  for (let k = 1; k < tl.K; k++) if (inI[k]) r.push(Math.log(tl.ds[k]!) - Math.log(CLASS_PRIOR[cls[k]!]));
  if (r.length >= PACE_GOOD_MIN) {
    const lnP = quantile(r, PACE_QUANTILE);
    const sHat = Math.max(0, (quantile(r, 0.5) - quantile(r, 0.1)) / 1.2816);
    const sigma = (r.length * sHat + SIGMA_PRIOR_WEIGHT * SIGMA_PRIOR) / (r.length + SIGMA_PRIOR_WEIGHT);
    const byClass = new Map<GapClass, number[]>();
    for (let k = 1; k < tl.K; k++) {
      if (!inI[k]) continue;
      const list = byClass.get(cls[k]!) ?? [];
      list.push(Math.log(tl.ds[k]!));
      byClass.set(cls[k]!, list);
    }
    for (const [c, logs] of byClass) {
      if (c === "cross" || c === "plain" || logs.length < CLASS_MIN) continue;
      const lnHat = quantile(logs, PACE_QUANTILE) - lnP;
      const ln0 = Math.log(CLASS_PRIOR[c]);
      const shrunk = (logs.length * lnHat + CLASS_PRIOR_WEIGHT * ln0) / (logs.length + CLASS_PRIOR_WEIGHT);
      rho[c] = Math.exp(clamp(shrunk, Math.log(CLASS_RATIO_CLAMP[0]), Math.log(CLASS_RATIO_CLAMP[1])));
    }
    return { P: Math.exp(lnP), sigma, quality: "good", inI, intervals: r.length, cls, rho };
  }
  const rough: number[] = [];
  for (let k = 1; k < tl.K; k++) {
    const a = tl.ev[k - 1]!;
    const b = tl.ev[k]!;
    if (a.wordIndex !== b.wordIndex || !a.correct || !b.correct) continue;
    if (a.expected.length === 0 || b.expected.length === 0 || tl.dt[k]! < STATS_FLOOR_MS) continue;
    rough.push(Math.log(tl.dt[k]!));
  }
  if (rough.length >= PACE_ROUGH_MIN) {
    const P = Math.exp(quantile(rough, PACE_QUANTILE));
    return { P, sigma: SIGMA_PRIOR, quality: "rough", inI, intervals: r.length, cls, rho };
  }
  return { P: null, sigma: SIGMA_PRIOR, quality: "none", inI, intervals: r.length, cls, rho };
}

export type Thresholds = {
  P: number;
  kappa: number;
  catchFactor: number;
  /** P_B, the run's fluent word-to-word time. */
  boundaryMs: number;
  pauseFactor: number;
  beta: number;
  /** Shift slows only the space → letter stroke: s_k for a boundary into ev[k]. */
  shiftFactor(k: number): number;
  catchAt(k: number): number;
  pauseAt(k: number): number;
  /** Allotment of an in-word gap, P·ρ_c. */
  needIn(k: number): number;
  /** Allotment of a boundary, P_B·s_k (the same centre the threshold uses). */
  needB(k: number): number;
};

/** z(0.40) − z(0.10) of the standard normal. */
const LOWER_TAIL_Z = 1.2816 - 0.2533;
const kappaOf = (s: number) => clamp(CATCH_Z * s, Math.log(CATCH_MIN_FACTOR), Math.log(CATCH_MAX_FACTOR));

/** §5.4. `boundaryUnits` are the boundary gaps outside every episode. */
export function thresholds(tl: Timeline, base: PaceBase & { P: number }, boundaryUnits: readonly number[]): Thresholds {
  const { P, sigma, rho, cls } = base;
  const kappa = kappaOf(sigma);
  const sOf = (k: number) => (isShifted(tl.ev[k]!.expected) ? (1 + rho.shift) / 2 : 1);
  const usable = boundaryUnits.filter((k) => tl.ds[k]! > 0);
  let PB = BOUNDARY_PRIOR * P;
  let sigmaB = sigma;
  if (usable.length >= BOUNDARY_MIN) {
    const logs = usable.map((k) => Math.log(tl.ds[k]!) - Math.log(sOf(k)));
    const raw = Math.exp(quantile(logs, PACE_QUANTILE));
    PB = clamp(raw, BOUNDARY_CLAMP[0] * P, BOUNDARY_CLAMP[1] * P);
    // Spec deviation, so a run that pauses before half or most of its
    // words still has those pauses called pauses: the fluent spread comes
    // from the lower tail only, (Q40 − Q10)/(z.40 − z.10), which pauses
    // can't reach until they are 60% of word gaps; past that (the raw
    // centre is above the 3P clamp) the in-word σ stands in.
    if (raw <= BOUNDARY_CLAMP[1] * P) {
      const sHat = Math.max(0, (quantile(logs, PACE_QUANTILE) - quantile(logs, 0.1)) / LOWER_TAIL_Z);
      sigmaB = (usable.length * sHat + SIGMA_PRIOR_WEIGHT * sigma) / (usable.length + SIGMA_PRIOR_WEIGHT);
    }
  }
  const kappaB = kappaOf(sigmaB);
  const catchFactor = Math.exp(kappa);
  const pauseFactor = Math.exp(kappaB);
  return {
    P,
    kappa,
    catchFactor,
    boundaryMs: PB,
    pauseFactor,
    beta: Math.max(BREAK_FACTOR * P, BREAK_FLOOR_MS),
    shiftFactor: sOf,
    catchAt: (k) => P * rho[cls[k]!] * catchFactor,
    pauseAt: (k) => PB * sOf(k) * pauseFactor,
    needIn: (k) => P * rho[cls[k]!],
    needB: (k) => PB * sOf(k),
  };
}

/** The clean in-word gaps of a run (the set I), each with the arriving
 *  letter in lower case and its gap on the statistics clock. Used by the
 *  result screen's Slowest letters card: a word's first letter, the key
 *  after a wrong key and (v2) the key after an edit never appear.
 *  Unusable input gives []. */
export function letterGaps(input: RunInput): { letter: string; ms: number }[] {
  // The live clone passes another user's payload: never throw into render.
  if (!usableInput(input) || input.timings.length < 2) return [];
  try {
    const tl = buildTimeline(input);
    const inI = cleanSet(tl, taintOf(tl));
    const out: { letter: string; ms: number }[] = [];
    for (let k = 1; k < tl.K; k++) if (inI[k]) out.push({ letter: tl.ev[k]!.expected.toLowerCase(), ms: tl.ds[k]! });
    return out;
  } catch {
    return [];
  }
}
