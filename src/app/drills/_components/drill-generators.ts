import { EN_COMMON_1000 } from "@/data/en-common-1000";
import englishWords from "@/data/english.json";
import type { HistoryWeakness } from "@/types/history";
import {
  COMMON_BIGRAMS,
  HIGH_VALUE_TRIGRAMS,
  NUMBERS_AND_SYMBOLS,
  TRICKY_WORDS,
} from "./drill-lists";

/** Seeded passage and item generators for the drill builders. Every
 *  function is deterministic per (input, seed), so a visit gets a
 *  fresh selection while tests stay reproducible. */

const POOL: readonly string[] = englishWords.words;

export function seededRng(seed: number): () => number {
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

/** Repeat a shuffled pool until `count` items are filled. */
function fillFrom(pool: readonly string[], count: number): string[] {
  if (count <= pool.length) return pool.slice(0, count);
  const out: string[] = [];
  for (let i = 0; out.length < count; i++) out.push(pool[i % pool.length]!);
  return out;
}

/** A passage of `count` words containing the user's top weak bigrams,
 *  evenly distributed. */
export function generateWeaknessPassage(
  weakest: readonly HistoryWeakness[],
  count: number,
  seed: number,
): string[] {
  if (weakest.length === 0) return [];
  const targets = weakest.filter((w) => !COMMON_BIGRAMS.has(w.key)).slice(0, 6);
  if (targets.length === 0) return [];
  const buckets: string[][] = targets.map((t) =>
    POOL.filter((w) => w.toLowerCase().includes(t.key)),
  );
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
    if (out[out.length - 1] === w) continue;
    out.push(w);
  }
  return out;
}

/** Tricky words sampled without replacement until `count` is filled. */
export function generateTrickyPassage(count: number, seed: number): string[] {
  const pool = [...TRICKY_WORDS];
  shuffleInPlace(pool, seededRng(seed));
  return fillFrom(pool, count);
}

/** Short (3 to 5 letter) common words from the top-1000 set. Short
 *  words keep each attempt under a second so the cadence stays tight. */
export function pickBurstWords(count: number, seed: number): string[] {
  const pool = EN_COMMON_1000.filter((w) => w.length >= 3 && w.length <= 5);
  shuffleInPlace(pool, seededRng(seed));
  return pool.slice(0, count);
}

/** Words from the same English pool single-player and races draw from. */
export function pickEnglishBurstWords(count: number, seed: number): string[] {
  const pool = [...POOL];
  shuffleInPlace(pool, seededRng(seed));
  return fillFrom(pool, count);
}

/** The user's top weak trigrams, padded with curated high-value
 *  trigrams when there isn't enough signal yet. */
export function pickWeaknessTrigrams(
  weakestTrigrams: readonly { key: string }[] | undefined,
  count: number,
): string[] {
  const picks = (weakestTrigrams ?? [])
    .map((t) => t.key)
    .filter((k) => k.length === 3)
    .slice(0, count);
  if (picks.length >= count) return picks;
  const seen = new Set(picks);
  for (const t of HIGH_VALUE_TRIGRAMS) {
    if (picks.length >= count) break;
    if (seen.has(t)) continue;
    picks.push(t);
    seen.add(t);
  }
  return picks;
}

/** The numbers-and-symbols sentences, shuffled by `seed` and split
 *  into one word list for the sudden-death engine. */
export function numbersAndSymbolsAsWords(seed: number): string[] {
  const sentences = [...NUMBERS_AND_SYMBOLS];
  shuffleInPlace(sentences, seededRng(seed));
  return sentences.flatMap((s) => s.split(/\s+/).filter(Boolean));
}
