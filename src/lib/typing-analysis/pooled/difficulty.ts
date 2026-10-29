import { clamp, median } from "../stats";
import type { PooledTest, Windows } from "./windows";

/** Passage-difficulty adjustment for Adapt buckets (spec-10 §13.4).
 *
 *  A passage whose in-word moves are r times as hard for you takes about
 *  1 − b + b·r times as long, b being the share of a test spent on
 *  in-word moves. No slope is fitted: Adapt picks harder words when
 *  you're in form (pacing.ts), so harder passages arrive on faster days
 *  and any fitted slope would shrink toward 0. */

export type Adjustment = {
  adjusted: boolean;
  b: number;
  /** d̃: the median difficulty over the bucket's tests that carry one. */
  dTilde: number | null;
  /** testId → the value every speed statistic uses: adjusted wpm when
   *  `adjusted` (raw for a test without `diff`), else raw wpm. */
  values: Map<string, number>;
};

export const B_DEFAULT = 0.6;
export const B_CLAMP: readonly [number, number] = [0.3, 0.9];
export const ADJ_CLAMP: readonly [number, number] = [0.8, 1.25];
/** The bucket is adjusted when this share of its usual window has `diff`. */
export const COVERAGE_MIN = 0.8;

/** b: the median in-word share over the loaded usual digests, clamped. */
export function inWordShare(usualD: readonly PooledTest[]): number {
  const iws = usualD.flatMap((t) => (t.digest?.iw != null ? [t.digest.iw] : []));
  return iws.length ? clamp(median(iws), B_CLAMP[0], B_CLAMP[1]) : B_DEFAULT;
}

/** adj = clamp(1 − b + b·d/d̃, 0.8, 1.25). */
export function adjFactor(diff: number, dTilde: number, b: number): number {
  return clamp(1 - b + (b * diff) / dTilde, ADJ_CLAMP[0], ADJ_CLAMP[1]);
}

export function difficultyAdjustment(w: Windows): Adjustment {
  const raw = new Map(w.tests.map((t) => [t.id, t.wpm]));
  const b = inWordShare(w.usualD);
  const isTraining = w.tests[0]?.mode === "training";
  const diffs = w.tests.flatMap((t) => (t.diff !== null && t.diff > 0 ? [t.diff] : []));
  const dTilde = diffs.length ? median(diffs) : null;
  const covered = w.usual.filter((t) => t.diff !== null && t.diff > 0).length;
  const adjusted = isTraining && dTilde !== null && dTilde > 0 && w.usual.length > 0
    && covered >= COVERAGE_MIN * w.usual.length;
  if (!adjusted) return { adjusted: false, b, dTilde, values: raw };
  const values = new Map<string, number>();
  for (const t of w.tests) {
    values.set(t.id, t.diff !== null && t.diff > 0 ? t.wpm * adjFactor(t.diff, dTilde!, b) : t.wpm);
  }
  return { adjusted: true, b, dTilde, values };
}

/** The value of one test under an adjustment (raw wpm when unknown). */
export const valueOf = (adj: Adjustment, t: PooledTest): number => adj.values.get(t.id) ?? t.wpm;
