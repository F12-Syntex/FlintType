/** Mechanical copy rules for generated UI strings (ui-law §27 rule 6).
 *  Copy tests run every builder's output through `bannedPatterns` and
 *  expect an empty list. It checks only what a machine can check: the
 *  tone rules (felt units, named references, no reassurance) stay with
 *  review. Isomorphic and pure. */

// The two dot glyphs are written as escapes so this file never trips the
// repo-wide separator guard (src/lib/copy-style.test.ts).
const MIDDLE_DOT = "\u00b7";
const BULLET = "\u2022";

const BANNED: readonly (readonly [pattern: string, rule: string])[] = [
  [MIDDLE_DOT, `contains "${MIDDLE_DOT}"`],
  [BULLET, `contains "${BULLET}"`],
  ["—", "contains an em dash"],
  ["% to ", 'contains "% to "'],
  ["% over ", 'contains "% over "'],
  ["% vs ", 'contains "% vs "'],
  ["% of your goal", 'contains "% of your goal"'],
  ["!", "contains an exclamation mark"],
  ["×", 'contains "×"'],
  ["  ", "contains a double space"],
];

/** A sentence opens with a capital letter, a digit or an opening quote. */
const SENTENCE_START = /^[\p{Lu}\d“‘"'«]/u;
/** …and closes with a full stop or a question mark, optionally followed
 *  by a closing quote (“Smooth out the pair.” ends `.”`). */
const SENTENCE_END = /[.?][”’"'»]?$/u;

/** Returns every rule a UI string breaks (empty = clean). `heading: true`
 *  skips the sentence-shape rule, for titles, labels and button text. */
export function bannedPatterns(s: string, o?: { heading?: boolean }): string[] {
  const broken: string[] = [];
  for (const [pattern, rule] of BANNED) {
    if (s.includes(pattern)) broken.push(rule);
  }
  if (!o?.heading) {
    if (!SENTENCE_START.test(s)) {
      broken.push("does not start with a capital letter, a digit or an opening quote");
    }
    if (!SENTENCE_END.test(s)) {
      broken.push("does not end with a full stop or a question mark");
    }
  }
  return broken;
}
