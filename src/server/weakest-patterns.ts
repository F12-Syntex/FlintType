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
import type { HistoryWeakness } from "@/types/history";

/** The user's weakest patterns, ranked by the model's `weakness` value:
 *  letter pairs against their mechanical category's baseline, letter
 *  triples against the trigram baseline, and words against the word
 *  baseline. Owner-only data (history.summary, the insights practice
 *  lists): it is derived from keystroke timing and is never served on a
 *  public profile. */
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

  const wordBaseline = baselineMean(models.words);
  const words: HistoryWeakness[] = [];
  for (const [key, st] of models.words) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    pushWeak(words, key, st, weakness(st, wordBaseline));
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
