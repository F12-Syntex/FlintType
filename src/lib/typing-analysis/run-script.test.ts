import { describe, expect, it } from "vitest";
import type { RunInput } from "@/types/typing-analysis";
import { replayRun } from "./replay";
import {
  asV1, backIntoPrevious, clockStep, endOnSpace, extras, firstKeySpace, quantise, raceAnchor, randomScript, steady, stopOnError,
  timeRun, truth, withBreak, withMistake, withPause,
} from "./run-script";
import { keyGap, seeded } from "./run-script-core";
import { buildTimeline } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs".split(" ");
const injected = (r: RunInput) => Object.values(truth(r)).reduce((a, b) => a + b, 0);

function checkRecords(r: RunInput, monotone = true) {
  if (monotone) for (let k = 1; k < r.timings.length; k++) expect(r.timings[k]!.t).toBeGreaterThanOrEqual(r.timings[k - 1]!.t);
  const marks = [...(r.spaces ?? []), ...(r.edits ?? [])].sort((a, b) => a.seq - b.seq);
  marks.forEach((m, i) => expect(m.seq).toBe(i));
  for (let i = 1; i < marks.length; i++) expect(marks[i]!.at).toBeGreaterThanOrEqual(marks[i - 1]!.at);
  for (const m of marks) expect(m.at).toBeLessThanOrEqual(r.timings.length);
  const rep = replayRun(buildTimeline(r), r.words);
  expect(rep.mismatches).toBe(0);
}

describe("steady", () => {
  it("types the words with exact pos, at and seq, key 100 and word gap 200", () => {
    const r = steady(WORDS, { jitter: 0 });
    checkRecords(r);
    expect(r.typedFinal).toEqual(WORDS);
    expect(keyGap(r)).toBe(100);
    expect(r.timings[3]!.t - r.timings[2]!.t).toBe(200);
    expect(r.spaces!.map((s) => s.at)).toEqual(WORDS.slice(0, -1).map((_, i) => WORDS.slice(0, i + 1).join("").length));
    expect(r.timings.map((e) => e.pos)).toEqual(WORDS.flatMap((w) => [...w].map((_, i) => i)));
    expect(r.durationMs).toBe(r.timings[r.timings.length - 1]!.t);
    expect(r.ctx).toEqual({});
  });

  it("carries ht and src when asked", () => {
    const r = steady(WORDS, { ht: true, src: "input" });
    expect(r.timings.every((e) => e.ht !== undefined && e.src === "input")).toBe(true);
    expect(r.spaces!.every((s) => s.src === "input")).toBe(true);
  });
});

describe("modifiers", () => {
  it("inserted time is recorded per slice and adds up to the longer run", () => {
    const base = steady(WORDS);
    let r = withMistake(base, { word: 2, pos: 1, noticeAfter: 2, fixGapMs: 300 });
    r = withPause(r, { beforeWord: 5, ms: 900 });
    r = withPause(r, { insideWord: [6, 1], ms: 600 });
    r = withBreak(r, { beforeWord: 8, ms: 3000 });
    r = extras(r, { word: 9, n: 2, deleted: true });
    r = backIntoPrevious(r, { word: 3 });
    checkRecords(r);
    const t = truth(r);
    expect(t.before).toBeGreaterThan(600);
    expect(t.inside).toBeGreaterThan(400);
    expect(t.breaks).toBeGreaterThan(2700);
    expect(r.durationMs - base.durationMs).toBe(Math.round(injected(r)));
    expect(r.typedFinal).toEqual(WORDS);
  });

  it("a mistake left in stays in its word; a blocked one repeats then gets through", () => {
    const left = withMistake(steady(WORDS), { word: 4, pos: 2, backspaces: 0 });
    expect(left.typedFinal![4]).toBe("juxps");
    expect(truth(left).fixing).toBe(0);
    const blocked = withMistake(stopOnError(steady(WORDS)), { word: 4, pos: 2, noticeAfter: 2, fixGapMs: 400 });
    expect(blocked.ctx?.stopOnError).toBe(true);
    expect(blocked.timings.filter((e) => !e.correct)).toHaveLength(3);
    expect(blocked.typedFinal![4]).toBe("jumps");
    checkRecords(blocked);
  });

  it("run shapes: first-key Space, ending on Space, race head, TIME", () => {
    const fks = firstKeySpace(steady(WORDS), 180);
    expect(fks.spaces![0]).toMatchObject({ at: 0, t: 0, wordIndex: 0, pos: 0, early: true });
    expect(fks.timings[0]).toMatchObject({ t: 180, wordIndex: 1 });
    const eos = endOnSpace(steady(WORDS), { tailMs: 150 });
    const last = eos.spaces![eos.spaces!.length - 1]!;
    expect(last.at).toBe(eos.timings.length);
    expect(eos.durationMs - eos.timings[eos.timings.length - 1]!.t).toBe(150);
    const race = raceAnchor(steady(WORDS, { ht: true }), 900);
    expect(race.timings[0]).toMatchObject({ t: 900, ht: 0 });
    expect(race.ctx?.race).toBe(true);
    const time = timeRun(steady(WORDS), 1234);
    expect(time).toMatchObject({ lengthMode: "time", durationMs: 1234 });
    expect(time.timings.every((e) => e.t <= 1234)).toBe(true);
    for (const r of [fks, eos, race, time]) checkRecords(r);
  });

  it("asV1 strips pos, src, ht, marks and ctx; quantise and clockStep move the clock", () => {
    const v1 = asV1(steady(WORDS, { ht: true, src: "input" }));
    expect(v1.edits).toBeUndefined();
    expect(v1.spaces).toBeUndefined();
    expect(v1.ctx).toBeUndefined();
    expect(Object.keys(v1.timings[0]!).sort()).toEqual(["correct", "expected", "t", "typed", "wordIndex"]);
    const q = quantise(steady(WORDS), 100);
    expect(q.timings.every((e) => e.t % 100 === 0)).toBe(true);
    const stepped = clockStep(steady(WORDS, { jitter: 0 }), 10, -500);
    expect(stepped.timings[10]!.t - stepped.timings[9]!.t).toBeLessThan(0);
    checkRecords(stepped, false);
  });
});

describe("randomScript", () => {
  it("is deterministic per seed and differs across seeds", () => {
    expect(randomScript(17)).toEqual(randomScript(17));
    expect(randomScript(17)).not.toEqual(randomScript(18));
  });

  it("honours its options", () => {
    const r = randomScript(5, { words: 12, errRate: 0, pauseRate: 0 });
    expect(r.words.length).toBeLessThanOrEqual(12);
  });

  it("always replays cleanly as v2", () => {
    for (let s = 0; s < 200; s++) checkRecords(randomScript(s), false);
  });

  it("seeded() is a uniform PRNG in [0, 1)", () => {
    const rng = seeded(1);
    const xs = Array.from({ length: 5000 }, rng);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(0.5, 1);
  });
});
