/** A practice-state slice that reveals exactly `chars` characters of a
 *  passage: which word/char the caret sits at, and the per-word typed
 *  text revealed up to there (full for completed words, partial for the
 *  caret's word, empty after). Pure.
 *
 *  The live-spectate view eases the `chars` value frame by frame (see
 *  useSmoothChars) so the spectated caret glides through the text one
 *  character at a time instead of jumping between server snapshots. */
export type Revealed = {
  cursorWord: number;
  cursorChar: number;
  typed: string[];
};

export function revealAt(
  words: readonly string[],
  typed: readonly string[],
  chars: number,
): Revealed {
  const total = words.join(" ").length;
  let c = Math.max(0, Math.min(Math.round(chars), total));
  let cursorWord = words.length;
  let cursorChar = 0;
  for (let i = 0; i < words.length; i++) {
    const wlen = words[i]?.length ?? 0;
    if (c <= wlen) {
      cursorWord = i;
      cursorChar = c;
      break;
    }
    c -= wlen + 1; // consume the word and its trailing space
    if (c < 0) {
      // landed on the space between word i and i+1 → start of i+1
      cursorWord = i + 1;
      cursorChar = 0;
      break;
    }
  }
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i < cursorWord) out.push(typed[i] ?? "");
    else if (i === cursorWord) out.push((typed[i] ?? "").slice(0, cursorChar));
    else out.push("");
  }
  return { cursorWord, cursorChar, typed: out };
}
