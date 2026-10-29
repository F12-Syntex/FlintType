/** The words the post-race recap shows, and which of them were left
 *  wrong.
 *
 *  - A word before the cursor is wrong when what was typed differs from
 *    it. The word under the cursor is only wrong once it stops being a
 *    prefix of the target: a timed race's buzzer ends the run mid-word,
 *    and a correct half-typed word ("to" of "too") wasn't left wrong.
 *  - A timed race sends far more words than anyone reaches (a buffer of
 *    about four per second), so its recap stops at the reached span:
 *    your own cursor, or for a watcher the furthest racer's. Word and
 *    quote races always show the whole passage. */
export function recapWords(
  words: readonly string[],
  run: { typed: readonly string[]; cursorWord: number } | null,
  options: { timed: boolean; furthestChars: number },
): { shown: readonly string[]; wrong: readonly boolean[] } {
  const reached = options.timed
    ? run
      ? run.cursorWord + ((run.typed[run.cursorWord] ?? "").length > 0 ? 1 : 0)
      : wordsStartedBefore(words, options.furthestChars)
    : words.length;
  const shown = words.slice(0, Math.min(words.length, Math.max(1, reached)));
  const wrong = shown.map((w, i) => {
    if (!run || i > run.cursorWord) return false;
    const t = run.typed[i] ?? "";
    if (t.length === 0) return false;
    return i < run.cursorWord ? t !== w : !w.startsWith(t);
  });
  return { shown, wrong };
}

/** How many words begin before character `chars` of the passage
 *  (words joined by single spaces), i.e. how far a racer whose cursor
 *  sits at `chars` has got, counting a word they're partway through. */
export function wordsStartedBefore(words: readonly string[], chars: number): number {
  let start = 0;
  let count = 0;
  for (const w of words) {
    if (start >= chars) break;
    count++;
    start += w.length + 1;
  }
  return count;
}
