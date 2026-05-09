import { EN_COMMON_1000 } from "@/data/en-common-1000";
import englishWords from "@/data/english.json";
import type { HistoryWeakness } from "@/types/history";

/** Drills split into two groups by where their data comes from:
 *    tailored — built from the user's typing model (weakest pairs,
 *               weakest trigrams). Locked until enough data exists.
 *    generic  — curated word/item lists that work for everyone, with
 *               or without a model. Always ready.
 *  The view groups cards by category so the user can see at a glance
 *  which drills are personal and which are universal. */
export type DrillCategory = "tailored" | "generic";

/** A drill is one of two engine kinds. The picker reads `kind` and
 *  feeds the right runner. Each kind carries the data its engine
 *  needs — a passage of words, an item list with a threshold, etc. */
export type DrillSpec =
  | {
      id: string;
      kind: "sudden-death";
      category: DrillCategory;
      title: string;
      contextLabel: string;
      description: string;
      payoff: string;
      ready: boolean;
      words: readonly string[];
    }
  | {
      id: string;
      kind: "burst";
      category: DrillCategory;
      title: string;
      contextLabel: string;
      description: string;
      payoff: string;
      ready: boolean;
      items: readonly string[];
      thresholdWpm: number;
      repsPerItem: number;
    };

/** Curated tongue-twister set — words with awkward bigram density and
 *  cross-hand letter pairs. Hand-picked rather than generated so the
 *  list stays sharp and predictable. */
export const TRICKY_WORDS: readonly string[] = [
  "rhythm", "myth", "syzygy", "queue", "bivouac", "phlegm",
  "schism", "subtle", "gnaw", "knack", "wreath", "psalm",
  "yacht", "draught", "scythe", "twelfth", "strengths",
  "sphinx", "thwart", "sequoia", "axiom", "exquisite",
  "zephyr", "knapsack", "wrought", "khaki", "gauche",
  "kowtow", "marquee", "obsequious", "paradigm",
  "rendezvous", "subterfuge", "ubiquitous", "vortex",
  "xylophone", "zymurgy", "cataclysm", "diaphragm",
  "ephemera", "fjord", "ghastly", "haphazard", "iambic",
  "jaunt", "lethargy", "musket", "nymph", "pneumatic",
  "quagmire", "raucous", "tundra", "vexillology",
] as const;

/** Common trigrams worth drilling — heavy in English usage and
 *  benefit from finger-memory rep more than they do from contextual
 *  practice. Sorted roughly by frequency. */
export const HIGH_VALUE_TRIGRAMS: readonly string[] = [
  "the", "ing", "and", "ion", "tio",
  "ent", "for", "ere", "ate", "all",
  "her", "ter", "est", "ers",
  "his", "ith", "ver", "ith",
] as const;

/** Classic pangrams — every letter of the alphabet, no exotic
 *  vocabulary. Burst-target list because hitting threshold WPM on a
 *  pangram is a clean signal that every key is wired in. */
export const PANGRAM_LIST: readonly string[] = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "sphinx of black quartz judge my vow",
  "the five boxing wizards jump quickly",
  "jackdaws love my big sphinx of quartz",
  "amazingly few discotheques provide jukeboxes",
  "crazy fredrick bought many very exquisite opal jewels",
] as const;

/** Sentences mixing letters with numbers and basic punctuation —
 *  drills the under-practised number row and the comma/period reach
 *  without being so contrived that the hands can't flow. */
export const NUMBERS_AND_SYMBOLS: readonly string[] = [
  "Order 12 boxes by 5pm; ship the rest on Monday.",
  "She typed 90 wpm, paused, then hit 102 on the next run.",
  "Add 3.14 to your column, divide by 7, and round it off.",
  "We met at 8:45 — 30 minutes late for the 9:15 train.",
  "Pay the $42 invoice, then forward the receipt to me.",
  "Run 25 reps, rest for 60s, then go again — 4 sets total.",
  "Versions 1.2.4 and 2.0.0 ship on the same day, no delays.",
  "Email me at user@host.com after the 4th of November.",
] as const;

const POOL: readonly string[] = englishWords.words;

/** Bigrams that show up in almost every word. Skipping them keeps
 *  the weakness drill *targeted* — drilling "th" specifically is
 *  pointless when every regular passage drills it for free. */
const COMMON_BIGRAMS = new Set([
  "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd",
  "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar",
  "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le",
  "ve", "co", "me", "de",
]);

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

