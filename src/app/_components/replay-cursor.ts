import type { KeyEvent } from "./practice-reducer";

export type ReplayCursor = {
  /** Index of the word the caret is currently in. */
  wordIdx: number;
  /** Chars filled in the active word (caret column). */
  charIdx: number;
  /** Words that carry at least one mistyped character. */
  errorWords: Set<number>;
};

/** Reconstruct the caret position after the first `upTo` keystroke events.
 *
 *  Each `KeyEvent` records the authoritative `wordIndex` it was typed in
 *  (set from `cursorWord` at type time), so the word the caret sits in is
 *  read straight off the last processed event — never re-derived.
 *
 *  The previous implementation guessed word boundaries by counting correct
 *  characters up to `word.length` and only advancing a word once a word was
 *  *completed*. That silently drifts on any imperfect word — a skipped final
 *  letter (spacing early), a wrong character with stop-on-error off, an extra
 *  — because the running count never reaches `word.length`, so the caret
 *  sticks on that word while the real typist moves on. On a 25-word run the
 *  lag is a word or two; on a one-minute timed run (100+ words) it compounds
 *  until the highlighted replay trail bears no relation to what was typed.
 *  Reading `wordIndex` removes the guess entirely.
 */
export function reconstructCursor(
  events: readonly KeyEvent[],
  words: readonly string[],
  upTo: number,
): ReplayCursor {
  const errorWords = new Set<number>();
  const bound = Math.max(0, Math.min(upTo, events.length));
  for (let i = 0; i < bound; i += 1) {
    const e = events[i]!;
    if (!e.correct) errorWords.add(e.wordIndex);
  }
  if (bound === 0) return { wordIdx: 0, charIdx: 0, errorWords };

  const last = events[bound - 1]!;
  const wordIdx = last.wordIndex;
  const wordLen = words[wordIdx]?.length ?? 0;
  // Caret column in the active word: count this word's events in the current
  // contiguous run (events for one word are typed contiguously), capped to
  // the word length so extras / repeated attempts can't push the caret past
  // the word end. Resets every word, so a stray over-count can't accumulate.
  let filled = 0;
  for (let i = bound - 1; i >= 0 && events[i]!.wordIndex === wordIdx; i -= 1) {
    filled += 1;
  }
  const charIdx = wordLen > 0 ? Math.min(filled, wordLen) : filled;
  return { wordIdx, charIdx, errorWords };
}
