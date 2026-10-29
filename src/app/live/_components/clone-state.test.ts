import { describe, expect, it } from "vitest";
import { reachedWords } from "@/app/_components/practice-submit";
import type { LiveScreen } from "@/types/live";
import { cloneCursorWord, cloneState } from "./clone-state";

const WORDS = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "again"];
const NOW = 5_000_000;

/** A done frame as the broadcaster sends it (live-screen-payload.ts). */
function frame(over: Partial<LiveScreen>): LiveScreen {
  return {
    phase: "done",
    typed: [],
    cursorWord: 0,
    cursorChar: 3,
    mode: "WORDS",
    length: 10,
    quoteSource: null,
    elapsedMs: 10_000,
    raw: 60,
    adapt: false,
    events: [],
    ...over,
  };
}

describe("cloneCursorWord", () => {
  it("a done TIME frame keeps the broadcaster's cursor; WORDS and QUOTE sit past the last word", () => {
    expect(cloneCursorWord("done", "TIME", 45, 300)).toBe(45);
    expect(cloneCursorWord("done", "WORDS", 24, 25)).toBe(25);
    expect(cloneCursorWord("done", "QUOTE", 9, 10)).toBe(10);
  });
  it("clamps to the words it has", () => {
    expect(cloneCursorWord("running", "TIME", 400, 300)).toBe(300);
    expect(cloneCursorWord("running", "WORDS", -2, 25)).toBe(0);
  });
});

describe("cloneState", () => {
  // A 60 s TIME test: 45 words done of a 300-word refill buffer, one
  // half-typed when the timer ran out.
  const buffer = Array.from({ length: 300 }, (_, i) => WORDS[i % WORDS.length]!);
  const time = frame({ mode: "TIME", length: 60, elapsedMs: 60_000, typed: [...buffer.slice(0, 45), "ju"], cursorWord: 45 });

  it("a done TIME frame counts only the words reached, as the broadcaster's screen does", () => {
    const st = cloneState(buffer, time, NOW);
    expect(st.cursorWord).toBe(45);
    // TestSummary's Run details: committed = min(words, cursorWord), so "N of 45", never "of 300".
    expect(Math.min(st.words.length, st.cursorWord)).toBe(45);
    // The analysis and the broadcaster's submit both cut the buffer here.
    expect(reachedWords(st)).toEqual(buffer.slice(0, 46));
    // The untyped buffer is never an error word.
    expect(st.errorWords.size).toBe(0);
  });
  it("one clock: a done run lasts exactly elapsedMs", () => {
    const st = cloneState(buffer, time, NOW);
    expect(st.endTime! - st.startTime!).toBe(60_000);
    expect(st.cursorChar).toBe(0);
  });
  it("a done WORDS frame sits past the last word and marks a wrong word", () => {
    const st = cloneState(WORDS, frame({ typed: ["teh", ...WORDS.slice(1)], cursorWord: 9 }), NOW);
    expect(st.cursorWord).toBe(WORDS.length);
    expect([...st.errorWords]).toEqual([0]);
    expect(st.totalChars).toBe(40);
    expect(st.correctChars).toBe(38);
  });
  it("a running frame keeps its cursor and has no end", () => {
    const st = cloneState(WORDS, frame({ phase: "running", typed: WORDS.slice(0, 3), cursorWord: 3, cursorChar: 2 }), NOW);
    expect(st.cursorWord).toBe(3);
    expect(st.cursorChar).toBe(2);
    expect(st.endTime).toBeNull();
    expect(st.startTime).toBe(NOW - 10_000);
  });
});