const DEFAULT_BURST_THRESHOLD_WPM = 60;
const SPRINT_BURST_THRESHOLD_WPM = 50;
const SUDDEN_DEATH_LENGTH = 30;
const TRICKY_DRILL_LENGTH = 35;
const TRIGRAM_REPS = 5;
const WORD_BURST_REPS = 3;
const WORD_BURST_LENGTH = 25;
const SPRINT_BURST_LENGTH = 40;
const PANGRAM_REPS = 1;

/** Build a passage of `count` words containing the user's top weak
 *  bigrams, evenly distributed. */
function generateWeaknessPassage(
  weakest: readonly HistoryWeakness[],
  count: number,
  seed: number,
): string[] {
  if (weakest.length === 0) return [];
  const targets = weakest
    .filter((w) => !COMMON_BIGRAMS.has(w.key))
    .slice(0, 6);
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

/** Sample tricky words without replacement until count is filled. */
function generateTrickyPassage(count: number, seed: number): string[] {
  const pool = [...TRICKY_WORDS];
  shuffleInPlace(pool, seededRng(seed));
  if (count <= pool.length) return pool.slice(0, count);
  const out: string[] = [];
  let i = 0;
  while (out.length < count) {
    out.push(pool[i % pool.length]!);
    i++;
  }
  return out;
}

/** Pull common 3-5 char words from the top-1000 set as the burst
 *  drill's items. Short words keep each attempt under a second so
 *  the cadence stays tight. */
function pickBurstWords(count: number, seed: number): string[] {
  const candidates = EN_COMMON_1000.filter(
    (w) => w.length >= 3 && w.length <= 5,
  );
  const pool = [...candidates];
  shuffleInPlace(pool, seededRng(seed));
  return pool.slice(0, count);
}

/** Top-N user weakness trigrams worth drilling, falling back to the
 *  HIGH_VALUE_TRIGRAMS curated list when we don't have enough user
 *  signal. */
function pickWeaknessTrigrams(
  weakestTrigrams: readonly { key: string }[] | undefined,
  count: number,
): string[] {
  const userPicks = (weakestTrigrams ?? [])
    .map((t) => t.key)
    .filter((k) => k.length === 3)
    .slice(0, count);
  if (userPicks.length >= count) return userPicks;
  // Pad with curated trigrams the user hasn't already had.
  const seen = new Set(userPicks);
  for (const t of HIGH_VALUE_TRIGRAMS) {
    if (userPicks.length >= count) break;
    if (seen.has(t)) continue;
    userPicks.push(t);
    seen.add(t);
  }
  return userPicks;
}

/** All drills the picker offers, in display order. Snapshot-aware
 *  drills (weakness, trigram-burst) gracefully degrade when the
 *  user is cold — they surface a "not enough data yet" card and
 *  the start button stays disabled. */
export function buildDrills({
  weakestPairs,
  weakestTrigrams,
  cold,
  seed,
}: {
  weakestPairs: readonly HistoryWeakness[];
  weakestTrigrams?: readonly { key: string }[];
  cold: boolean;
  seed: number;
}): DrillSpec[] {
  const personalReady = !cold && weakestPairs.length > 0;
  const trigrams = pickWeaknessTrigrams(weakestTrigrams, 6);
  const trigramTailored = (weakestTrigrams ?? []).length > 0;
  const drills: DrillSpec[] = [];

  // ─── Tailored ─────────────────────────────────────────────────────
  // Built from the user's typing model. Locked when the model is too
  // cold; the locked card explains what unlocks it.

  drills.push(
    personalReady
      ? {
          id: "weakness",
          kind: "sudden-death",
          category: "tailored",
          title: "Weakness gauntlet",
          contextLabel: "Sudden death",
          description: `A passage built from your slowest bigrams: ${weakestPairs.slice(0, 4).map((w) => `"${w.key}"`).join(", ")}. Clear it without a single mistake — one wrong key sends you back to word one.`,
          payoff: "Sudden-death enforces accuracy where you're already slow. Your brain locks in the cleaner motion when error is non-negotiable.",
          ready: true,
          words: generateWeaknessPassage(weakestPairs, SUDDEN_DEATH_LENGTH, seed),
        }
      : {
          id: "weakness",
          kind: "sudden-death",
          category: "tailored",
          title: "Weakness gauntlet",
          contextLabel: "Sudden death",
          description:
            "Once we've seen enough of your typing to identify weak bigrams, this drill will build a passage around them and demand a clean run.",
          payoff: "Drilling your weakest pairs under sudden-death pressure is the highest-leverage path to a higher overall WPM.",
          ready: false,
          words: [],
        },
  );

  drills.push({
    id: "trigram-burst",
    kind: "burst",
    category: "tailored",
    title: "Trigram burst",
    contextLabel: "Burst minigame",
    description: trigramTailored
      ? `Drill 3-letter clusters from your weakest trigrams: ${trigrams.map((t) => `"${t}"`).join(", ")}. ${TRIGRAM_REPS} clean bursts above ${DEFAULT_BURST_THRESHOLD_WPM} WPM advance to the next.`
      : `Drill the highest-value English trigrams: ${trigrams.map((t) => `"${t}"`).join(", ")}. Once we've seen more of your typing this list will swap for your weakest trigrams.`,
    payoff: "Trigram cadence scales straight into word-level speed — three letters at threshold becomes a whole word at threshold once joined up.",
    ready: trigrams.length > 0,
    items: trigrams,
    thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
    repsPerItem: TRIGRAM_REPS,
  });

  // ─── Generic ──────────────────────────────────────────────────────
  // Curated lists that always work, regardless of model state.

  drills.push({
    id: "burst-1000",
    kind: "burst",
    category: "generic",
    title: "Burst 1000",
    contextLabel: "Burst minigame",
    description: `Type each common word ${WORD_BURST_REPS} times in a row above ${DEFAULT_BURST_THRESHOLD_WPM} WPM to advance. A miss or a slow attempt resets the streak — but you keep moving.`,
    payoff: "Builds the rapid-fire muscle memory that lifts your peak WPM, without the punitive sudden-death gate.",
    ready: true,
    items: pickBurstWords(WORD_BURST_LENGTH, seed),
    thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
    repsPerItem: WORD_BURST_REPS,
  });

  drills.push({
    id: "tricky",
    kind: "sudden-death",
    category: "generic",
    title: "Tongue-twister gauntlet",
    contextLabel: "Sudden death",
    description:
      "A curated set of awkward words — silent letters, cross-hand jumps, doubled clusters. Clean run or back to the start.",
    payoff: "Universal — no model required. Useful for warm-up or whenever the personal drill is unavailable.",
    ready: true,
    words: generateTrickyPassage(TRICKY_DRILL_LENGTH, seed + 1),
  });

  drills.push({
    id: "pangrams",
    kind: "burst",
    category: "generic",
    title: "Pangram sprint",
    contextLabel: "Burst minigame",
    description: `Hit ${SPRINT_BURST_THRESHOLD_WPM} WPM on a full pangram, ${PANGRAM_REPS} clean run per sentence. Eight sentences total — every letter of the alphabet across the set.`,
    payoff: "Whole-sentence threshold practice is the closest drill to a real test — flow, punctuation, and every letter row in one pass.",
    ready: true,
    items: PANGRAM_LIST,
    thresholdWpm: SPRINT_BURST_THRESHOLD_WPM,
    repsPerItem: PANGRAM_REPS,
  });

  drills.push({
    id: "numbers-symbols",
    kind: "sudden-death",
    category: "generic",
    title: "Numbers & symbols",
    contextLabel: "Sudden death",
    description:
      "A passage of short sentences threaded with numbers, dashes, colons, and dollar signs. The keys you skim past in normal practice — drilled clean.",
    payoff: "Almost every typist's accuracy collapses on the number row and the punctuation cluster. Honest reps under sudden-death plug the gap fast.",
    ready: true,
    words: numbersAndSymbolsAsWords(seed + 2),
  });

  drills.push({
    id: "top-100-sprint",
    kind: "burst",
    category: "generic",
    title: "Top 100 sprint",
    contextLabel: "Burst minigame",
    description: `Forty of the hundred most common English words at a friendlier ${SPRINT_BURST_THRESHOLD_WPM} WPM threshold, ${WORD_BURST_REPS} reps each. The warm-up before harder bursts.`,
    payoff: "Re-anchors the muscle memory on words you type every day. Hit threshold here and the harder drills feel achievable.",
    ready: true,
    items: pickBurstWords(SPRINT_BURST_LENGTH, seed + 3),
    thresholdWpm: SPRINT_BURST_THRESHOLD_WPM,
    repsPerItem: WORD_BURST_REPS,
  });

  return drills;
}

/** Flatten the NUMBERS_AND_SYMBOLS sentences into a single
 *  shuffled-order word list for the sudden-death engine. The engine
 *  takes a `readonly string[]` of words; sentences are split on
 *  whitespace and concatenated, with order randomised by `seed` so
 *  the drill changes between mounts. */
function numbersAndSymbolsAsWords(seed: number): string[] {
  const sentences = [...NUMBERS_AND_SYMBOLS];
  shuffleInPlace(sentences, seededRng(seed));
  return sentences.flatMap((s) => s.split(/\s+/).filter(Boolean));
}
