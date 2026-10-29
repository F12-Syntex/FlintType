import { describe, expect, it } from "vitest";
// A test-only dependency on P4's reducer (source modules import only @/lib
// and @/types). Built from `initialState` so new State fields carry over.
import { initialState, reducer, type Mode, type State } from "@/app/_components/practice-reducer";
import { replayRun } from "./replay";
import { noTruth, render, scriptOf, type Script } from "./run-script-core";
import { randomScript } from "./run-script";
import { buildTimeline } from "./timeline";

/** Drives the real practice reducer with a script's acts and returns its
 *  final State, so the DSL renderer is checked against the reducer. */
function drive(sc: Script): State {
  const mode: Mode = sc.lengthMode === "time" ? "TIME" : sc.lengthMode === "quote" ? "QUOTE" : "WORDS";
  const base = 1_000_000;
  let s: State = {
    ...initialState, mode, length: sc.words.length, adapt: false, phase: "rest", words: [...sc.words], cursorWord: 0, cursorChar: 0,
    errorWords: new Set(), totalChars: 0, correctChars: 0, startTime: null, endTime: null, events: [], typed: [], quoteSource: null,
  };
  if (sc.ctx.race) s = reducer(s, { type: "ANCHOR_START", at: base });
  const stopOnError = sc.ctx.stopOnError === true;
  for (const a of sc.acts) {
    const now = base + Math.round(a.t);
    if (sc.T !== undefined && now - base > Math.round(sc.T)) break;
    if (a.k === "char") s = reducer(s, { type: "TYPE_CHAR", char: a.ch, now, stopOnError, allowExtras: sc.ctx.allowExtras !== false });
    else if (a.k === "space") s = reducer(s, { type: "SPACE", now, strictSpace: sc.ctx.strictSpace === true, backspaceLocked: sc.ctx.confidence === "all" });
    else s = reducer(s, { type: a.word ? "BACKSPACE_WORD" : "BACKSPACE" });
  }
  if (sc.T !== undefined) s = reducer(s, { type: "FINISH_TIME", now: base + Math.round(sc.T) });
  return s;
}

describe("renderWithMap mirrors the practice reducer", () => {
  it("gives the reducer's events, typed buffers and duration on 300 random scripts", () => {
    for (let seed = 0; seed < 300; seed++) {
      const r = randomScript(seed);
      const sc = scriptOf(r);
      const s = drive(sc);
      const reached = Math.min(s.cursorWord + 1, s.words.length);
      expect(r.words).toEqual(sc.words.slice(0, reached));
      expect(r.timings.map(({ t, expected, typed, correct, wordIndex }) => ({ t, expected, typed, correct, wordIndex })))
        .toEqual(s.events.map(({ t, expected, typed, correct, wordIndex }) => ({ t, expected, typed, correct, wordIndex })));
      expect(r.typedFinal).toEqual(s.typed.slice(0, reached));
      if (s.endTime !== null && s.startTime !== null) expect(r.durationMs).toBe(s.endTime - s.startTime);
      // And the v2 records replay back to the reducer's buffers exactly.
      if (r.edits) {
        const rep = replayRun(buildTimeline(r), r.words);
        expect(rep.mismatches).toBe(0);
        expect(rep.typed.slice(0, reached)).toEqual(s.typed.slice(0, reached));
      }
    }
  });

  it("records pos as the cursor column, early spaces and crosses", () => {
    const sc: Script = {
      words: ["ab", "cd"],
      acts: [
        { k: "char", t: 0, ch: "a" }, { k: "space", t: 100 }, { k: "back", t: 200 }, { k: "char", t: 300, ch: "b" },
        { k: "space", t: 400 }, { k: "char", t: 500, ch: "c" }, { k: "char", t: 600, ch: "d" },
      ],
      ctx: {}, lengthMode: "words", truth: noTruth(),
    };
    const r = render(sc);
    expect(r.spaces?.map((s) => [s.at, s.seq, s.wordIndex, s.pos, s.early])).toEqual([[1, 0, 0, 1, true], [2, 2, 0, 2, undefined]]);
    expect(r.edits?.map((e) => [e.at, e.seq, e.wordIndex, e.pos, e.kind, e.cross])).toEqual([[1, 1, 1, 0, "back", true]]);
    expect(r.timings.map((e) => e.pos)).toEqual([0, 1, 0, 1]);
    expect(r.durationMs).toBe(600);
  });

  it("drops what the reducer drops: a strict-space no-op and a backspace at column 0", () => {
    const sc: Script = {
      words: ["ab", "cd"],
      acts: [{ k: "back", t: 0 }, { k: "char", t: 0, ch: "a" }, { k: "space", t: 50 }, { k: "char", t: 100, ch: "b" }],
      ctx: { strictSpace: true }, lengthMode: "words", truth: noTruth(),
    };
    const r = render(sc);
    expect(r.spaces).toEqual([]);
    expect(r.edits).toEqual([]);
    expect(r.timings.map((e) => e.typed).join("")).toBe("ab");
  });
});
