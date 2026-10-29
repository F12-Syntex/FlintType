import { describe, expect, it } from "vitest";
import { SLICE_ORDER, type RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { prepareRun } from "./prepare";
import { asV1, randomScript } from "./run-script";
import { buildTimeline } from "./timeline";

/** Invariant I1 on 2,000 seeded DSL runs (spec-10 §16.2, budget.test row). */

/** The budget analyseRun builds on (the same pipeline object). */
const budgetOf = (r: RunInput) => prepareRun(r).budget;

const SEEDS = 2000;

describe("I1: the exact budget", () => {
  it("every slice ≥ 0 and Σ = T exactly, v2 and v1, on 2,000 random runs", () => {
    let budgets = 0;
    for (let s = 0; s < SEEDS; s++) {
      const v2 = randomScript(s);
      for (const r of [v2, asV1(v2)]) {
        const a = analyseRun(r);
        expect(a).not.toBeNull();
        // Before rounding: largestRemainder clamps negatives, so check the
        // float slices and every unit too.
        const b = budgetOf(r);
        if (b) {
          let minUnit = 0;
          for (const u of b.units) for (const k of SLICE_ORDER) minUnit = Math.min(minUnit, u[k]);
          expect(Math.min(...SLICE_ORDER.map((k) => b.S[k])), `seed ${s}`).toBeGreaterThanOrEqual(-1e-9);
          expect(minUnit, `seed ${s}`).toBeGreaterThanOrEqual(-1e-9);
          expect(Math.abs(SLICE_ORDER.reduce((x, k) => x + b.S[k], 0) - a!.T)).toBeLessThan(1e-6);
        }
        if (!a!.slices) continue;
        budgets++;
        for (const k of SLICE_ORDER) expect(a!.slices[k]).toBeGreaterThanOrEqual(0);
        expect(SLICE_ORDER.reduce((x, k) => x + a!.slices![k], 0)).toBe(a!.T);
        expect(Math.round(SLICE_ORDER.reduce((x, k) => x + a!.perMinute![k], 0) * 10)).toBe(600);
      }
    }
    expect(budgets).toBeGreaterThan(SEEDS * 1.5);
  }, 120_000);

  it("Breaks holds exactly the in-run break excess plus the race head", () => {
    let checked = 0;
    let withBreaks = 0;
    for (let s = 0; s < SEEDS; s++) {
      const b = budgetOf(randomScript(s));
      if (!b || !b.clockOk || b.tookFromBreaks) continue;
      checked++;
      if (b.breaksMs + b.raceHead > 0) withBreaks++;
      expect(Math.abs(b.slices.breaks - (b.breaksMs + b.raceHead))).toBeLessThanOrEqual(1);
      expect(b.S.breaks).toBeCloseTo(b.breaksMs + b.raceHead, 6);
    }
    expect(checked).toBeGreaterThan(SEEDS * 0.8);
    expect(withBreaks).toBeGreaterThan(100);
  }, 120_000);

  it("the random runs cover every shape I1 names", () => {
    const seen = { race: 0, firstKeySpace: 0, time: 0, endOnSpace: 0, stop: 0, quantised: 0, step: 0, chunks: 0, extras: 0, cross: 0 };
    for (let s = 0; s < SEEDS; s++) {
      const r = randomScript(s);
      const tl = buildTimeline(r);
      if (r.ctx?.race) seen.race++;
      if (tl.firstKeySpace) seen.firstKeySpace++;
      if (r.lengthMode === "time") seen.time++;
      if (r.lengthMode !== "time" && tl.marks[tl.K]!.some((m) => m.kind === "space")) seen.endOnSpace++;
      if (r.ctx?.stopOnError) seen.stop++;
      if (tl.quantised) seen.quantised++;
      for (let k = 1; k < tl.K; k++) if (tl.dt[k]! < 0) { seen.step++; break; }
      for (let k = 1; k < tl.K; k++) if (tl.dt[k]! < 3 && tl.dt[k]! >= 0) { seen.chunks++; break; }
      if (r.timings.some((e) => e.expected === "")) seen.extras++;
      if (r.edits?.some((e) => e.cross)) seen.cross++;
    }
    for (const [k, n] of Object.entries(seen)) expect(n, k).toBeGreaterThan(20);
  }, 120_000);
});
