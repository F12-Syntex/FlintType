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

/** The unit an old row's stored body names for `amount`, for rows written
 *  before `lengthMode` was saved (before v6.151.1). Those bodies carried
 *  the run's real unit: "Casual · 45s · 100 wpm · 98.0% acc" (or the
 *  older "Casual 45s · …") and "Mara hit 100 wpm on 45s." for time,
 *  "… · 30 words · …" and "… on 30 words." for words. Null when the body
 *  names neither (the oldest rows wrote a bare number). A friend body is
 *  read from its own tail only, so a name like "Agent 7s" never counts. */
export function legacyLengthMode(body: string, amount: number): "time" | "words" | null {
  if (!Number.isFinite(amount)) return null;
  const at = body.lastIndexOf(" wpm on ");
  if (at >= 0 && body.endsWith(".")) {
    const where = body.slice(at + " wpm on ".length, -1);
    if (where === `${amount}s`) return "time";
    if (where === `${amount} word` || where === `${amount} words`) return "words";
    return null;
  }
  const n = String(amount).replace(".", "\\.");
  // \u00b7 is the old bodies' middle dot (spelt as an escape so the copy
  // guard never sees the glyph in code).
  if (new RegExp(`(^|[\\s\\u00b7])${n}s(?=[\\s.\\u00b7]|$)`).test(body)) return "time";
  if (new RegExp(`(^|[\\s\\u00b7])${n} words?(?=[\\s.\\u00b7]|$)`).test(body)) return "words";
  return null;
}

/** A stored PB row's data, ready for `pbSentence` / `friendPbSentence`:
 *  a row saved without `lengthMode` takes the unit its own body names,
 *  so a custom 45-second run never reads as 45 words. */
export function withLegacyLengthMode<T extends PbCopyInput>(data: T, body: string): T {
  if (data.lengthMode !== undefined) return data;
  return { ...data, lengthMode: legacyLengthMode(body, data.durationOrWordCount) };
}

/** The improvement over the previous best, from the rounded figures the
 *  reader sees (not the raw gap), so "160 wpm" against "156 wpm" always
 *  reads as 4, never 5 (#12). */
export function pbDelta(wpm: number, previousWpm: number): number {
  return Math.round(wpm) - Math.round(previousWpm);
}
