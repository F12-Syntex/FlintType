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

describe("practice reducer — BURST_RESET", () => {
  it("clears typed[cursorWord] and resets cursorChar without moving cursor", () => {
    const s = seed({
      phase: "running",
      words: ["the", "cat"],
      typed: ["the", "ca"],
      cursorWord: 1,
      cursorChar: 2,
    });
    const next = reducer(s, { type: "BURST_RESET" });
    expect(next.cursorWord).toBe(1);
    expect(next.cursorChar).toBe(0);
    expect(next.typed).toEqual(["the", ""]);
  });

  it("does not modify errorWords / totalChars / correctChars", () => {
    const s = seed({
      phase: "running",
      words: ["the", "cat"],
      typed: ["the", "cot"],
      cursorWord: 1,
      cursorChar: 3,
      errorWords: new Set([0]),
      totalChars: 6,
      correctChars: 5,
    });
    const next = reducer(s, { type: "BURST_RESET" });
    expect(next.errorWords).toBe(s.errorWords);
    expect(next.totalChars).toBe(6);
    expect(next.correctChars).toBe(5);
  });

  it("is a no-op when the run is done", () => {
    const s = seed({ phase: "done", words: ["the"], typed: ["the"] });
    const next = reducer(s, { type: "BURST_RESET" });
    expect(next).toBe(s);
  });
});

describe("practice reducer — APPEND_WORDS (TIME buffer top-up)", () => {
  it("appends the batch to the end without touching cursor or run state", () => {
    const s = seed({
      mode: "TIME",
      words: ["the", "cat", "sat"],
      cursorWord: 1,
      cursorChar: 2,
      typed: ["the", "ca"],
    });
    const next = reducer(s, { type: "APPEND_WORDS", words: ["mat", "hat"] });
    expect(next.words).toEqual(["the", "cat", "sat", "mat", "hat"]);
    expect(next.cursorWord).toBe(1);
    expect(next.cursorChar).toBe(2);
    expect(next.typed).toEqual(["the", "ca"]);
    expect(next.phase).toBe("running");
  });

  it("is a no-op (same reference) on an empty batch", () => {
    const s = seed({ mode: "TIME", words: ["the", "cat"] });
    const next = reducer(s, { type: "APPEND_WORDS", words: [] });
    expect(next).toBe(s);
  });
});

describe("practice reducer — TIME mode never finishes on word count", () => {
  it("advances past the last word instead of ending the run", () => {
    // SPACE on the final word in TIME mode keeps the run going (the
    // timer ends it) — the legacy emergency append still tops the
    // buffer up so the cursor always has a word to land on.
    const s = seed({
      mode: "TIME",
      words: ["the"],
      cursorWord: 0,
      cursorChar: 3,
      typed: ["the"],
    });
    const next = reducer(s, { type: "SPACE", now: 100, strictSpace: false });
    expect(next.phase).toBe("running");
    expect(next.endTime).toBeNull();
    expect(next.cursorWord).toBe(1);
    expect(next.words.length).toBeGreaterThan(1);
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

describe("practice reducer — BACKSPACE clears the error underline on fix (#16)", () => {
  it("removes the word from errorWords once the wrong char is deleted", () => {
    // Typed "helxo" against "hello" — the 4th char is wrong, word flagged.
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 0,
      cursorChar: 5,
      typed: ["helxo", ""],
      errorWords: new Set([0]),
    });
    // Backspace twice to delete the 'o' then the wrong 'x'.
    const next = run(s, { type: "BACKSPACE" }, { type: "BACKSPACE" });
    expect(next.typed[0]).toBe("hel");
    // "hel" is a correct prefix of "hello" → no longer flagged, so the
    // red underline clears (previously only Ctrl+Backspace cleared it).
    expect(next.errorWords.has(0)).toBe(false);
  });

  it("keeps the flag while a wrong char remains in the buffer", () => {
    const s = seed({
      words: ["hello"],
      cursorWord: 0,
      cursorChar: 5,
      typed: ["helxo"],
      errorWords: new Set([0]),
    });
    const next = reducer(s, { type: "BACKSPACE" }); // deletes 'o' → "helx"
    expect(next.typed[0]).toBe("helx");
    expect(next.errorWords.has(0)).toBe(true);
  });
});

describe("practice reducer — SPACE is a no-op at rest (leading space ignored)", () => {
  it("does not advance or start the run on a leading space", () => {
    // Matches monkeytype: a space before any typing is ignored, so the
    // run only starts on a real character. (The skipped-word *error
    // count* half of #17 is fixed separately by the shared errorCount
    // metric — see wpm.test.ts.)
    const s = { ...initialState, words: ["hello", "world"], phase: "rest" as const };
    const next = reducer(s, { type: "SPACE", now: 1000, strictSpace: false });
    expect(next).toBe(s);
  });
});
