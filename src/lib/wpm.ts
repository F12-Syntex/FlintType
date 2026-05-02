/** WPM, raw and accuracy maths — ported directly from monkeytype's
 *  `frontend/src/ts/test/test-stats.ts` (the `countChars` +
 *  `calculateWpmAndRaw` pair). The contract:
 *
 *    wpm  = (correctWordChars + correctSpaces) × 60 / testSeconds / 5
 *    raw  = (allCorrectChars + spaces + incorrectChars + extraChars) × 60 / testSeconds / 5
 *
 *  …where "correct word chars" only count for words whose typed string
 *  exactly matches the target. The trailing space after a perfect word
 *  also counts. This is what every other typing-test site does, so the
 *  number lines up with monkeytype / 10ff / etc. */

export type CharCount = {
  correctWordChars: number;
  allCorrectChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  spaces: number;
  correctSpaces: number;
};

/** Walk every word the user has touched and tally chars exactly the way
 *  monkeytype's `countChars` does. `final = true` mirrors monkeytype's
 *  end-of-test behaviour for incomplete words. */
export function countChars(
  typed: readonly string[],
  target: readonly string[],
  final = true,
): CharCount {
  let correctWordChars = 0;
  let allCorrectChars = 0;
  let incorrectChars = 0;
  let extraChars = 0;
  let missedChars = 0;
  let spaces = 0;
  let correctSpaces = 0;

  for (let i = 0; i < typed.length; i += 1) {
    const inputWord = typed[i] ?? "";
    const targetWord = target[i] ?? "";

    if (inputWord === targetWord) {
      correctWordChars += targetWord.length;
      allCorrectChars += targetWord.length;
      if (i < typed.length - 1) correctSpaces += 1;
    } else if (inputWord.length >= targetWord.length) {
      // typed at least as much as the target — count the matching
      // prefix chars correct, the rest incorrect, and any tail extras.
      for (let c = 0; c < inputWord.length; c += 1) {
        if (c < targetWord.length) {
          if (inputWord[c] === targetWord[c]) allCorrectChars += 1;
          else incorrectChars += 1;
        } else {
          extraChars += 1;
        }
      }
    } else {
      // typed less than the target.
      let toAddCorrect = 0;
      let toAddIncorrect = 0;
      let toAddMissed = 0;
      for (let c = 0; c < targetWord.length; c += 1) {
        if (c < inputWord.length) {
          if (inputWord[c] === targetWord[c]) toAddCorrect += 1;
          else toAddIncorrect += 1;
        } else {
          toAddMissed += 1;
        }
      }
      allCorrectChars += toAddCorrect;
      incorrectChars += toAddIncorrect;
      // monkeytype: the final, partially-typed word counts toward
      // correctWordChars iff it has zero errors so far. Otherwise the
      // missing tail is a "missedChars" hit.
      if (i === typed.length - 1 && (!final || toAddIncorrect === 0)) {
        if (toAddIncorrect === 0) correctWordChars += toAddCorrect;
      } else {
        missedChars += toAddMissed;
      }
    }
    if (i < typed.length - 1) spaces += 1;
  }

  return {
    correctWordChars,
    allCorrectChars,
    incorrectChars,
    extraChars,
    missedChars,
    spaces,
    correctSpaces,
  };
}

export type WpmResult = {
  wpm: number;
  raw: number;
};

/** WPM + raw using monkeytype's exact formula. `elapsedMs` is the time
 *  from the first keystroke to whatever moment we're sampling at. */
export function calcWpmAndRaw(
  typed: readonly string[],
  target: readonly string[],
  elapsedMs: number,
  final = true,
): WpmResult {
  if (elapsedMs <= 0) return { wpm: 0, raw: 0 };
  const c = countChars(typed, target, final);
  const testSeconds = elapsedMs / 1000;
  const wpm = ((c.correctWordChars + c.correctSpaces) * (60 / testSeconds)) / 5;
  const raw =
    ((c.allCorrectChars + c.spaces + c.incorrectChars + c.extraChars) *
      (60 / testSeconds)) /
    5;
  return { wpm, raw };
}
