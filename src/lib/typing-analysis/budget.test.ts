import { describe, expect, it } from "vitest";
import { SLICE_ORDER, type RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { boundaryUnits, computeBudget, episodeMask } from "./budget";
import { episodesV2 } from "./episodes";
import { episodesV1 } from "./episodes-v1";
import { estimatePace, taintOf, thresholds } from "./pace";
import { replayRun } from "./replay";
import {
  clockStep, endOnSpace, firstKeySpace, quantise, raceAnchor, steady, timeRun, withBreak, withMistake, withPause,
} from "./run-script";
import { noTruth, render, type Act } from "./run-script-core";
import { buildTimeline } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field to find a quiet place".split(" ");
const sum = (s: Record<string, number>) => SLICE_ORDER.reduce((a, k) => a + s[k]!, 0);

/** The budget exactly as analyseRun builds it. */
function budgetOf(r: RunInput) {
  let tl = buildTimeline(r);
  if (tl.capture === 2 && !replayRun(tl, r.words).ok) tl = buildTimeline(r, { forceV1: true });
  const base = estimatePace(tl, taintOf(tl));
  const eps = tl.capture === 2 ? episodesV2(tl, r.words) : episodesV1(tl, base.P);
  const mask = episodeMask(tl, eps);
  const th = thresholds(tl, { ...base, P: base.P! }, boundaryUnits(tl, mask));
  return { tl, th, b: computeBudget(tl, base, th, eps, mask, r.ctx?.race === true) };
}
const slicesOf = (r: RunInput) => analyseRun(r)!.slices!;

describe("the budget on simple runs", () => {
  it("a steady stream with 2× word gaps has no friction and typing = T", () => {
    const a = analyseRun(steady(WORDS))!;
    expect(a.slices).toEqual({ typing: a.T, fixing: 0, before: 0, inside: 0, breaks: 0 });
  });

  it("word gaps at 1× leave every slice ≥ 0 and typing = T", () => {
    const a = analyseRun(steady(WORDS, { gap: 100 }))!;
    expect(a.slices!.typing).toBe(a.T);
    expect(a.pace!.boundaryMs).toBeCloseTo(2 * a.pace!.P, 0);
  });

  it("a 1,000 ms pause before a word, against 200 ms fluent word gaps at P = 100, adds 800 to before", () => {
    const r = withPause(steady(WORDS, { jitter: 0 }), { beforeWord: 6, ms: 1000 });
    const a = analyseRun(r)!;
    expect(a.pace!.P).toBe(100);
    expect(a.pace!.boundaryMs).toBe(200);
    expect(a.slices!.before).toBe(800);
  });

  it("a 6 s stop mid-word is a break of 6000 − P, not a hesitation", () => {
    const s = slicesOf(withPause(steady(WORDS, { jitter: 0 }), { insideWord: [3, 0], ms: 6000 }));
    expect(s.breaks).toBe(5900);
    expect(s.inside).toBe(0);
  });

  it("a break inside a fix is still a break", () => {
    const s = slicesOf(withMistake(steady(WORDS, { jitter: 0 }), { word: 4, pos: 2, fixGapMs: 5000 }));
    expect(s.breaks).toBe(5000);
    expect(s.fixing).toBe(100);
  });

  it("a race head of 900 ms is a break; a first-key Space head of 180 ms is typing", () => {
    const race = analyseRun(raceAnchor(steady(WORDS), 900))!;
    expect(race.headMs).toBe(900);
    expect(race.slices!.breaks).toBe(900);
    expect(race.breaks).toEqual({ ms: 0, count: 0 });
    const fks = analyseRun(firstKeySpace(steady(WORDS), 180))!;
    expect(fks.headMs).toBe(180);
    expect(fks.slices!.breaks).toBe(0);
    expect(fks.slices!.typing).toBe(fks.T - fks.slices!.fixing - fks.slices!.before - fks.slices!.inside);
  });

  it("a non-race head of β or more is a break", () => {
    const base = steady(WORDS, { jitter: 0 });
    const late = { ...base, timings: base.timings.map((e) => ({ ...e, t: e.t + 3000 })), durationMs: base.durationMs + 3000,
      spaces: base.spaces!.map((s) => ({ ...s, t: s.t + 3000 })) };
    const a = analyseRun(late)!;
    expect(a.slices!.breaks).toBe(2900);
    expect(a.breaks.count).toBe(1);
  });

  it("tails under β are typing: a WORDS run ended on Space and a TIME remainder", () => {
    const words = analyseRun(endOnSpace(steady(WORDS), { tailMs: 150 }))!;
    expect(words.slices!.breaks + words.slices!.before + words.slices!.inside + words.slices!.fixing).toBe(0);
    const base = steady(WORDS, { jitter: 0 });
    const t = analyseRun(timeRun(base, base.durationMs + 700))!;
    expect(t.slices).toMatchObject({ typing: t.T, breaks: 0 });
  });

  it("a 3 s TIME tail is a break of 3000 − P", () => {
    const base = steady(WORDS, { jitter: 0 });
    expect(slicesOf(timeRun(base, base.durationMs + 3000)).breaks).toBe(2900);
  });

  it("skipped words (two Spaces, an 'other' gap) are typing below β", () => {
    const acts: Act[] = [];
    let t = 0;
    const words = WORDS.slice(0, 8);
    words.forEach((w, wi) => {
      if (wi === 3) {
        acts.push({ k: "space", t: (t += 100) });
        return;
      }
      [...w].forEach((ch, ci) => {
        if (wi > 0 && ci === 0) acts.push({ k: "space", t: (t += 100) });
        acts.push({ k: "char", t: wi === 0 && ci === 0 ? 0 : (t += 100), ch });
      });
    });
    const a = analyseRun(render({ words, acts, ctx: {}, lengthMode: "words", truth: noTruth() }))!;
    expect(a.slices!.breaks).toBe(0);
    expect(a.slices!.before).toBe(0);
  });
});

describe("reconcile, clocks and the gate", () => {
  it("a small positive residue goes to typing", () => {
    const { tl, th } = budgetOf(steady(WORDS));
    const short = { ...tl, tail: tl.tail - 10 };
    const base = estimatePace(short, taintOf(short));
    const b = computeBudget(short, base, th, [], episodeMask(short, []), false);
    expect(b.R).toBeCloseTo(10, 6);
    expect(b.slices.typing).toBe(tl.T);
    expect(b.clockOk).toBe(true);
  });

  it("a backwards clock step goes through reconcile: clockOk when small, not when large", () => {
    const base = steady(WORDS, { jitter: 0 });
    const small = budgetOf(clockStep(base, 30, -130)).b;
    expect(small.R).toBeCloseTo(-30, 0);
    expect(small.clockOk).toBe(true);
    expect(sum(small.slices)).toBe(budgetOf(base).tl.T - 130);
    const big = analyseRun(clockStep(base, 30, -3000))!;
    expect(big.quality.clockOk).toBe(false);
    expect(big.slices).toBeNull();
    expect(big.findings[0]!.kind).toBe("clock");
  });

  it("ht for classification with t for allocation keeps the sum exact", () => {
    const r = steady(WORDS, { ht: true });
    const skewed = { ...r, timings: r.timings.map((e, i) => ({ ...e, ht: e.ht! + (i % 3) * 7 + i * 0.01 })) };
    const a = analyseRun(skewed)!;
    expect(sum(a.slices!)).toBe(a.T);
  });

  it("an end-of-run fix (b = K) takes the tail into fixing", () => {
    // "the qux" then a Backspace as the timer ends: the fix finishes in marks[K].
    const acts: Act[] = [..."the qux<"].map((c, i): Act => (c === " " ? { k: "space", t: i * 100 } : c === "<" ? { k: "back", t: i * 100 } : { k: "char", t: i * 100, ch: c }));
    const mk = (T: number) => render({ words: ["the", "quick"], acts, ctx: {}, lengthMode: "time", T, truth: noTruth() });
    const a = budgetOf(mk(800)).b;
    const b = budgetOf(mk(1000)).b;
    expect(b.S.fixing - a.S.fixing).toBeCloseTo(200, 6);
  });

  it("the episode loop never reads gap 0 when the first key is the mistake", () => {
    const r = withMistake(steady(WORDS), { word: 0, pos: 0 });
    const a = analyseRun(r)!;
    expect(sum(a.slices!)).toBe(a.T);
    expect(a.mistakes.fixed).toBe(1);
  });

  it("a quantised clock folds hesitations into typing; pauses still count", () => {
    const r = quantise(withPause(withPause(steady(WORDS), { insideWord: [2, 1], ms: 900 }), { beforeWord: 5, ms: 1200 }), 100);
    const a = analyseRun(r)!;
    expect(a.quality.quantised).toBe(true);
    expect(a.slices!.inside).toBe(0);
    expect(a.slices!.before).toBeGreaterThan(0);
  });

  it("nine events give no budget", () => {
    const a = analyseRun(steady(["abcdefghi"]))!;
    expect(a.slices).toBeNull();
    expect(a.findings).toEqual([{ kind: "short", impactMs: 0 }]);
  });
});

describe("monotonicity", () => {
  it("a longer injected pause never lowers before, and an added mistake never lowers fixing", () => {
    let prev = -1;
    for (const ms of [300, 500, 800, 1200, 1900]) {
      const before = slicesOf(withPause(steady(WORDS), { beforeWord: 7, ms })).before;
      expect(before).toBeGreaterThanOrEqual(prev);
      prev = before;
    }
    let r = steady(WORDS);
    let fixing = slicesOf(r).fixing;
    for (const [word, pos] of [[2, 1], [5, 2], [9, 0], [14, 2]] as const) {
      r = withMistake(r, { word, pos, fixGapMs: 300 });
      const next = slicesOf(r).fixing;
      expect(next).toBeGreaterThanOrEqual(fixing);
      fixing = next;
    }
    expect(slicesOf(withBreak(steady(WORDS), { beforeWord: 3, ms: 4000 })).breaks).toBeGreaterThan(3500);
  });
});
