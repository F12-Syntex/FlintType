/** Char-offset of the caret within the joined passage (`words.join(" ")`)
 *  for a practice run — how many characters the typist has advanced past.
 *  Each word fully behind the cursor contributes its length plus the one
 *  space that follows it; the active word contributes `cursorChar`. The
 *  result is clamped to the passage length so an over-typed word (extras)
 *  or the done state can't report past the end.
 *
 *  Pure — the live-broadcast stream maps practice state to the
 *  `progressChars` a spectator renders. Tested in isolation. */
export function practiceProgressChars(state: {
  words: readonly string[];
  cursorWord: number;
  cursorChar: number;
}): number {
  const { words, cursorWord, cursorChar } = state;
  const upTo = Math.min(Math.max(0, cursorWord), words.length);
  let chars = 0;
  for (let i = 0; i < upTo; i++) chars += (words[i]?.length ?? 0) + 1; // +1 = trailing space
  chars += Math.max(0, cursorChar);
  const total = words.join(" ").length;
  return Math.max(0, Math.min(chars, total));
}

export type LiveSnapshotShape = {
  words: string[];
  progressChars: number;
  totalChars: number;
};

/** Map a practice run to the wire shape a spectator renders, windowed so
 *  it never exceeds `maxWords` (the `live.progress` schema cap). Bounded
 *  passages (WORDS / QUOTE / short) pass through whole; an unbounded TIME
 *  run whose buffer has grown past the cap is trimmed to a window around
 *  the caret, with the cursor offset re-based into that window. Without
 *  this the array blows past the cap and every push 400s, silently
 *  killing the live stream for the rest of the run. Pure. */
export function liveSnapshotWindow(
  state: { words: readonly string[]; cursorWord: number; cursorChar: number },
  maxWords: number,
): LiveSnapshotShape {
  const { words, cursorWord, cursorChar } = state;
  if (words.length <= maxWords) {
    return {
      words: [...words],
      progressChars: practiceProgressChars(state),
      totalChars: words.join(" ").length,
    };
  }
  // Keep the caret ~70% of the way into the window so the typist's recent
  // words and a little lookahead are both visible.
  const lead = Math.floor(maxWords * 0.7);
  let start = Math.max(0, Math.max(0, cursorWord) - lead);
  if (start + maxWords > words.length) start = Math.max(0, words.length - maxWords);
  const win = words.slice(start, start + maxWords);
  return {
    words: win,
    progressChars: practiceProgressChars({
      words: win,
      cursorWord: cursorWord - start,
      cursorChar,
    }),
    totalChars: win.join(" ").length,
  };
}
