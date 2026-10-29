/** One name for a kind of test, everywhere: result screens, Insights,
 *  share cards, notifications, the leaderboard. Isomorphic and pure (the
 *  edge OG-image runtime uses it too), so it never imports the
 *  `"use client"` quotes module: the quote-group names are inlined.
 *  Never outputs the data bucket "thicc" (ui-law §27 rule 9). */

/** Quote-group names by group id (0..3), as `QUOTE_GROUPS` in
 *  `src/lib/quotes.ts` orders them. Group 3 is "Extra-long", never the
 *  data bucket's own name. */
export const QUOTE_LENGTH_NAMES = ["Short", "Medium", "Long", "Extra-long"] as const;

export type TestNameSpec = {
  mode?: string;
  lengthMode: "words" | "time" | "quote" | null;
  length: number;
  touch?: boolean;
};

export type TestName = {
  /** "25 words" | "1 word" | "60 seconds" | "1 second" | "Short quote" |
   *  "Medium quote" | "Long quote" | "Extra-long quote" | "Quote" */
  length: string;
  mode: "Casual" | "Adapt" | "Race" | "Reverse";
  /** "Adapt test of 25 words" | "race of 25 words" | "Casual test with a long quote" */
  noun: string;
  /** "Adapt tests of 25 words" | "races of 25 words" | "Casual tests with
   *  long quotes", plus " on a touch screen" for a touch bucket. */
  group: string;
};

const MODE_LABEL: Record<string, TestName["mode"]> = {
  casual: "Casual",
  training: "Adapt",
  race: "Race",
  reverse_adaptive: "Reverse",
};

/** casual → Casual, training → Adapt, race → Race, reverse_adaptive →
 *  Reverse; anything else (imports, unknown modes) reads as Casual. */
export function modeLabel(mode: string): TestName["mode"] {
  return MODE_LABEL[mode] ?? "Casual";
}

/** Legacy and MonkeyType rows carry no length unit. These lengths are
 *  the timed presets; every other length reads as a word count. */
const GUESSED_SECONDS = new Set([15, 30, 60, 120]);

type Unit = "words" | "time" | "quote";

function unitOf(lengthMode: TestNameSpec["lengthMode"], length: number): Unit {
  if (lengthMode) return lengthMode;
  return GUESSED_SECONDS.has(length) ? "time" : "words";
}

const COUNT = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** A whole, non-negative count ("1,000"); junk reads as 0. */
function countText(length: number): { n: number; text: string } {
  const n = Number.isFinite(length) ? Math.max(0, Math.round(length)) : 0;
  return { n, text: COUNT.format(n) };
}

/** The quote group's name, or null outside groups 0..3. */
function quoteName(length: number): (typeof QUOTE_LENGTH_NAMES)[number] | null {
  return Number.isInteger(length) ? (QUOTE_LENGTH_NAMES[length] ?? null) : null;
}

/** "25 words", "1 second", "Long quote", "Quote". */
export function lengthLabel(lengthMode: TestNameSpec["lengthMode"], length: number): string {
  const unit = unitOf(lengthMode, length);
  if (unit === "quote") {
    const name = quoteName(length);
    return name ? `${name} quote` : "Quote";
  }
  const { n, text } = countText(length);
  if (unit === "time") return `${text} ${n === 1 ? "second" : "seconds"}`;
  return `${text} ${n === 1 ? "word" : "words"}`;
}

/** "a" or "an" for a lower-case word ("an extra-long quote"). */
function article(word: string): string {
  return /^[aeiou]/.test(word) ? "an" : "a";
}

export function formatTestName(spec: TestNameSpec): TestName {
  const mode = modeLabel(spec.mode ?? "casual");
  const length = lengthLabel(spec.lengthMode, spec.length);
  const isRace = mode === "Race";
  const one = isRace ? "race" : `${mode} test`;
  const many = isRace ? "races" : `${mode} tests`;

  let noun: string;
  let group: string;
  if (unitOf(spec.lengthMode, spec.length) === "quote") {
    const name = quoteName(spec.length)?.toLowerCase() ?? null;
    noun = name ? `${one} with ${article(name)} ${name} quote` : `${one} with a quote`;
    group = name ? `${many} with ${name} quotes` : `${many} with quotes`;
  } else {
    noun = `${one} of ${length}`;
    group = `${many} of ${length}`;
  }
  if (spec.touch) group += " on a touch screen";
  return { length, mode, noun, group };
}
