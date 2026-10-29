import type { HandLayoutPrefs } from "@/lib/hand-layout";
import { bigramCategory } from "@/lib/keystrokes/motor-features";
import {
  type ModelMap,
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  MIN_SAMPLES_FOR_WEAKNESS,
  weakness,
} from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import { EWMA_MEMORY } from "@/server/adapt/welford";
import type { HistoryWeakness } from "@/types/history";

/** The user's weakest patterns, ranked by the model's `weakness` value:
 *  letter pairs against their mechanical category's baseline, letter
 *  triples against the trigram baseline, and words against the time the
 *  user's own words of that length take (`fitWordLengthModel`), so a
 *  word is weak for its length, not merely long. Owner-only data
 *  (history.summary, the insights practice lists): it is derived from
 *  keystroke timing and is never served on a public profile. */
export type WeakestPatterns = {
  pairs: HistoryWeakness[];
  trigrams: HistoryWeakness[];
  words: HistoryWeakness[];
  /** True until the user has typed enough letter pairs to score them. */
  cold: boolean;
  bigramBaselineMs: number;
  trigramBaselineMs: number;
  wordBaselineMs: number;
};

export type WeakestLimits = { pairs: number; trigrams: number; words: number };

/** Twelve pairs and triples fit a list of bars without scrolling. Words
 *  get more because the worst-words drill bursts 20 of them. */
export const DEFAULT_WEAKEST_LIMITS: WeakestLimits = { pairs: 12, trigrams: 12, words: 20 };

export function weakestPatterns(
  models: { bigrams: ModelMap; trigrams: ModelMap; words: ModelMap },
  layout: HandLayoutPrefs,
  limits: WeakestLimits = DEFAULT_WEAKEST_LIMITS,
): WeakestPatterns {
  const baselines = bigramBaselines(models.bigrams, layout);
  const pairs: HistoryWeakness[] = [];
  for (const [key, st] of models.bigrams) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    if (key.length !== 2) continue;
    const cat = bigramCategory(key[0]!, key[1]!, layout);
    pushWeak(pairs, key, st, weakness(st, baselineForCategory(cat, baselines)));
  }

  const trigramBaseline = baselineMean(models.trigrams);
  const trigrams: HistoryWeakness[] = [];
  for (const [key, st] of models.trigrams) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    pushWeak(trigrams, key, st, weakness(st, trigramBaseline));
  }

  // The word baseline keeps its old meaning (the mean word time) for
  // display; the ranking uses the expected time for each word's length.
  const wordBaseline = baselineMean(models.words);
  const lengthModel = fitWordLengthModel(models.words);
  const words: HistoryWeakness[] = [];
  for (const [key, st] of models.words) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS || key.length < MIN_RANKED_WORD_LENGTH) continue;
    pushWeak(words, key, st, weakness(st, expectedWordMs(lengthModel, key.length)));
  }

  let totalSamples = 0;
  for (const st of models.bigrams.values()) totalSamples += st.n;

  return {
    pairs: topN(pairs, limits.pairs),
    trigrams: topN(trigrams, limits.trigrams),
    words: topN(words, limits.words),
    cold: totalSamples < COLD_BIGRAM_THRESHOLD,
    bigramBaselineMs: baselines.overall,
    trigramBaselineMs: trigramBaseline,
    wordBaselineMs: wordBaseline,
  };
}

/** Words shorter than this are never ranked (one transition is a pair,
 *  which the pair list already covers). */
const MIN_RANKED_WORD_LENGTH = 3;
/** Shortest word that informs the length fit. */
const MIN_FIT_WORD_LENGTH = 2;
/** Fewest word states for the two-parameter fit; below it the
 *  per-transition fallback is steadier. */
export const MIN_FIT_STATES = 10;

/** expected(len) = a + c·(len − 1): `a` absorbs the slower first move
 *  into a word, `c` is the time per further transition. `fitted` is false
 *  when the per-transition fallback is in use (a = 0). */
export type WordLengthModel = { a: number; c: number; fitted: boolean };

/** Weighted least squares of word mean time on transitions (len − 1)
 *  over word states with n ≥ 3 and len ≥ 2, each weighted by min(n, the
 *  EWMA memory). With fewer than MIN_FIT_STATES states, all words of one
 *  length, or a fit with a < 0 or c ≤ 0, it falls back to the weighted
 *  mean time per transition with no intercept. */
export function fitWordLengthModel(words: ModelMap): WordLengthModel {
  const pts: { x: number; y: number; w: number }[] = [];
  for (const [key, st] of words) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS || key.length < MIN_FIT_WORD_LENGTH) continue;
    if (!Number.isFinite(st.mean)) continue;
    pts.push({ x: key.length - 1, y: st.mean, w: Math.min(st.n, EWMA_MEMORY) });
  }
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let perTransition = 0;
  for (const p of pts) {
    sw += p.w;
    sx += p.w * p.x;
    sy += p.w * p.y;
    perTransition += p.w * (p.y / p.x);
  }
  const fallback: WordLengthModel = { a: 0, c: sw > 0 ? perTransition / sw : 0, fitted: false };
  if (pts.length < MIN_FIT_STATES) return fallback;
  const mx = sx / sw;
  const my = sy / sw;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sxx += p.w * (p.x - mx) ** 2;
    sxy += p.w * (p.x - mx) * (p.y - my);
  }
  if (!(sxx > 0)) return fallback;
  const c = sxy / sxx;
  const a = my - c * mx;
  if (a < 0 || !(c > 0)) return fallback;
  return { a, c, fitted: true };
}

/** Expected clean time for a word of `len` characters. */
export function expectedWordMs(m: WordLengthModel, len: number): number {
  return m.a + m.c * (len - 1);
}

function pushWeak(
  out: HistoryWeakness[],
  key: string,
  st: { mean: number; n: number },
  weak: number,
): void {
  if (weak <= 0) return;
  out.push({ key, meanMs: st.mean, weakness: weak, sampleCount: st.n });
}

function topN(list: HistoryWeakness[], n: number): HistoryWeakness[] {
  list.sort((a, b) => b.weakness - a.weakness);
  list.length = Math.min(list.length, n);
  return list;
}
