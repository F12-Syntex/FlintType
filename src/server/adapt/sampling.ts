/** Weighted sampling primitives for passage selection. */

/** Coverage decay base. During selection, each weak pattern (weak
 *  bigram, weak motor-feature, or still-exploring bigram) a word
 *  touches is down-weighted by this factor once another word in the
 *  passage already covers it — and, through `spacing.ts`, partially
 *  when recent tests already drilled it. So the first carrier of a
 *  weak motion keeps full weight and a word sharing k covered patterns
 *  is worth 0.4^k of its score. The net effect is a passage that
 *  spreads across the user's top weak motions instead of stacking
 *  carriers of the single weakest one. < 1 so overlap always shrinks
 *  weight; not so small that one weak pattern can never repeat. */
export const COVERAGE_DECAY = 0.4;

/** Weighted random sampling without replacement. Picks `count` words
 *  biased by weight; falls back to uniform random once every remaining
 *  weight is zero (cold start). The coverage-free sibling of
 *  `pickWithCoverage`. */
export function sampleWeighted(
  candidates: readonly { word: string; weight: number }[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  const pool = [...candidates];
  const out: string[] = [];
  const target = Math.min(count, pool.length);
  for (let pick = 0; pick < target; pick++) {
    const idx = weightedPickIndex(
      pool.map((c) => c.weight),
      rng,
    );
    out.push(pool[idx]!.word);
    pool.splice(idx, 1);
  }
  return out;
}

/** One selectable candidate: its sampling weight and the weak /
 *  exploring pattern keys it carries (see `select.ts`). */
export type CoverageItem = {
  word: string;
  weight: number;
  patterns: readonly string[];
};

/** Weighted random sampling without replacement, damped by pattern
 *  overlap. Each candidate's weight is multiplied by
 *  COVERAGE_DECAY^(Σ overlap of its patterns), where a pattern's overlap
 *  starts at `initialOverlap` (0–1, how heavily recent tests already
 *  drilled it — see `spacing.ts`) and becomes 1 once a word in this
 *  passage covers it. */
export function pickWithCoverage(
  items: readonly CoverageItem[],
  count: number,
  rng: () => number = Math.random,
  initialOverlap: ReadonlyMap<string, number> = new Map(),
): string[] {
  if (items.length === 0) return [];
  const pool = [...items];
  const overlap = new Map(initialOverlap);
  const out: string[] = [];
  const target = Math.min(count, pool.length);
  for (let pick = 0; pick < target; pick++) {
    const weights = pool.map((p) => {
      let o = 0;
      for (const pat of p.patterns) o += overlap.get(pat) ?? 0;
      return Math.max(0, p.weight) * COVERAGE_DECAY ** o;
    });
    const idx = weightedPickIndex(weights, rng);
    const chosen = pool[idx]!;
    out.push(chosen.word);
    for (const pat of chosen.patterns) overlap.set(pat, 1);
    pool.splice(idx, 1);
  }
  return out;
}

/** Pick one index from a weight array, biased by weight. Falls back to
 *  uniform random when every weight is zero (cold sub-pool). */
export function weightedPickIndex(
  weights: readonly number[],
  rng: () => number,
): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total === 0) return Math.floor(rng() * weights.length);
  // Zero-weight entries are skipped outright: with r landing on exactly
  // 0 the old loop returned index 0 even when it carried no weight.
  // The fallback (float leftovers past the last subtraction) likewise
  // returns the last *positive* entry.
  let r = rng() * total;
  let last = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i]!;
    if (!(w > 0)) continue;
    last = i;
    r -= w;
    if (r <= 0) return i;
  }
  return last;
}
