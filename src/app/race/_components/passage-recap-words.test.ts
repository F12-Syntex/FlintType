import { describe, expect, it } from "vitest";
import { recapWords, wordsStartedBefore } from "./passage-recap-words";

const WORDS = ["to", "be", "or", "not", "too", "be", "that", "is"];
const untimed = { timed: false, furthestChars: 0 };
const timed = { timed: true, furthestChars: 0 };

describe("recapWords", () => {
  it("marks finished words that differ from the passage", () => {
    const r = recapWords(WORDS, { typed: ["to", "bee", "or"], cursorWord: 3 }, untimed);
    expect(r.wrong.slice(0, 4)).toEqual([false, true, false, false]);
  });

  it("doesn't mark a correct half-typed word under the cursor", () => {
    // The buzzer ended the race with "to" typed of "too".
    const run = { typed: ["to", "be", "or", "not", "to"], cursorWord: 4 };
    expect(recapWords(WORDS, run, timed).wrong).toEqual([false, false, false, false, false]);
  });

  it("marks the word under the cursor once it stops matching", () => {
    expect(recapWords(WORDS, { typed: ["tx"], cursorWord: 0 }, untimed).wrong[0]).toBe(true);
    // Past the word's end counts too.
    expect(recapWords(WORDS, { typed: ["too"], cursorWord: 0 }, untimed).wrong[0]).toBe(true);
  });

  it("marks a finished last word typed wrong", () => {
    const typed = ["to", "be", "or", "not", "too", "be", "that", "iz"];
    expect(recapWords(WORDS, { typed, cursorWord: 7 }, untimed).wrong[7]).toBe(true);
  });

  it("never marks skipped (empty) or untyped words", () => {
    const r = recapWords(WORDS, { typed: ["", "be"], cursorWord: 2 }, untimed);
    expect(r.wrong.every((w) => !w)).toBe(true);
  });

  it("shows the whole passage for word and quote races", () => {
    expect(recapWords(WORDS, { typed: ["to"], cursorWord: 1 }, untimed).shown).toEqual(WORDS);
    expect(recapWords(WORDS, null, untimed).shown).toEqual(WORDS);
  });

  it("stops a timed race at your cursor, keeping a word you started", () => {
    const run = { typed: ["to", "be", "or", "not", "to"], cursorWord: 4 };
    expect(recapWords(WORDS, run, timed).shown).toEqual(["to", "be", "or", "not", "too"]);
  });

  it("leaves out the next word when you hadn't started it", () => {
    const run = { typed: ["to", "be", "or", ""], cursorWord: 3 };
    expect(recapWords(WORDS, run, timed).shown).toEqual(["to", "be", "or"]);
  });

  it("shows at least one word", () => {
    expect(recapWords(WORDS, { typed: [], cursorWord: 0 }, timed).shown).toEqual(["to"]);
    expect(recapWords(WORDS, null, timed).shown).toEqual(["to"]);
  });

  it("stops a watcher's timed recap at the furthest racer", () => {
    // "to be or " is 9 characters: three words done, the fourth not started.
    expect(recapWords(WORDS, null, { timed: true, furthestChars: 9 }).shown).toEqual([
      "to",
      "be",
      "or",
    ]);
    expect(recapWords(WORDS, null, { timed: true, furthestChars: 10 }).shown).toHaveLength(4);
    expect(recapWords(WORDS, null, { timed: true, furthestChars: 10 }).wrong).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("wordsStartedBefore", () => {
  it("counts words whose first character comes before the cursor", () => {
    expect(wordsStartedBefore(WORDS, 0)).toBe(0);
    expect(wordsStartedBefore(WORDS, 1)).toBe(1);
    expect(wordsStartedBefore(WORDS, 3)).toBe(1);
    expect(wordsStartedBefore(WORDS, 4)).toBe(2);
  });

  it("stops at the end of the passage", () => {
    expect(wordsStartedBefore(WORDS, 1000)).toBe(WORDS.length);
  });
});
