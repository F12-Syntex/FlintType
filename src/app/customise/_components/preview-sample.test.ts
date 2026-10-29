import { describe, expect, it } from "vitest";
import { stateToRunInput } from "@/app/_components/practice-submit";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import { calcWpmAndRaw } from "@/lib/wpm";
import { buildDoneRun, buildSampleRun, buildState } from "./preview-sample";

/** PREVIEW_PANGRAM, as a literal so this test never imports the client module. */
const PANGRAM = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"];
const NOW = 1_700_000_000_000;

function analysed() {
  const { state, sample, source } = buildDoneRun(PANGRAM, NOW);
  const T = state.endTime! - state.startTime!;
  const { wpm } = calcWpmAndRaw(state.typed, state.words, T, true, state.events.length);
  const analysis = analyseRun(stateToRunInput(state, {}, wpm)!);
  return { state, sample, source, wpm, T, analysis: analysis! };
}

describe("buildDoneRun: one clock", () => {
  it("starts at the first key and ends with the run", () => {
    const { state, T } = analysed();
    expect(state.events[0]!.t).toBe(0);
    expect(state.endTime).toBe(NOW);
    expect(T).toBe(buildSampleRun(PANGRAM).elapsedMs);
    // The 200 ms tail after the last key is all that follows it.
    expect(T - state.events.at(-1)!.t).toBeLessThan(300);
  });
  it("rebuilds typed from the events: the fixed slip is gone, the left slip stays", () => {
    const { state } = analysed();
    expect(state.typed).toEqual(["the", "quick", "brown", "fox", "jxmps", "over", "the", "lazy", "dog"]);
    expect([...state.errorWords]).toEqual([4]);
    expect(state.cursorWord).toBe(PANGRAM.length);
    expect(state.correctChars).toBe(state.totalChars - 1);
  });
  it("its hero speed is the one a submit computes, and the curve is levelled to it", () => {
    const { sample, wpm } = analysed();
    expect(sample.wpm).toBeCloseTo(wpm, 6);
    const avg = sample.wpmHistory.reduce((a, h) => a + h.wpm, 0) / sample.wpmHistory.length;
    expect(Math.abs(avg - wpm)).toBeLessThan(2);
    for (const h of sample.wpmHistory) expect(h.raw).toBeGreaterThanOrEqual(h.wpm);
  });
  it("supplies a fixed source with an empty context", () => {
    const { source, wpm, state } = analysed();
    expect(source).not.toBeNull();
    expect(source!.bucket).toBe("casual|words|9");
    expect(source!.fixMode).toBe("fix");
    expect(source!.startedAt).toBe(state.startTime);
    expect(source!.input.ctx).toEqual({});
    expect(source!.input.wpm).toBeCloseTo(wpm, 6);
  });
});

describe("what the result preview shows (spec-50 §6.5)", () => {
  it("a time card with typing, fixing and pauses, and no breaks", () => {
    const { analysis } = analysed();
    expect(analysis.slices).not.toBeNull();
    const s = analysis.slices!;
    expect(s.typing).toBeGreaterThan(0);
    expect(s.fixing).toBeGreaterThan(0);
    expect(s.before).toBeGreaterThan(0);
    expect(s.breaks).toBe(0);
    expect(s.typing + s.fixing + s.before + s.inside + s.breaks).toBe(analysis.T);
    expect(analysis.quality.partial).toBe(false);
  });
  it("the pause before “the”, then the word left wrong, and no fixing finding", () => {
    const { analysis } = analysed();
    expect(analysis.findings.map((f) => f.kind)).toEqual(["before", "left"]);
    const before = analysis.findings[0]!;
    expect(before.kind === "before" && before.longest?.word).toBe("the");
    expect(before.kind === "before" && before.ms).toBeGreaterThan(1600);
    const left = analysis.findings[1]!;
    expect(left.kind === "left" && left.count).toBe(1);
    expect(analysis.mistakes.lostChars).toBe(6);
  });
  it("its flow speed reads above its hero speed", () => {
    const { analysis, wpm } = analysed();
    expect(analysis.flowWpm).not.toBeNull();
    expect(analysis.flowWpm! - wpm).toBeGreaterThanOrEqual(3);
  });
  it("is the same on every render", () => {
    expect(buildDoneRun(PANGRAM, NOW).state.events).toEqual(buildDoneRun(PANGRAM, NOW + 5).state.events);
  });
});

describe("buildState: the running previews are unchanged", () => {
  it("a partway run about 12 s in", () => {
    const s = buildState({ words: PANGRAM, finishedWords: 4, cursorChar: 2, errorWord: 1, phase: "running", events: [], now: NOW });
    expect(s.startTime).toBe(NOW - 12_000);
    expect(s.endTime).toBeNull();
    expect(s.typed).toEqual(["the", "quicx", "brown", "fox", "ju"]);
    expect(s.cursorWord).toBe(4);
    expect([...s.errorWords]).toEqual([1]);
  });
});
