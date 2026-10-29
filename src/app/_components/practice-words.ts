import englishWords from "@/data/english.json";
import { type BehaviourPrefs, DEFAULT_BEHAVIOUR } from "@/lib/behaviour-prefs";
import type { Length, Mode } from "./practice-reducer";

/** Word-list helpers for the practice reducer: the seeded generator, the
 *  punctuation and number decoration, the adapt pool and the per-mode
 *  defaults. Pure; split out of `practice-reducer.ts` so the reducer
 *  stays a short state machine. */

export type WordCfg = Pick<BehaviourPrefs, "minWordLength" | "showSecondary"> & {
  /** Optional override for the word pool. When provided, generation
   *  draws from this list instead of the embedded English-200. The
   *  practice provider hands the user's currently-loaded MonkeyType
   *  wordlist in via this field; absence (or empty) falls back to
   *  the embedded set. */
  wordPool?: readonly string[];
};

// Single english word pool — sourced from monkeytype's english.json (top
// ~200 most-frequent words, frequency-ordered). The Lang concept is gone
// from the UI; this is the only WORDS mode source.
const WORD_POOL: readonly string[] = englishWords.words;

// Seeded LCG so SSR & client agree on the initial passage.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const PUNCTUATION = [".", ",", ";", ":", "!", "?"] as const;

function filteredList(cfg: WordCfg): readonly string[] {
  // Casual mode has no length-skew preference — just respect the user's
  // minimum-word-length floor. Adaptive mode picks purely on bigram
  // weakness data, no length skew.
  //
  // `cfg.wordPool` (set by the practice provider after a wordlist
  // fetch resolves) overrides the embedded English-200 default.
  const pool: readonly string[] =
    cfg.wordPool && cfg.wordPool.length > 0 ? cfg.wordPool : WORD_POOL;
  const list = pool.filter((w) => w.length >= cfg.minWordLength);
  return list.length > 0 ? list : pool;
}

export function generateWords(
  count: number,
  seed: number,
  cfg: WordCfg = DEFAULT_BEHAVIOUR,
): string[] {
  const list = filteredList(cfg);
  const rand = seededRandom(seed);
  // Reject back-to-back duplicates — re-roll up to a few times per slot
  // before giving up. With a single-word pool the user has nothing to
  // do but see the same word; we don't infinite-loop on that.
  const base: string[] = [];
  let prev = "";
  for (let i = 0; i < count; i++) {
    let pick = list[Math.floor(rand() * list.length)]!;
    for (let tries = 0; tries < 4 && pick === prev && list.length > 1; tries++) {
      pick = list[Math.floor(rand() * list.length)]!;
    }
    base.push(pick);
    prev = pick;
  }
  return decorate(base, cfg, seed + 1);
}

/** Mix in numbers / trailing punctuation when `showSecondary` is on.
 *  Pulled out so adaptive selections (where the word list is sourced
 *  from the algorithm rather than a local RNG) get the same
 *  decoration the user expects from their behaviour prefs. */
export function decorate(
  words: readonly string[],
  cfg: WordCfg,
  seed: number,
): string[] {
  if (!cfg.showSecondary) return [...words];
  const rand = seededRandom(seed);
  return words.map((w) => {
    const r = rand();
    if (r < 0.08) return Math.floor(rand() * 1000).toString();
    if (r < 0.22) return w + PUNCTUATION[Math.floor(rand() * PUNCTUATION.length)];
    return w;
  });
}

/** The pool the adapt route scores against. Same shape filter as the
 *  local generator, exposed so the bridge can pass it as the candidate
 *  set without re-reading prefs in two places. */
export function adaptPool(cfg: WordCfg): readonly string[] {
  return filteredList(cfg);
}

/** TIME mode generates a long buffer up front so even fast typists never
 *  run out before the timer expires. 300 words at 200 wpm ≈ 90 s of
 *  typing, which covers every supported duration with margin. */
export const TIME_BUFFER = 300;

/** TIME mode tops the buffer up while the cursor is still this many
 *  words from the end. Generous on purpose: it must comfortably exceed
 *  the most words the visible window can ever show, so the passage
 *  ahead of the cursor is never starved — even a 250 wpm typist has
 *  ~30 s of runway before the next refill is needed. The append fires
 *  once per crossing (it pushes the remaining count far back above the
 *  threshold), so there's no per-keystroke churn. */
export const TIME_REFILL_AHEAD = 120;

export function generateForMode(
  mode: Mode,
  length: Length,
  cfg: WordCfg,
): string[] {
  if (mode === "TIME") return generateWords(TIME_BUFFER, Date.now(), cfg);
  if (mode === "WORDS") return generateWords(length, Date.now(), cfg);
  if (mode === "BURST") {
    // BURST is "type N words at threshold WPM, one at a time" — the
    // burst engine reads `state.words` directly as its item list.
    // No `decorate` pass: numbers + punctuation are noisy when each
    // item has to clear a WPM threshold on its own.
    return generateWords(length, Date.now(), { ...cfg, showSecondary: false });
  }
  // QUOTE — words come from an async fetch; placeholder until SET_QUOTE.
  return [];
}

export function quoteToWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** The WORDS length a fresh page starts on. */
export const INITIAL_LENGTH: Length = 25;

/** Per-mode default for `length` when the user switches modes. */
export function defaultLengthFor(mode: Mode): Length {
  if (mode === "TIME") return 30;
  if (mode === "QUOTE") return 1; // medium
  if (mode === "BURST") return 40;
  return INITIAL_LENGTH;
}
