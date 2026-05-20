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
