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

/** The run's error count — incorrect + extra + missed characters in the
 *  typed buffer (monkeytype's "errors"). Final-buffer based: corrected
 *  mistakes don't count and a 100%-accuracy run reports 0 errors. A
 *  skipped word's untyped tail counts via `missedChars` (issue #17b) —
 *  skipping a word is an error the user saw underlined live, so the
 *  stat reflects it both live and on the results screen. The word
 *  currently being typed never accrues missed chars (`countChars`
 *  exempts the last typed entry when `final = false`), so the live
 *  readout doesn't penalise an in-progress word.
 *
 *  Note: this is deliberately NOT the accuracy source. Accuracy is
 *  keystroke-based (the practice reducer's `correctChars` /
 *  `totalChars`, counted at press time) so a corrected or
 *  stop-on-error-blocked mistake lowers accuracy permanently —
 *  while `errorCount` stays "uncorrected errors left in the buffer".
 *
 *  Shared by the live readout (`errs`) and the results screen
 *  (`errors`) so the two always agree. They previously diverged: the
 *  live readout counted *words* with any error (`errorWords.size`)
 *  while the results counted incorrect *keystrokes*
 *  (`events.filter(!correct)`), so the same run showed different error
 *  totals during the test vs on the summary. */
export function errorCount(
  typed: readonly string[],
  target: readonly string[],
  final = true,
): number {
  const c = countChars(typed, target, final);
  return c.incorrectChars + c.extraChars + c.missedChars;
}

export type WpmResult = {
  wpm: number;
  raw: number;
};

/** WPM + raw using monkeytype's exact formula. `elapsedMs` is the time
 *  from the first keystroke to whatever moment we're sampling at.
 *
 *  `charKeystrokes` is the count of character keys the user actually
 *  pressed (the reducer's running `totalChars` / the length of the
 *  keystroke-event log). When supplied, **raw** is derived from it
 *  rather than from walking `typed[]`. This matters because raw is
 *  defined as "how fast you press keys, regardless of accuracy" — but
 *  the `typed[]` array only ever holds keys that *landed* in a word.
 *  Under stop-on-error (and silently-dropped extras) a wrong keypress
 *  never enters `typed[]`, so the `typed[]`-derived count undercounts —
 *  a fast-but-inaccurate run could read raw ≈ 0 even though the user
 *  hammered the keyboard. Passing the true keystroke count fixes that
 *  while keeping `wpm` (correct words only) untouched. Omitting it
 *  falls back to the old `typed[]`-derived count for callers that
 *  don't track keystrokes (and for back-compat). */
export function calcWpmAndRaw(
  typed: readonly string[],
  target: readonly string[],
  elapsedMs: number,
  final = true,
  charKeystrokes?: number,
): WpmResult {
  if (elapsedMs <= 0) return { wpm: 0, raw: 0 };
  const c = countChars(typed, target, final);
  const testSeconds = elapsedMs / 1000;
  const wpm = ((c.correctWordChars + c.correctSpaces) * (60 / testSeconds)) / 5;
  // Character keystrokes (every key that produced a letter, correct or
  // not) + the inter-word spaces. The spaces term keeps raw ≥ wpm for a
  // clean run (wpm counts correctSpaces; raw counts every advance).
  const typedChars =
    charKeystrokes ?? c.allCorrectChars + c.incorrectChars + c.extraChars;
  const raw = ((typedChars + c.spaces) * (60 / testSeconds)) / 5;
  return { wpm, raw };
}
