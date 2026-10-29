import { describe, expect, it } from "vitest";
import { secShort } from "@/lib/format-figure";
import { SLICE_ORDER, type SliceSet } from "@/types/typing-analysis";
import { SLICE_FILL, budgetSegments, sliceFill } from "./budget-segments";

const set = (typing: number, fixing: number, before: number, inside: number, breaks: number): SliceSet => ({
  typing,
  fixing,
  before,
  inside,
  breaks,
});
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 10) / 10;

describe("budgetSegments", () => {
  it("gives shares of a minute in slice order", () => {
    expect(budgetSegments(set(30, 15, 9, 6, 0), 60)).toEqual([50, 25, 15, 10, 0]);
  });

  it("sums to exactly 100 at one decimal", () => {
    const pct = budgetSegments(set(44.1, 9.3, 3.3, 3.3, 0), 60);
    expect(sum(pct)).toBe(100);
    for (const p of pct) expect(Math.round(p * 10)).toBe(p * 10);
  });

  it("lifts a sliver to 2% and shrinks the rest in proportion", () => {
    const pct = budgetSegments(set(59.4, 0.3, 0.3, 0, 0), 60);
    expect(pct[1]).toBe(2);
    expect(pct[2]).toBe(2);
    expect(pct[3]).toBe(0);
    expect(pct[0]).toBe(96);
  });

  it("repeats the floor when shrinking pushes another slice under it", () => {
    const pct = budgetSegments(set(1000, 21, 0.1, 0.1, 0.1), 1021.3);
    for (const p of pct) expect(p).toBeGreaterThanOrEqual(2);
    expect(sum(pct)).toBe(100);
  });

  it("draws no segment for a slice the table prints as 0 s", () => {
    expect(budgetSegments(set(21.956, 0.004, 0.04, 0, 0), 22)).toEqual([100, 0, 0, 0, 0]);
    // 0.05 s prints as "0.1 s", so it is shown and lifted to the floor.
    expect(budgetSegments(set(21.95, 0.05, 0, 0, 0), 22)).toEqual([98, 2, 0, 0, 0]);
    expect(budgetSegments(set(0.01, 0.02, 0, 0, 0), 0.03)).toEqual([0, 0, 0, 0, 0]);
  });

  it("keeps zero slices at zero", () => {
    expect(budgetSegments(set(60, 0, 0, 0, 0), 60)).toEqual([100, 0, 0, 0, 0]);
  });

  it("fills the bar from the slices when they miss the total by rounding", () => {
    const pct = budgetSegments(set(12.4, 2.1, 0.8, 0.5, 0), 15.9);
    expect(sum(pct)).toBe(100);
  });

  it("returns zeros when nothing was timed", () => {
    expect(budgetSegments(set(0, 0, 0, 0, 0), 60)).toEqual([0, 0, 0, 0, 0]);
    expect(budgetSegments(set(0, 0, 0, 0, 0), 0)).toEqual([0, 0, 0, 0, 0]);
  });

  it("reads negative and non-finite values as zero", () => {
    expect(budgetSegments(set(30, -5, Number.NaN, Infinity, 30), 60)).toEqual([50, 0, 0, 0, 50]);
  });

  it("holds the floor and the exact sum over random sets", () => {
    let seed = 11;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 1000; i++) {
      const vals = Array.from({ length: 5 }, () => (rand() < 0.3 ? 0 : rand() ** 3 * 60));
      const pct = budgetSegments(set(vals[0], vals[1], vals[2], vals[3], vals[4]), 60);
      const visible = vals.map((v) => v > 0 && secShort(v * 1000) !== "0 s");
      if (!visible.some(Boolean)) {
        expect(pct).toEqual([0, 0, 0, 0, 0]);
        continue;
      }
      expect(sum(pct)).toBe(100);
      pct.forEach((p, k) => {
        if (visible[k]) expect(p).toBeGreaterThanOrEqual(2);
        else expect(p).toBe(0);
      });
    }
  });
});

describe("sliceFill", () => {
  it("uses a darkest-first ink ramp in slice order", () => {
    const alphas = SLICE_ORDER.map((k) => Number(SLICE_FILL[k].split("/")[1]));
    expect(alphas).toEqual([85, 72, 60, 47, 35]);
    for (const k of SLICE_ORDER) expect(SLICE_FILL[k]).toMatch(/^bg-foreground\//);
  });

  it("paints only the focus slice orange", () => {
    expect(sliceFill("before", "before")).toBe("bg-primary");
    expect(sliceFill("typing", "before")).toBe("bg-foreground/85");
    expect(sliceFill("fixing", null)).toBe("bg-foreground/72");
    expect(sliceFill("inside")).toBe("bg-foreground/47");
  });
});
