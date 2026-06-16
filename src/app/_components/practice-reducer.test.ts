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
    s = reducer(s, { type: "SPACE", now: 0, strictSpace: false, backspaceLocked: false });
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
    const next = reducer(s, { type: "SPACE", now: 100, strictSpace: false, backspaceLocked: false });
    expect(next.phase).toBe("running");
    expect(next.endTime).toBeNull();
    expect(next.cursorWord).toBe(1);
    expect(next.words.length).toBeGreaterThan(1);
  });
});

describe("practice reducer — BURST does not auto-finish on the last char (#46)", () => {
  it("BURST: a correct final char of the last item stays running (gate not bypassed)", () => {
    // Typing the last correct character of the only item must NOT end
    // the run — BURST commits via SPACE after BurstProvider's
    // threshold + reps gate. Auto-finishing here would skip the gate
    // and grant drill XP for a single under-threshold attempt.
    const s = seed({
      mode: "BURST",
      words: ["go"],
      cursorWord: 0,
      cursorChar: 1,
      typed: ["g"],
    });
    const next = reducer(s, {
      type: "TYPE_CHAR",
      char: "o",
      now: 100,
      stopOnError: false,
      allowExtras: true,
    });
    expect(next.phase).toBe("running");
    expect(next.endTime).toBeNull();
    expect(next.cursorChar).toBe(2);
  });

  it("WORDS: the same final char DOES finish the run (non-BURST regression guard)", () => {
    const s = seed({
      mode: "WORDS",
      words: ["go"],
      cursorWord: 0,
      cursorChar: 1,
      typed: ["g"],
    });
    const next = reducer(s, {
      type: "TYPE_CHAR",
      char: "o",
      now: 100,
      stopOnError: false,
      allowExtras: true,
    });
    expect(next.phase).toBe("done");
    expect(next.endTime).toBe(100);
  });

  it("BURST: SPACE on the final item ends the run (the burst finish path)", () => {
    // BurstProvider dispatches plain SPACE once the gate (wpm >=
    // threshold && reps >= required) passes on the last item; the
    // reducer's SPACE branch is what sets phase done — BURST is not
    // excluded there.
    const s = seed({
      mode: "BURST",
      words: ["go"],
      cursorWord: 0,
      cursorChar: 2,
      typed: ["go"],
    });
    const next = reducer(s, { type: "SPACE", now: 200, strictSpace: false });
    expect(next.phase).toBe("done");
    expect(next.endTime).toBe(200);
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

describe("practice reducer — keystroke-based accuracy counters (#14 / #51)", () => {
  // The provider derives accuracy as correctChars / totalChars — both
  // counted at keypress time, monkeytype-style. These tests pin the
  // counter semantics the accuracy figure depends on.
  const typeChar = (
    char: string,
    over: Partial<{ stopOnError: boolean; allowExtras: boolean }> = {},
  ): Action => ({
    type: "TYPE_CHAR",
    char,
    now: 1000,
    stopOnError: over.stopOnError ?? false,
    allowExtras: over.allowExtras ?? true,
  });
  const accuracyOf = (s: State): number =>
    s.totalChars > 0 ? (s.correctChars / s.totalChars) * 100 : 100;

  it("a corrected mistake still lowers accuracy permanently", () => {
    let s = seed({ words: ["cat"], typed: [] });
    // c, a, X (wrong), backspace, t — final buffer is "cat" (perfect)
    s = run(
      s,
      typeChar("c"),
      typeChar("a"),
      typeChar("x"),
      { type: "BACKSPACE" },
      typeChar("t"),
    );
    expect(s.typed[0]).toBe("cat");
    expect(s.totalChars).toBe(4); // 4 char keypresses; backspace not counted
    expect(s.correctChars).toBe(3);
    expect(accuracyOf(s)).toBe(75);
  });

  it("a stop-on-error-blocked wrong keystroke lowers accuracy", () => {
    let s = seed({ words: ["cat"], typed: [] });
    s = run(
      s,
      typeChar("c", { stopOnError: true }),
      typeChar("x", { stopOnError: true }), // blocked — never lands in typed
      typeChar("a", { stopOnError: true }),
      typeChar("t", { stopOnError: true }),
    );
    expect(s.typed[0]).toBe("cat"); // blocked char never entered the buffer
    expect(s.totalChars).toBe(4);
    expect(s.correctChars).toBe(3);
    expect(accuracyOf(s)).toBe(75);
  });

  it("backspace is neutral — never counts as a keystroke", () => {
    let s = seed({ words: ["cat"], typed: [] });
    s = run(
      s,
      typeChar("c"),
      typeChar("a"),
      { type: "BACKSPACE" },
      { type: "BACKSPACE" },
      typeChar("c"),
      typeChar("a"),
      typeChar("t"),
    );
    expect(s.totalChars).toBe(5);
    expect(s.correctChars).toBe(5);
    expect(accuracyOf(s)).toBe(100);
  });

  it("an extra char (past word end) counts as incorrect", () => {
    let s = seed({ words: ["hi", "yo"], typed: [] });
    s = run(s, typeChar("h"), typeChar("i"), typeChar("z"));
    expect(s.totalChars).toBe(3);
    expect(s.correctChars).toBe(2);
  });

  it("space-skipping a word does not inflate accuracy (skipped chars are not keystrokes)", () => {
    let s = seed({ words: ["hello", "world"], typed: [] });
    s = run(
      s,
      typeChar("h"),
      typeChar("e"),
      { type: "SPACE", now: 1000, strictSpace: false },
      typeChar("w"),
    );
    // 3 char keypresses, all correct — space itself is not a char
    // keystroke and the skipped tail is missed, not wrong.
    expect(s.totalChars).toBe(3);
    expect(s.correctChars).toBe(3);
    expect(accuracyOf(s)).toBe(100);
  });

  it("100% accuracy implies raw == net WPM (within rounding)", async () => {
    const { calcWpmAndRaw } = await import("@/lib/wpm");
    let s = seed({ words: ["the", "cat", "sat"], typed: [] });
    for (const word of ["the", "cat"]) {
      for (const ch of word) s = run(s, typeChar(ch));
      s = run(s, { type: "SPACE", now: 1000, strictSpace: false });
    }
    for (const ch of "sat") s = run(s, typeChar(ch));
    expect(s.phase).toBe("done");
    expect(s.correctChars).toBe(s.totalChars); // 100% accuracy
    const { wpm, raw } = calcWpmAndRaw(
      s.typed,
      s.words,
      10_000,
      true,
      s.events.length,
    );
    expect(raw).toBeCloseTo(wpm, 6);
  });
});

describe("practice reducer — SPACE skips the first word like any other (#17a)", () => {
  it("starts the run and skips word 0 on a leading space", () => {
    // Issue #17a: the first word must be skippable with space exactly
    // like every later word. A space at rest starts the run (startTime
    // minted) and advances past word 0, marking it errored.
    const s = { ...initialState, words: ["hello", "world"], phase: "rest" as const };
    const next = reducer(s, { type: "SPACE", now: 1000, strictSpace: false });
    expect(next.phase).toBe("running");
    expect(next.startTime).toBe(1000);
    expect(next.cursorWord).toBe(1);
    expect(next.cursorChar).toBe(0);
    expect(next.errorWords.has(0)).toBe(true);
    // typed[] sealed with an entry for the skipped word.
    expect(next.typed[0]).toBe("");
  });

  it("skips the first word identically to a middle word", () => {
    // Same skip applied to word 0 (from rest) and to word 1 (mid-run)
    // must produce the same per-word outcome: empty sealed buffer,
    // error flag set, cursor advanced one word.
    const base = { ...initialState, words: ["aaa", "bbb", "ccc"] };
    const afterFirst = reducer(
      { ...base, phase: "rest" as const },
      { type: "SPACE", now: 5, strictSpace: false },
    );
    const afterMiddle = reducer(
      { ...base, phase: "running" as const, cursorWord: 1, typed: ["aaa"], startTime: 0 },
      { type: "SPACE", now: 5, strictSpace: false },
    );
    expect(afterFirst.cursorWord).toBe(1);
    expect(afterMiddle.cursorWord).toBe(2);
    expect(afterFirst.typed[0]).toBe("");
    expect(afterMiddle.typed[1]).toBe("");
    expect(afterFirst.errorWords.has(0)).toBe(true);
    expect(afterMiddle.errorWords.has(1)).toBe(true);
  });

  it("strictSpace still blocks the skip — including at rest", () => {
    // The strict-space gate is identical across all words: an
    // unfinished word can't be skipped, and at rest a bare space
    // neither skips nor starts the run.
    const rest = { ...initialState, words: ["hello", "world"], phase: "rest" as const };
    expect(reducer(rest, { type: "SPACE", now: 1, strictSpace: true })).toBe(rest);
    const running = { ...rest, phase: "running" as const, typed: ["hel"], cursorChar: 3, startTime: 0 };
    expect(reducer(running, { type: "SPACE", now: 1, strictSpace: true })).toBe(running);
  });

  it("strictSpace still advances on a fully-correct word", () => {
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 0,
      cursorChar: 5,
      typed: ["hello"],
      startTime: 0,
    });
    const next = reducer(s, { type: "SPACE", now: 10, strictSpace: true });
    expect(next.cursorWord).toBe(1);
    expect(next.errorWords.has(0)).toBe(false);
  });

  it("space on the final word still finishes the run (and from rest on a 1-word passage)", () => {
    const s = { ...initialState, words: ["solo"], phase: "rest" as const };
    const next = reducer(s, { type: "SPACE", now: 42, strictSpace: false });
    expect(next.phase).toBe("done");
    expect(next.startTime).toBe(42);
    expect(next.endTime).toBe(42);
  });
});

describe("practice reducer — skipped words count errors the same live and final (#17b)", () => {
  it("a skipped word's untyped tail yields the same errorCount live and on results", async () => {
    const { errorCount } = await import("@/lib/wpm");
    // Type "hel", skip "hello", then fully type "world" + finish.
    let s = seed({ words: ["hello", "world"], typed: [], startTime: 0 });
    for (const ch of "hel") {
      s = reducer(s, { type: "TYPE_CHAR", char: ch, now: 1, stopOnError: false, allowExtras: true });
    }
    s = reducer(s, { type: "SPACE", now: 2, strictSpace: false });
    for (const ch of "world") {
      s = reducer(s, { type: "TYPE_CHAR", char: ch, now: 3, stopOnError: false, allowExtras: true });
    }
    expect(s.phase).toBe("done");
    // Live readout uses final=false, results uses final=true — both
    // must charge the skipped "lo" tail (2 missed chars) identically.
    const live = errorCount(s.typed, s.words, false);
    const final = errorCount(s.typed, s.words, true);
    expect(live).toBe(2);
    expect(final).toBe(2);
    // …and the reducer flagged the skipped word for the live underline.
    expect(s.errorWords.has(0)).toBe(true);
  });
});

describe("practice reducer — strictSpace yields when backspace is locked (#50)", () => {
  it("strictSpace + backspaceLocked=false + wrong word → SPACE is a no-op", () => {
    // confidence off/word: the user CAN backspace to fix, so strictSpace
    // is enforced — Space refuses to advance past a wrong word.
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 0,
      cursorChar: 5,
      typed: ["helxo", ""],
      errorWords: new Set([0]),
    });
    const next = reducer(s, {
      type: "SPACE",
      now: 100,
      strictSpace: true,
      backspaceLocked: false,
    });
    expect(next).toBe(s);
    expect(next.cursorWord).toBe(0);
  });

  it("strictSpace + backspaceLocked=false + incomplete word → SPACE is a no-op", () => {
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 0,
      cursorChar: 3,
      typed: ["hel", ""],
    });
    const next = reducer(s, {
      type: "SPACE",
      now: 100,
      strictSpace: true,
      backspaceLocked: false,
    });
    expect(next).toBe(s);
    expect(next.cursorWord).toBe(0);
  });

  it("strictSpace + backspaceLocked=true + wrong word → SPACE advances (the fix)", () => {
    // confidence="all": no correction path, so strictSpace must yield —
    // Space advances past the word and marks it errored, breaking the
    // deadlock.
    const s = seed({
      words: ["hello", "world"],
      cursorWord: 0,
      cursorChar: 5,
      typed: ["helxo", ""],
      errorWords: new Set([0]),
    });
    const next = reducer(s, {
      type: "SPACE",
      now: 100,
      strictSpace: true,
      backspaceLocked: true,
    });
    expect(next.cursorWord).toBe(1);
    expect(next.cursorChar).toBe(0);
    expect(next.errorWords.has(0)).toBe(true);
  });

  it("strictSpace + correct word → SPACE advances regardless of backspaceLocked", () => {
    for (const backspaceLocked of [false, true]) {
      const s = seed({
        words: ["hello", "world"],
        cursorWord: 0,
        cursorChar: 5,
        typed: ["hello", ""],
      });
      const next = reducer(s, {
        type: "SPACE",
        now: 100,
        strictSpace: true,
        backspaceLocked,
      });
      expect(next.cursorWord).toBe(1);
      expect(next.cursorChar).toBe(0);
      expect(next.errorWords.has(0)).toBe(false);
    }
  });
});
