import englishWords from "@/data/english.json";
import type { HistoryWeakness } from "@/types/history";

/** Curated tongue-twister set — words with awkward bigram density and
 *  cross-hand letter pairs. Hand-picked rather than generated so the
 *  list stays sharp and predictable. ~80 entries gives a varied
 *  passage at any drill length up to 80 words. */
export const TRICKY_WORDS: readonly string[] = [
  "rhythm", "myth", "syzygy", "queue", "bivouac", "phlegm",
  "schism", "subtle", "gnaw", "knack", "wreath", "psalm",
  "yacht", "draught", "scythe", "twelfth", "strengths",
  "sphinx", "thwart", "queueing", "sixths", "fifths", "judges",
  "sequoia", "axiom", "exquisite", "zephyr", "knapsack",
  "wrought", "phlegmatic", "asphyxia", "khaki", "eponym",
  "ennui", "gauche", "kowtow", "lyrebird", "marquee",
  "obsequious", "paradigm", "quintessence", "rendezvous",
  "subterfuge", "tycoon", "ubiquitous", "vortex", "waltz",
  "xylophone", "yew", "zymurgy", "abrupt", "byzantine",
  "cataclysm", "diaphragm", "ephemera", "fjord", "ghastly",
  "haphazard", "iambic", "jaunt", "kabuki", "lethargy",
  "musket", "nymph", "ouija", "pneumatic", "quagmire",
  "raucous", "scrawny", "tundra", "unguent", "vexillology",
  "wharf", "xenophobe", "yawl", "zealous",
] as const;

/** Stop-word filter — bigrams to skip when picking weakness drill
 *  targets. They turn up in almost every word, which would defeat
 *  the "drill the weak pair specifically" idea. */
const COMMON_BIGRAMS = new Set([
  "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd",
  "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar",
  "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le",
  "ve", "co", "me", "de",
]);

const POOL: readonly string[] = englishWords.words;

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Pick `count` words containing the user's top weak bigrams. Skips
 *  bigrams that are too common to drill ("th" is in everything; the
 *  user can't avoid it during a regular session anyway), and falls
 *  back to next-rank weaknesses when the top one would yield no hits.
 *  Output is shuffled with a deterministic seed so each drill instance
 *  reads as a fresh ordering. */
export function generateWeaknessDrill(
  weakest: readonly HistoryWeakness[],
  count: number,
  seed: number = Date.now(),
): string[] {
  if (weakest.length === 0) return [];
  const targets = weakest.filter((w) => !COMMON_BIGRAMS.has(w.key)).slice(0, 6);
  if (targets.length === 0) return [];
  const buckets: string[][] = targets.map((t) =>
    POOL.filter((w) => w.toLowerCase().includes(t.key)),
  );
  // Per-bigram quota — split the count evenly across the chosen
  // weaknesses so the drill is genuinely a multi-pair workout, not
  // 80% words containing the single worst pair.
  const out: string[] = [];
  const rng = seededRng(seed);
  let bi = 0;
  let attempts = 0;
  while (out.length < count && attempts < count * 10) {
    const bucket = buckets[bi % buckets.length];
    bi++;
    attempts++;
    if (!bucket || bucket.length === 0) continue;
    const w = bucket[Math.floor(rng() * bucket.length)]!;
    // Avoid back-to-back duplicates — repeating the same word twice in
    // a row reads as a glitch even when the bucket is small.
    if (out[out.length - 1] === w) continue;
    out.push(w);
  }
  return out;
}

/** Tricky-word drill — sample without replacement until the count is
 *  filled or we run out of tricky words. */
export function generateTrickyDrill(
  count: number,
  seed: number = Date.now(),
): string[] {
  const pool = [...TRICKY_WORDS];
  shuffleInPlace(pool, seededRng(seed));
  if (count <= pool.length) return pool.slice(0, count);
  // Wrap around so longer drills still fill — at the cost of repeats.
  const out: string[] = [];
  let i = 0;
  while (out.length < count) {
    out.push(pool[i % pool.length]!);
    i++;
  }
  return out;
}
