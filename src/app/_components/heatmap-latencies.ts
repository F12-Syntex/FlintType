import type { KeyEvent } from "./practice-reducer";

/** Per-letter latency map for the results passage heatmap, keyed `"w:c"`
 *  (word index : char column). The value is the ms since the previous
 *  correct keystroke.
 *
 *  Keyed on each event's authoritative `wordIndex` (set from `cursorWord`
 *  at type time), NOT a guessed sequential walk. The old walk advanced the
 *  word only once a word's correct-char count reached `word.length`, so it
 *  silently drifted — a skipped word (space typed early), a wrong char with
 *  stop-on-error off, or a backspace-retype left it stranded mid-word and
 *  every later latency landed on the wrong letter (FT-066). This is the
 *  same drift `reconstructCursor` was rewritten to kill by reading
 *  `wordIndex`; the column counter resets on every word change so a stray
 *  over-count (a retype/extra within a word) can never propagate past that
 *  word, and it's capped at the word length so it can't overflow into the
 *  next word's positions. */
export function buildHeatmapLatencies(
  words: readonly string[],
  events: readonly KeyEvent[],
): Map<string, number> {
  const map = new Map<string, number>();
  let curWord = -1;
  let col = 0;
  let prevT = 0;
  for (const e of events) {
    if (e.wordIndex !== curWord) {
      curWord = e.wordIndex;
      col = 0;
    }
    const word = words[curWord];
    if (word && e.correct && col < word.length) {
      map.set(`${curWord}:${col}`, Math.max(0, e.t - prevT));
    }
    if (e.correct) prevT = e.t;
    // Advance the column for any printable attempt in the word — a wrong
    // char (stop-on-error off) still moves the real cursor — mirroring
    // reconstructCursor's contiguous-run count.
    col += 1;
  }
  return map;
}
