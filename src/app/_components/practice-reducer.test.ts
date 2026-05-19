import { describe, expect, it } from "vitest";

// The reducer + types live in `./practice-reducer` — a pure module
// with no React imports. The Provider/hooks in `./practice-state`
// import from here too. Per UI law §1.3 (the pure-reducer exception),
// this is the canonical home for the unit suite.
import {
  generateWords,
  initialState,
  reducer,
  type Action,
  type State,
} from "./practice-reducer";

/** Helper: seed a State at a specific cursor position with a typed
 *  buffer matching what the user has entered. The reducer doesn't
 *  care about word generation here — we hand it the exact passage
 *  we want to exercise. */
function seed(over: Partial<State>): State {
  return { ...initialState, phase: "running", ...over };
}

function run(state: State, ...actions: Action[]): State {
  return actions.reduce(reducer, state);
}

describe("practice reducer — BACKSPACE_WORD (Ctrl+Backspace)", () => {
  it("wipes the current word's typed buffer when cursor is mid-word", () => {
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 1,
      cursorChar: 3,
      typed: ["hello", "wor"],
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next.cursorWord).toBe(1);
    expect(next.cursorChar).toBe(0);
    expect(next.typed).toEqual(["hello", ""]);
  });

  it("wipes the current word even when fully typed (post-completion)", () => {
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 1,
      cursorChar: 5,
      typed: ["hello", "world"],
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next.cursorWord).toBe(1);
    expect(next.cursorChar).toBe(0);
    expect(next.typed).toEqual(["hello", ""]);
  });

  it("is a no-op when the previous word has no errors (MonkeyType behaviour)", () => {
    // Ctrl+Backspace at column 0 must not cross back into a correctly-
    // completed word — matches MonkeyType: once a clean word is locked
    // in by space, it can't be erased by Ctrl+Backspace.
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 1,
      cursorChar: 0,
      typed: ["hello", ""],
      errorWords: new Set<number>(),
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next).toBe(s);
  });

  it("clears the error flag on the word it just wiped", () => {
    // Wiping the typed buffer of word 0 leaves nothing for the user
    // to "fix" — the error mark would otherwise stick around as a
    // visual ghost.
    const s = seed({
      words: ["helo", "world"],
      cursorWord: 1,
      cursorChar: 0,
      typed: ["helo", ""],
      errorWords: new Set<number>([0]),
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next.cursorWord).toBe(0);
    expect(next.typed[0]).toBe("");
    expect(next.errorWords.has(0)).toBe(false);
  });

  it("is a no-op at the very start of the passage", () => {
    const s = seed({
      words: ["hello"],
      cursorWord: 0,
      cursorChar: 0,
      typed: [],
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next).toBe(s);
  });

  it("is a no-op once the run is done", () => {
    const s = seed({
      phase: "done",
      words: ["hello"],
      cursorWord: 0,
      cursorChar: 5,
      typed: ["hello"],
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next).toBe(s);
  });

  it("ignores cursorChar past typed-length without crashing", () => {
    // Edge case: cursorChar can exceed typed[i].length when extras
    // are recorded but the cursor advanced past word.length. The
    // reducer should still wipe cleanly.
    const s = seed({
      words: ["hi", "world"],
      cursorWord: 0,
      cursorChar: 4,
      typed: ["hixy"],
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next.cursorChar).toBe(0);
    expect(next.typed).toEqual([""]);
  });
});

describe("practice reducer — sequential Ctrl+Backspace", () => {
  it("clears current word but cannot cross into a clean previous word", () => {
    // Ctrl+Backspace on "world" (in progress) wipes it. A second
    // Ctrl+Backspace at column 0 must not cross back into "hello"
    // because it was typed correctly — matches MonkeyType behaviour.
    let s = seed({
      words: ["hello", "world", "foo"],
      typed: [],
    });
    for (const ch of "hello") {
      s = reducer(s, {
        type: "TYPE_CHAR",
        char: ch,
        now: 0,
        stopOnError: false,
        allowExtras: true,
      });
    }
    s = reducer(s, { type: "SPACE", now: 0, strictSpace: false });
    for (const ch of "world") {
      s = reducer(s, {
        type: "TYPE_CHAR",
        char: ch,
        now: 0,
        stopOnError: false,
        allowExtras: true,
      });
    }
    expect(s.cursorWord).toBe(1);
    expect(s.cursorChar).toBe(5);
    expect(s.typed).toEqual(["hello", "world"]);

    s = run(s, { type: "BACKSPACE_WORD" });
    expect(s.cursorWord).toBe(1);
    expect(s.cursorChar).toBe(0);
    expect(s.typed).toEqual(["hello", ""]);

    // second Ctrl+Backspace: "hello" has no errors → no-op
    const before = s;
    s = run(s, { type: "BACKSPACE_WORD" });
    expect(s).toBe(before);
  });

  it("crosses into the previous word when it has errors", () => {
    // If the previous word was mistyped, Ctrl+Backspace at column 0
    // should still cross back and wipe it (same as regular backspace).
    const s = seed({
      words: ["helo", "world", "foo"],
      cursorWord: 1,
      cursorChar: 0,
      typed: ["helo", ""],
      errorWords: new Set<number>([0]),
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next.cursorWord).toBe(0);
    expect(next.cursorChar).toBe(0);
    expect(next.typed[0]).toBe("");
    expect(next.errorWords.has(0)).toBe(false);
  });
});

describe("practice reducer — BACKSPACE (single char) still respects error gate", () => {
  // The fix only loosens BACKSPACE_WORD; plain BACKSPACE keeps its
  // "only cross word boundary on errored prev word" rule. This test
  // pins that contract.
  it("does NOT cross into a clean previous word", () => {
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 1,
      cursorChar: 0,
      typed: ["hello", ""],
      errorWords: new Set<number>(),
    });
    const next = reducer(s, { type: "BACKSPACE" });
    expect(next).toBe(s);
  });

  it("crosses into an errored previous word and lands at the typed end", () => {
    const s = seed({
      words: ["helo", "world"],
      cursorWord: 1,
      cursorChar: 0,
      typed: ["hel", ""],
      errorWords: new Set<number>([0]),
    });
    const next = reducer(s, { type: "BACKSPACE" });
    expect(next.cursorWord).toBe(0);
    expect(next.cursorChar).toBe(3);
  });
});

describe("practice reducer — FINISH_BURST", () => {
  it("marks the run done with the supplied totals + events", () => {
    const s = seed({ phase: "running", words: ["the", "cat"] });
    const next = reducer(s, {
      type: "FINISH_BURST",
      startMs: 1000,
      endMs: 5000,
      typed: ["the", "cat"],
      events: [
        { t: 0, expected: "t", typed: "t", correct: true, wordIndex: 0 },
        { t: 0, expected: "h", typed: "h", correct: true, wordIndex: 0 },
        { t: 0, expected: "e", typed: "e", correct: true, wordIndex: 0 },
        { t: 2000, expected: "c", typed: "c", correct: true, wordIndex: 1 },
        { t: 2000, expected: "a", typed: "a", correct: true, wordIndex: 1 },
        { t: 2000, expected: "t", typed: "t", correct: true, wordIndex: 1 },
      ],
      totalChars: 8,
      correctChars: 6,
    });
    expect(next.phase).toBe("done");
    expect(next.startTime).toBe(1000);
    expect(next.endTime).toBe(5000);
    expect(next.typed).toEqual(["the", "cat"]);
    expect(next.totalChars).toBe(8);
    expect(next.correctChars).toBe(6);
    expect(next.events).toHaveLength(6);
    expect(next.cursorWord).toBe(2);
  });

  it("works from rest phase (burst surface drives its own timer)", () => {
    const s = seed({ phase: "rest", words: ["a"] });
    const next = reducer(s, {
      type: "FINISH_BURST",
      startMs: 100,
      endMs: 200,
      typed: ["a"],
      events: [],
      totalChars: 1,
      correctChars: 1,
    });
    // The BURST runner starts the test outside this reducer; FINISH_BURST
    // must accept a rest→done transition for that reason.
    expect(next.phase).toBe("done");
  });
});

describe("practice reducer — generateWords adjacency", () => {
  it("never emits the same word twice in a row", () => {
    // Seed loop a handful of seeds to catch the rare back-to-back roll.
    for (let seed = 1; seed < 50; seed++) {
      const words = generateWords(80, seed, {
        minWordLength: 1,
        showSecondary: false,
      });
      for (let i = 1; i < words.length; i++) {
        expect(words[i]).not.toBe(words[i - 1]);
      }
    }
  });

  it("tolerates a single-word pool without infinite looping", () => {
    const words = generateWords(5, 1, {
      minWordLength: 1,
      showSecondary: false,
      wordPool: ["only"],
    });
    expect(words).toEqual(["only", "only", "only", "only", "only"]);
  });
});
