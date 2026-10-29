import { describe, expect, it } from "vitest";
import { EDIT_CAP, SPACE_CAP } from "./practice-capture";
import { initialState, reducer, type Action, type EditEvent, type SpaceEvent, type State } from "./practice-reducer";

/** Capture v2 as the reducer records it (spec-20 §4, §8). New cases live
 *  here: practice-reducer.test.ts is over 300 lines and takes none. */

/** A fresh WORDS run at rest on `words`, built the way the provider does. */
function rest(words: string[]): State {
  return reducer({ ...initialState, mode: "WORDS", length: words.length }, { type: "RESTART", words, quoteSource: null });
}

const run = (s: State, ...actions: Action[]): State => actions.reduce(reducer, s);

const key = (char: string, now: number, more: Partial<Extract<Action, { type: "TYPE_CHAR" }>> = {}): Action => ({
  type: "TYPE_CHAR", char, now, stopOnError: false, allowExtras: true, ...more,
});
const sp = (now: number, more: Partial<Extract<Action, { type: "SPACE" }>> = {}): Action => ({
  type: "SPACE", now, strictSpace: false, ...more,
});
const back = (now: number, more: Partial<Extract<Action, { type: "BACKSPACE" }>> = {}): Action => ({ type: "BACKSPACE", now, ...more });
const backWord = (now: number): Action => ({ type: "BACKSPACE_WORD", now });

describe("TYPE_CHAR capture", () => {
  it("records pos, src and ht; the first key sets htOrigin and ht is relative to it", () => {
    const s = run(rest(["ab", "cd"]), key("a", 1_000, { ht: 500 }), key("b", 1_100, { ht: 612.34, src: "input" }));
    expect(s.htOrigin).toBe(500);
    expect(s.events).toEqual([
      { t: 0, expected: "a", typed: "a", correct: true, wordIndex: 0, pos: 0, ht: 0 },
      { t: 100, expected: "b", typed: "b", correct: true, wordIndex: 0, pos: 1, src: "input", ht: 112.3 },
    ]);
  });

  it("counts codeOk into layoutHits; an input-event key without codeOk doesn't", () => {
    const s = run(rest(["abc"]), key("a", 0, { codeOk: true }), key("b", 50, { codeOk: false }), key("c", 90, { src: "input" }));
    expect(s.layoutHits).toEqual([2, 1]);
  });

  it("a blocked stop-on-error key records pos, which repeats on the next attempt", () => {
    const s = run(rest(["ab"]), key("a", 0), key("x", 50, { stopOnError: true }), key("b", 90, { stopOnError: true }));
    expect(s.events.map((e) => [e.typed, e.pos, e.correct])).toEqual([["a", 0, true], ["x", 1, false], ["b", 1, true]]);
    expect(s.typed).toEqual(["ab"]);
  });

  it("a key with nothing to do (extras off past the word) records nothing", () => {
    const a = run(rest(["ab", "cd"]), key("a", 0), key("b", 50));
    const b = reducer(a, key("z", 90, { allowExtras: false, codeOk: true }));
    expect(b).toBe(a);
  });
});

describe("SPACE capture", () => {
  it("records an applied space, with early when the word wasn't typed exactly", () => {
    const s = run(rest(["ab", "cd", "ef"]), key("a", 1_000, { ht: 10 }), sp(1_100, { ht: 110 }), key("c", 1_200), key("d", 1_300), sp(1_400, { src: "input" }));
    const spaces: SpaceEvent[] = [
      { t: 100, ht: 100, at: 1, seq: 0, wordIndex: 0, pos: 1, early: true },
      { t: 400, at: 3, seq: 1, wordIndex: 1, pos: 2, src: "input" },
    ];
    expect(s.spaces).toEqual(spaces);
  });

  it("a first-key Space is recorded at t = 0 and sets htOrigin", () => {
    const s = run(rest(["ab", "cd"]), sp(2_000, { ht: 70 }), key("c", 2_150, { ht: 220 }));
    expect(s.spaces).toEqual([{ t: 0, ht: 0, at: 0, seq: 0, wordIndex: 0, pos: 0, early: true }]);
    expect(s.htOrigin).toBe(70);
    expect(s.events[0]!.ht).toBe(150);
  });

  it("a strict-space no-op is not recorded", () => {
    const a = run(rest(["ab", "cd"]), key("a", 0));
    expect(reducer(a, sp(50, { strictSpace: true }))).toBe(a);
  });

  it("strict space yields when backspace is off, and that space is recorded", () => {
    const s = run(rest(["ab", "cd"]), key("a", 0), sp(50, { strictSpace: true, backspaceLocked: true }));
    expect(s.spaces).toHaveLength(1);
    expect(s.spaces![0]!.early).toBe(true);
  });

  it("the Space that finishes a WORDS run is recorded", () => {
    const s = run(rest(["ab", "cd"]), key("a", 0), key("b", 50), sp(100), key("c", 150), key("x", 200), sp(250));
    expect(s.phase).toBe("done");
    expect(s.spaces!.map((x) => [x.at, x.wordIndex, x.pos, x.early ?? false])).toEqual([[2, 0, 2, false], [4, 1, 2, true]]);
  });
});

