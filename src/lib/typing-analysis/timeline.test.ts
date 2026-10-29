import { describe, expect, it } from "vitest";
import type { RunInput } from "@/types/typing-analysis";
import { asV1, clockStep, firstKeySpace, quantise, steady, timeRun, withMistake } from "./run-script";
import { MAX_DURATION_MS, MAX_WORD_INDEX } from "./constants";
import { buildTimeline, usableInput, wordAt } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field".split(" ");

describe("capture version", () => {
  it("is v2 only when both mark arrays exist and every timing has pos", () => {
    const r = steady(WORDS);
    expect(buildTimeline(r).capture).toBe(2);
    expect(buildTimeline({ ...r, edits: undefined }).capture).toBe(1);
    expect(buildTimeline({ ...r, spaces: undefined }).capture).toBe(1);
    expect(buildTimeline({ ...r, edits: [], spaces: [] }).capture).toBe(2);
    const mixed = r.timings.map((e, i) => (i === 3 ? { ...e, pos: undefined } : e));
    expect(buildTimeline({ ...r, timings: mixed }).capture).toBe(1);
    expect(buildTimeline(asV1(r)).capture).toBe(1);
  });

  it("falls back to v1 when the client hit its cap", () => {
    const r = steady(WORDS);
    expect(buildTimeline({ ...r, ctx: { capped: true } }).capture).toBe(1);
  });

  it("carries the run's length unit (the episodes' end-of-run rule reads it)", () => {
    const r = steady(WORDS);
    expect(buildTimeline(r).lengthMode).toBe(r.lengthMode);
    expect(buildTimeline(timeRun(r, 3000)).lengthMode).toBe("time");
  });

  it("falls back to v1 for a mark it can't place", () => {
    const r = steady(WORDS);
    const K = r.timings.length;
    const late = r.spaces!.map((s, i) => (i === 0 ? { ...s, at: K + 1 } : s));
    expect(buildTimeline({ ...r, spaces: late }).capture).toBe(1);
    const dup = r.spaces!.map((s, i) => (i === 1 ? { ...s, seq: r.spaces![0]!.seq } : s));
    expect(buildTimeline({ ...r, spaces: dup }).capture).toBe(1);
    const swapped = [...r.spaces!];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(buildTimeline({ ...r, spaces: swapped }).capture).toBe(1);
  });

  it("merges marks by at, then seq", () => {
    const r = withMistake(steady(WORDS), { word: 1, pos: 4, noticeAfter: 0 });
    const tl = buildTimeline(r);
    const order = tl.marks.flatMap((ms) => ms.map((m) => (m.kind === "space" ? m.s.seq : m.e.seq)));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (let k = 0; k <= tl.K; k++) {
      for (const m of tl.marks[k]!) expect(m.kind === "space" ? m.s.at : m.e.at).toBe(k);
    }
  });
});

describe("clocks and coverage", () => {
  it("head is t[0], tail is T − t[K−1], and a negative dt is kept", () => {
    const base = steady(WORDS);
    const r: RunInput = { ...base, timings: base.timings.map((e) => ({ ...e, t: e.t + 400 })), durationMs: base.durationMs + 700 };
    const tl = buildTimeline(r);
    expect(tl.head).toBe(400);
    expect(tl.tail).toBe(300);
    const stepped = buildTimeline(clockStep(base, 10, -500));
    expect(stepped.dt[10]).toBeLessThan(0);
  });

  it("wordsReached ignores a trailing slot with no events", () => {
    // A TIME run that ends 50 ms after the Space leaving word 3.
    const base = steady(WORDS);
    const space = base.spaces!.find((s) => s.wordIndex === 3)!;
    const r = timeRun(base, space.t + 50);
    expect(r.words.length).toBe(5);
    const tl = buildTimeline(r);
    expect(tl.wordsReached).toBe(4);
    expect(tl.marks[tl.K]!.map((m) => m.kind)).toEqual(["space"]);
  });

  it("detects a 16.667 ms grid and a 100 ms grid, but not jittered data", () => {
    expect(buildTimeline(steady(WORDS, { key: 97, jitter: 9 })).quantised).toBe(false);
    expect(buildTimeline(quantise(steady(WORDS, { key: 97, jitter: 9 }), 1000 / 60)).quantised).toBe(true);
    expect(buildTimeline(quantise(steady(WORDS, { key: 97, jitter: 9 }), 100)).quantised).toBe(true);
  });

  it("uses ht for statistics only when it never decreases and isn't on a grid", () => {
    const r = steady(WORDS, { ht: true });
    const tl = buildTimeline(r);
    expect(tl.useHt).toBe(true);
    const back = r.timings.map((e, i) => (i === 5 ? { ...e, ht: 0 } : e));
    expect(buildTimeline({ ...r, timings: back }).useHt).toBe(false);
    const gridHt = r.timings.map((e) => ({ ...e, ht: Math.round(e.ht! / 100) * 100 }));
    const g = buildTimeline({ ...r, timings: gridHt });
    expect(g.useHt).toBe(false);
    expect(g.quantised).toBe(false);
    expect(buildTimeline(asV1(r)).useHt).toBe(false);
  });

  it("input kind from ctx, else from src (v1 defaults to keyboard)", () => {
    expect(buildTimeline(steady(WORDS)).input).toBe("keyboard");
    expect(buildTimeline(steady(WORDS, { src: "input" })).input).toBe("touch");
    expect(buildTimeline({ ...steady(WORDS, { src: "input" }), edits: undefined }).input).toBe("keyboard");
    expect(buildTimeline({ ...steady(WORDS), ctx: { input: "mixed" } }).input).toBe("mixed");
  });

  it("a missing word reads as an empty string", () => {
    expect(wordAt(["a"], 3)).toBe("");
    expect(wordAt(["a"], 0)).toBe("a");
  });

  it("firstKeySpace in v1 and v2", () => {
    const r = firstKeySpace(steady(WORDS), 180);
    expect(buildTimeline(r).firstKeySpace).toBe(true);
    expect(buildTimeline(asV1(r)).firstKeySpace).toBe(true);
    expect(buildTimeline(steady(WORDS)).firstKeySpace).toBe(false);
    expect(buildTimeline(r).head).toBe(180);
  });
});

describe("usableInput", () => {
  it("bounds the duration and word indexes, and needs finite, typed char events", () => {
    const r = steady(WORDS);
    const at5 = (o: Record<string, unknown>) => ({ ...r, timings: r.timings.map((e, i) => (i === 5 ? { ...e, ...o } : e)) });
    expect(usableInput(r)).toBe(true);
    expect(usableInput({ ...r, durationMs: MAX_DURATION_MS })).toBe(true);
    expect(usableInput({ ...r, durationMs: MAX_DURATION_MS + 1 })).toBe(false);
    expect(usableInput({ ...r, durationMs: 0 })).toBe(false);
    expect(usableInput({ ...r, wpm: NaN })).toBe(false);
    expect(usableInput(at5({ wordIndex: MAX_WORD_INDEX }))).toBe(true);
    expect(usableInput(at5({ wordIndex: MAX_WORD_INDEX + 1 }))).toBe(false);
    for (const bad of [{ wordIndex: -1 }, { wordIndex: 1.5 }, { t: Infinity }, { expected: undefined }, { correct: 1 }]) {
      expect(usableInput(at5(bad) as RunInput)).toBe(false);
    }
    expect(usableInput({ ...r, timings: [] })).toBe(false);
    expect(usableInput({ ...r, words: undefined } as unknown as RunInput)).toBe(false);
    expect(usableInput(null as unknown as RunInput)).toBe(false);
  });
});
