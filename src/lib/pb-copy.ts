import { formatTestName } from "@/lib/test-name";

/** Personal-best copy, shared by the server (the stored notification
 *  body) and the notifications popover (which rebuilds the body from the
 *  stored data, so old rows read the same as new ones). Isomorphic and
 *  pure. Speeds are always "wpm": the server doesn't know the reader's
 *  unit. */

export type PbCopyInput = {
  mode: string;
  durationOrWordCount: number;
  lengthMode?: "words" | "time" | "quote" | null;
  wpm: number;
  accuracy: number;
};

/** "a Casual test of 60 seconds", "an Adapt test of 25 words",
 *  "a race of 25 words": "an" before a vowel (A, E, I, O, U). */
export function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/** Accuracy for copy: one decimal, with a trailing ".0" dropped
 *  ("98%", "97.5%", "100%"). Junk reads as "0%". */
export function accuracyText(acc: number): string {
  const tenths = Number.isFinite(acc) ? Math.round(acc * 10) / 10 : 0;
  return `${tenths}%`;
}

/** The kind of test, with its article: the noun `formatTestName` gives.
 *  A missing `lengthMode` (rows written before it was stored) falls back
 *  to the test-name guess. */
function testPhrase(d: PbCopyInput): string {
  const { noun } = formatTestName({
    mode: d.mode,
    lengthMode: d.lengthMode ?? null,
    length: d.durationOrWordCount,
  });
  return withArticle(noun);
}

function speedText(wpm: number): string {
  return `${Number.isFinite(wpm) ? Math.round(wpm) : 0} wpm`;
}

/** "102 wpm at 98% accuracy in a Casual test of 60 seconds." */
export function pbSentence(d: PbCopyInput): string {
  return `${speedText(d.wpm)} at ${accuracyText(d.accuracy)} accuracy in ${testPhrase(d)}.`;
}

/** "Mara hit 188 wpm in an Adapt test of 25 words." */
export function friendPbSentence(name: string, d: PbCopyInput): string {
  return `${name} hit ${speedText(d.wpm)} in ${testPhrase(d)}.`;
}

/** The improvement over the previous best, from the rounded figures the
 *  reader sees (not the raw gap), so "160 wpm" against "156 wpm" always
 *  reads as 4, never 5 (#12). */
export function pbDelta(wpm: number, previousWpm: number): number {
  return Math.round(wpm) - Math.round(previousWpm);
}