describe("BACKSPACE and BACKSPACE_WORD capture", () => {
  it("records an applied backspace, with cross when it moves into the previous errored word", () => {
    const s = run(rest(["ab", "cd"]), key("a", 0), key("x", 40), sp(80), back(120), back(160), key("b", 200));
    const edits: EditEvent[] = [
      { t: 120, at: 2, seq: 1, wordIndex: 1, pos: 0, kind: "back", cross: true },
      { t: 160, at: 2, seq: 2, wordIndex: 0, pos: 2, kind: "back" },
    ];
    expect(s.edits).toEqual(edits);
    expect(s.typed).toEqual(["ab"]);
  });

  it("at column 0 with no errored previous word records nothing", () => {
    const a = run(rest(["ab", "cd"]), key("a", 0), key("b", 40), sp(80));
    expect(reducer(a, back(120))).toBe(a);
  });

  it("at rest records nothing", () => {
    const a = rest(["ab", "cd"]);
    expect(reducer(a, back(10))).toBe(a);
    expect(reducer(a, backWord(10))).toBe(a);
  });

  it("BACKSPACE_WORD sets its kind, with and without cross", () => {
    const s = run(rest(["ab", "cd"]), key("x", 0), sp(50), key("c", 90), backWord(130), backWord(170));
    expect(s.edits!.map((e) => [e.kind, e.cross ?? false, e.wordIndex, e.pos])).toEqual([
      ["backWord", false, 1, 1],
      ["backWord", true, 1, 0],
    ]);
    expect(s.cursorWord).toBe(0);
    expect(s.typed[0]).toBe("");
  });

  it("an old caller without now still records, on the Date.now clock", () => {
    const before = Date.now();
    const s = run(rest(["ab"]), key("a", before), { type: "BACKSPACE" });
    expect(s.edits).toHaveLength(1);
    expect(s.edits![0]!.t).toBeGreaterThanOrEqual(0);
  });
});

describe("ordering, anchoring, resets and caps", () => {
  it("seq increases strictly across edits and spaces", () => {
    const s = run(rest(["ab", "cd", "ef"]), key("a", 0), sp(30), back(60), back(90), key("b", 120), sp(150), key("x", 180), back(210), sp(240));
    const seqs = [...s.edits!, ...s.spaces!].map((m) => [m.at, m.seq]).sort((x, y) => x[1]! - y[1]!);
    expect(seqs.map((x) => x[1])).toEqual([0, 1, 2, 3, 4, 5]);
    for (let i = 1; i < seqs.length; i++) expect(seqs[i]![0]!).toBeGreaterThanOrEqual(seqs[i - 1]![0]!);
  });

  it("ANCHOR_START shifts the t of events, edits and spaces equally, and leaves ht alone", () => {
    const a = run(rest(["ab", "cd"]), key("a", 5_000, { ht: 300 }), key("x", 5_100, { ht: 400 }), back(5_200, { ht: 500 }), sp(5_300, { ht: 600 }));
    const s = reducer(a, { type: "ANCHOR_START", at: 3_000 });
    expect(s.events.map((e) => [e.t, e.ht])).toEqual([[2_000, 0], [2_100, 100]]);
    expect(s.edits!.map((e) => [e.t, e.ht])).toEqual([[2_200, 200]]);
    expect(s.spaces!.map((e) => [e.t, e.ht])).toEqual([[2_300, 300]]);
    expect(s.htOrigin).toBe(300);
  });

  it("freshRun clears the capture, layoutHits and capped", () => {
    const a = run(rest(["ab", "cd"]), key("a", 0, { ht: 9, codeOk: true }), sp(40), key("x", 80), back(120));
    const s = reducer({ ...a, capped: true }, { type: "RESTART", words: ["ab"], quoteSource: null });
    expect([s.edits, s.spaces, s.htOrigin, s.layoutHits, s.capped]).toEqual([[], [], null, [0, 0], false]);
  });

  it("the caps hold and set capped", () => {
    let s = run(rest(["a".repeat(8), "b"]), key("a", 0));
    s = { ...s, edits: Array.from({ length: EDIT_CAP }, (_, i) => ({ t: 1, at: 1, seq: i, wordIndex: 0, pos: 1, kind: "back" as const })) };
    s = reducer(s, back(10));
    expect(s.edits).toHaveLength(EDIT_CAP);
    expect(s.capped).toBe(true);
    let t = run(rest(["ab", "cd"]), key("a", 0));
    t = { ...t, spaces: Array.from({ length: SPACE_CAP }, (_, i) => ({ t: 1, at: 1, seq: i, wordIndex: 0, pos: 1 })) };
    t = reducer(t, sp(10));
    expect(t.spaces).toHaveLength(SPACE_CAP);
    expect(t.capped).toBe(true);
    expect(t.cursorWord).toBe(1);
  });

  it("the done phase records nothing", () => {
    const done = run(rest(["ab"]), key("a", 0), key("b", 40));
    expect(done.phase).toBe("done");
    for (const a of [key("c", 80, { codeOk: true }), sp(80), back(80), backWord(80)]) expect(reducer(done, a)).toBe(done);
  });
});
