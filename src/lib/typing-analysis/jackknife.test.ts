import { describe, expect, it } from "vitest";
import { FRICTION_ORDER, SLICE_ORDER, type RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { boundaryUnits, computeBudget, episodeMask } from "./budget";
import { episodesV2 } from "./episodes";
import { jackknifeSE } from "./jackknife";
import { estimatePace, taintOf, thresholds } from "./pace";
import { steady, withMistake, withPause } from "./run-script";
import { buildTimeline } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field".split(" ");

function budgetOf(r: RunInput) {
  const tl = buildTimeline(r);
  const base = estimatePace(tl, taintOf(tl));
  const eps = episodesV2(tl, r.words);
  const mask = episodeMask(tl, eps);
  const th = thresholds(tl, { ...base, P: base.P! }, boundaryUnits(tl, mask));
  return { tl, b: computeBudget(tl, base, th, eps, mask, false) };
}

describe("jackknifeSE", () => {
  it("is 0 when no word has friction, and grows when friction sits in one word", () => {
    const clean = budgetOf(steady(WORDS));
    expect(jackknifeSE(clean.b, clean.tl.T)).toEqual({ fixing: 0, before: 0, inside: 0 });
    // About the same pause time, spread over six words or in one.
    const spread = [1, 3, 5, 7, 9, 11].reduce((r, w) => withPause(r, { beforeWord: w, ms: 500 }), steady(WORDS));
    const one = withPause(steady(WORDS), { beforeWord: 5, ms: 1900 });
    const a = budgetOf(spread);
    const b = budgetOf(one);
    expect(jackknifeSE(a.b, a.tl.T)!.before).toBeLessThan(jackknifeSE(b.b, b.tl.T)!.before / 2);
  });

  it("matches a brute-force leave-one-word-out", () => {
    let r = withPause(withPause(steady(WORDS), { beforeWord: 3, ms: 900 }), { insideWord: [7, 1], ms: 700 });
    r = withMistake(r, { word: 10, pos: 1, fixGapMs: 400 });
    const { tl, b } = budgetOf(r);
    const se = jackknifeSE(b, tl.T)!;
    const words = [...new Set(b.units.map((u) => u.word))];
    const total = (w: number) => b.units.filter((u) => u.word === w).reduce((a, u) => a + SLICE_ORDER.reduce((s, k) => s + u[k], 0), 0);
    const live = words.filter((w) => total(w) > 0);
    for (const x of FRICTION_ORDER) {
      const theta = live.map((w) => {
        const rest = b.units.filter((u) => u.word !== w).reduce((a, u) => a + u[x], 0);
        return (60 * rest) / (tl.T - total(w));
      });
      const m = theta.reduce((a, v) => a + v, 0) / theta.length;
      const n = theta.length;
      const want = Math.sqrt(((n - 1) / n) * theta.reduce((a, v) => a + (v - m) ** 2, 0));
      expect(se[x]).toBeCloseTo(want, 3);
    }
    expect(se.before).toBeGreaterThan(0);
  });

  it("is null under 10 words, and the analysis carries it", () => {
    const short = budgetOf(steady(WORDS.slice(0, 9)));
    expect(jackknifeSE(short.b, short.tl.T)).toBeNull();
    expect(analyseRun(steady(WORDS.slice(0, 9)))!.se).toBeNull();
    expect(analyseRun(steady(WORDS))!.se).not.toBeNull();
  });
});
