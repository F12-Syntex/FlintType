import { describe, expect, it } from "vitest";

// The reducer + types live in `./practice-reducer` — a pure module
// with no React imports. The Provider/hooks in `./practice-state`
// import from here too. Per UI law §1.3 (the pure-reducer exception),
// this is the canonical home for the unit suite.
import {
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

  it("jumps to the previous word even when it has no errors (text-editor behaviour)", () => {
    // The pre-fix behaviour required the previous word to be in
    // `errorWords` — a clean previous word silently swallowed the
    // keystroke. The new behaviour matches every text editor on the
    // planet: Ctrl+Backspace at column 0 deletes the previous word.
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 1,
      cursorChar: 0,
      typed: ["hello", ""],
      errorWords: new Set<number>(),
    });
    const next = reducer(s, { type: "BACKSPACE_WORD" });
    expect(next.cursorWord).toBe(0);
    expect(next.cursorChar).toBe(0);
    expect(next.typed).toEqual(["", ""]);
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
  it("after typing 'hello world ', two Ctrl+Backspaces clear both words", () => {
    // Start from clean: type "hello", space (advance), type "world",
    // then ctrl+backspace twice. End state: cursor at (0, 0), both
    // typed slots empty.
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

    s = run(s, { type: "BACKSPACE_WORD" });
    expect(s.cursorWord).toBe(0);
    expect(s.cursorChar).toBe(0);
    expect(s.typed).toEqual(["", ""]);
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
