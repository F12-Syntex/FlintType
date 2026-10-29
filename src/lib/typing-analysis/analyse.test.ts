import { describe, expect, it } from "vitest";
import { calcWpmAndRaw } from "@/lib/wpm";
import { submitTestInputSchema } from "@/types/adapt";
import type { KeystrokeTimingV2 } from "@/types/capture";
import { SLICE_ORDER, type RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { submitToRunInput } from "./from-submit";
import { asV1, randomScript, steady, withMistake, withPause } from "./run-script";
import { seeded } from "./run-script-core";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field".split(" ");

describe("analyseRun", () => {
  it("returns null only for unusable input", () => {
    const r = steady(WORDS);
    expect(analyseRun({ ...r, timings: [] })).toBeNull();
    expect(analyseRun({ ...r, durationMs: 0 })).toBeNull();
    expect(analyseRun({ ...r, durationMs: NaN })).toBeNull();
    expect(analyseRun({ ...r, wpm: Infinity })).toBeNull();
    expect(analyseRun(r)).not.toBeNull();
  });

  it("v1 and v2 of the same simple run give equal slices within 1 ms", () => {
    for (const r of [steady(WORDS), withPause(withMistake(steady(WORDS), { word: 3, pos: 1 }), { beforeWord: 6, ms: 1100 })]) {
      const a = analyseRun(r)!.slices!;
      const b = analyseRun(asV1(r))!.slices!;
      for (const k of SLICE_ORDER) expect(Math.abs(a[k] - b[k])).toBeLessThanOrEqual(1);
    }
  });

  it("v2 ignores typedFinal, so the client and the server agree", () => {
    for (let s = 0; s < 50; s++) {
      const r = randomScript(s);
      if (!r.edits) continue;
      expect(analyseRun({ ...r, typedFinal: undefined })).toEqual(analyseRun(r));
    }
  });

  it("the settings preview fixture: a pause before “the”, then a word left wrong, and no fixing", () => {
    const words = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog"];
    let s = 42;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
    const events: KeystrokeTimingV2[] = [];
    let t = 0;
    words.forEach((word, wi) => {
      [...word].forEach((ch, ci) => {
        const jitter = (rand() - 0.5) * 80;
        if (wi > 0 || ci > 0) t += 200 + jitter;
        if (wi === 2 && ci === 1) {
          events.push({ t: Math.round(t), expected: "r", typed: "e", correct: false, wordIndex: 2 });
          t += 600;
        }
        const wrong = wi === 4 && ci === 1;
        events.push({ t: Math.round(t), expected: ch, typed: wrong ? "x" : ch, correct: !wrong, wordIndex: wi });
      });
      t += 200 + (rand() - 0.5) * 60 + (wi === 5 ? 2200 : 0);
    });
    const typed = words.map((w, i) => (i === 4 ? "jxmps" : w));
    const T = Math.round(t);
    const wpm = calcWpmAndRaw(typed, words, T, true, events.length).wpm;
    const a = analyseRun({ timings: events, words, typedFinal: typed, durationMs: T, wpm, lengthMode: "words", ctx: {} })!;
    expect(a.quality.capture).toBe(1);
    expect(a.slices!.breaks).toBe(0);
    expect(a.slices!.before).toBeGreaterThan(1600);
    expect(a.slices!.fixing).toBeGreaterThan(400);
    expect(a.slices!.fixing).toBeLessThan(800);
    expect(a.findings.map((f) => f.kind)).toEqual(["before", "left"]);
    expect(a.findings[0]).toMatchObject({ count: 1, longest: { word: "the" } });
    expect(a.findings[1]).toMatchObject({ count: 1 });
    expect(a.mistakes.lostChars).toBe(6);
  });

  it("partial: from input.partial, and from a long v1 head (an old clone window)", () => {
    expect(analyseRun({ ...steady(WORDS), partial: true })!.quality.partial).toBe(true);
    expect(analyseRun(steady(WORDS))!.quality.partial).toBe(false);
    const v1 = asV1(steady(WORDS));
    const windowed = { ...v1, timings: v1.timings.map((e) => ({ ...e, t: e.t + 9000 })), durationMs: v1.durationMs + 9000 };
    expect(analyseRun(windowed)!.quality.partial).toBe(true);
  });

  it("submitToRunInput: null without a length unit, else the payload's run", () => {
    const r = withMistake(steady(WORDS), { word: 2, pos: 1 });
    const payload = submitTestInputSchema.parse({
      startedAt: 1_000, completedAt: 1_000 + r.durationMs, mode: "casual", durationOrWordCount: WORDS.length, lengthMode: "words",
      wpm: r.wpm, accuracy: 98, errorCount: 0, resetCount: 0, wasCompleted: true, words: r.words, timings: r.timings,
      edits: r.edits, spaces: r.spaces, ctx: r.ctx,
    });
    const run = submitToRunInput(payload)!;
    expect(run.durationMs).toBe(r.durationMs);
    expect(analyseRun(run)).toEqual(analyseRun(r));
    expect(submitToRunInput({ ...payload, lengthMode: undefined })).toBeNull();
  });

  it("completes a 20,000-event run", () => {
    const words: string[] = [];
    for (let n = 0, i = 0; n < 20_000; i++) {
      const w = WORDS[i % WORDS.length]!.slice(0, 20_000 - n);
      words.push(w);
      n += w.length;
    }
    const big = withMistake(steady(words), { word: 50, pos: 1 });
    expect(big.timings.length).toBe(20_001);
    const a = analyseRun(big)!;
    expect(a.quality.capture).toBe(2);
    expect(a.slices).not.toBeNull();
  });

  it("I8: never throws on 500 fuzzed inputs", () => {
    const rng = seeded(4242);
    const pick = <T>(xs: T[]) => xs[Math.floor(rng() * xs.length)]!;
    const weird = [NaN, -50, 0, 1e12, -1e9, 3.3, Infinity];
    for (let i = 0; i < 500; i++) {
      const r = randomScript(i % 97);
      const timings = r.timings.map((e) => {
        const x = rng();
        if (x < 0.03) return { ...e, t: pick(weird) };
        if (x < 0.06) return { ...e, wordIndex: pick([-1, 1e6, 2.5, NaN]) };
        if (x < 0.08) return { ...e, pos: pick([-1, 1e5, NaN]) };
        if (x < 0.1) return { ...e, expected: pick(["", "ab", "🙂", "\u0000"]), typed: pick(["", "🙂", "zz"]) };
        if (x < 0.11) return { ...e, ht: pick(weird) };
        return e;
      });
      const marks = <T extends { at: number; seq: number; t: number }>(m: readonly T[] | undefined) =>
        m?.map((x) => (rng() < 0.05 ? { ...x, at: pick([-1, 1e6, x.at + 3]), seq: pick([0, x.seq, NaN]), t: pick(weird) } : x));
      const input = {
        ...r,
        timings: rng() < 0.05 ? [] : timings,
        edits: rng() < 0.1 ? undefined : marks(r.edits),
        spaces: marks(r.spaces),
        words: rng() < 0.1 ? [] : rng() < 0.1 ? r.words.slice(0, 2) : r.words,
        durationMs: rng() < 0.05 ? pick(weird) : r.durationMs,
        ctx: rng() < 0.1 ? ({ input: "bogus", confidence: 7, codeMatch: "x" } as unknown as RunInput["ctx"]) : r.ctx,
      } as RunInput;
      let out: ReturnType<typeof analyseRun> = null;
      expect(() => (out = analyseRun(input))).not.toThrow();
      const a = out as ReturnType<typeof analyseRun>;
      if (a?.slices) expect(SLICE_ORDER.reduce((x, k) => x + a.slices![k], 0)).toBe(a.T);
    }
  });
});
