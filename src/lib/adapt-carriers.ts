/** Isolation-drill carrier finder. Given a weak pattern (a bigram or
 *  trigram) and a word pool, returns varied real words that contain
 *  the pattern — the raw material for a keybr-style drill that hammers
 *  one motion across many words rather than re-drilling a single word.
 *
 *  Isomorphic (no React, no server deps) so it's safe to call from the
 *  drills page during client-side drill assembly. */

/** Length window for carriers. Short enough that each burst rep stays
 *  under a second (so the cadence stays tight), long enough to give
 *  the motion some surrounding context rather than the bare pattern. */
const MIN_CARRIER_LEN = 3;
const MAX_CARRIER_LEN = 8;

/** Small self-contained LCG so the selection is reproducible per
 *  (pattern, seed) but varies between visits. There is no shared
 *  seeded-RNG helper in the repo — it's duplicated privately in a
 *  couple of call sites — so this carries its own rather than coupling
 *  to one of them. */
function seededRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export function findCarrierWords(
  pattern: string,
  pool: readonly string[],
  count: number,
  seed: number,
): string[] {
  const needle = pattern.toLowerCase();
  if (needle.length === 0 || count <= 0) return [];

  const seen = new Set<string>();
  const matches: string[] = [];
  for (const raw of pool) {
    const w = raw.toLowerCase();
    if (w.length < MIN_CARRIER_LEN || w.length > MAX_CARRIER_LEN) continue;
    if (!w.includes(needle)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    matches.push(w);
  }

  // Seeded Fisher-Yates, then cap. Shuffling the full match set before
  // slicing means a re-visit with a new seed yields a fresh sample of
  // the same pattern's carriers.
  const rng = seededRng(seed);
  for (let i = matches.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [matches[i], matches[j]] = [matches[j]!, matches[i]!];
  }
  return matches.slice(0, count);
}
