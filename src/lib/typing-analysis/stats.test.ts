import { describe, expect, it } from "vitest";
import { seeded } from "./run-script-core";
import {
  addToCell, binomCdf, cellMean, cellOf, cellVar, clamp, largestRemainder, mad, median, medianRankCI, mergeCells,
  quantile, round, senCI, signTestP, theilSen, twoPropZ, welchZ,
} from "./stats";

describe("order statistics", () => {
  it("median of odd and even sets, NaN on empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });

  it("type-7 quantiles match R's defaults", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(quantile(x, 0.4)).toBeCloseTo(4.6, 10);
    expect(quantile(x, 0.1)).toBeCloseTo(1.9, 10);
    expect(quantile([3, 1, 4, 1, 5, 9, 2, 6], 0.25)).toBeCloseTo(1.75, 10);
    expect(quantile([3, 1, 4, 1, 5, 9, 2, 6], 0.9)).toBeCloseTo(6.9, 10);
    expect(quantile([7], 0.3)).toBe(7);
  });

  it("raw MAD", () => {
    expect(mad([1, 2, 3, 4, 100])).toBe(1);
    expect(mad([])).toBeNaN();
  });
});

describe("log cells", () => {
  it("collect ln x over positive values only", () => {
    const c = cellOf([1, Math.E, -3, 0, NaN]);
    expect(c[0]).toBe(2);
    expect(c[1]).toBeCloseTo(1, 12);
    expect(cellMean(c)).toBeCloseTo(0.5, 12);
    expect(cellVar(c)).toBeCloseTo(0.5, 12);
    expect(addToCell([0, 0, 0], 0)).toEqual([0, 0, 0]);
    expect(mergeCells([[1, 2, 3], [4, 5, 6]])).toEqual([5, 7, 9]);
  });

  it("welchZ is 0 for identical cells and signed second minus first", () => {
    const a = cellOf([100, 110, 90, 105, 95]);
    expect(welchZ(a, a)).toBe(0);
    expect(welchZ(a, cellOf([200, 210, 190, 205, 195]))).toBeGreaterThan(5);
    expect(welchZ([1, 0, 0], a)).toBe(0);
  });

  it("twoPropZ is positive when the second rate is higher", () => {
    expect(twoPropZ(10, 100, 30, 100)).toBeCloseTo(3.5355, 3);
    expect(twoPropZ(30, 100, 10, 100)).toBeCloseTo(-3.5355, 3);
    expect(twoPropZ(0, 0, 1, 2)).toBe(0);
  });
});

describe("binomial tests", () => {
  it("exact cdf, sign test and median rank interval", () => {
    expect(binomCdf(3, 10, 0.5)).toBeCloseTo(176 / 1024, 12);
    expect(binomCdf(-1, 10, 0.5)).toBe(0);
    expect(binomCdf(10, 10, 0.5)).toBe(1);
    expect(binomCdf(500, 1000, 0.5)).toBeCloseTo(0.5126, 3);
    expect(signTestP(8, 8)).toBeCloseTo(0.0039, 4);
    expect(signTestP(0, 8)).toBe(1);
    expect(medianRankCI(10, 0.2)).toEqual([3, 8]);
    expect(medianRankCI(5, 0.2)).toEqual([1, 5]);
  });
});

describe("Theil–Sen", () => {
  it("recovers slope 2 and its interval covers the truth in ≥ 85% of 200 seeds", () => {
    let covered = 0;
    for (let s = 0; s < 200; s++) {
      const rng = seeded(s);
      const x = Array.from({ length: 12 }, (_, i) => i);
      const y = x.map((v) => 2 * v + (rng() + rng() + rng() - 1.5) * 2);
      const { slope, slopes } = theilSen(x, y);
      if (s === 0) expect(slope).toBeCloseTo(2, 0);
      const [lo, hi] = senCI(slopes, x.length, 1.645);
      if (lo <= 2 && 2 <= hi) covered++;
    }
    expect(covered / 200).toBeGreaterThanOrEqual(0.85);
  });
});

describe("largestRemainder", () => {
  it("sums exactly and moves each value by at most one unit", () => {
    const rng = seeded(7);
    for (let s = 0; s < 300; s++) {
      const raw = Array.from({ length: 5 }, () => rng() * 1000);
      const total = raw.reduce((a, b) => a + b, 0);
      const ints = largestRemainder(raw, Math.round(total), 0);
      expect(ints.reduce((a, b) => a + b, 0)).toBe(Math.round(total));
      ints.forEach((v, i) => expect(Math.abs(v - raw[i]!)).toBeLessThanOrEqual(1));
      const per = largestRemainder(raw.map((v) => (v * 60) / total), 60, 1);
      expect(Math.round(per.reduce((a, b) => a + b, 0) * 10)).toBe(600);
      per.forEach((v, i) => expect(Math.abs(v - (raw[i]! * 60) / total)).toBeLessThanOrEqual(0.1 + 1e-9));
    }
  });

  it("gives ties to the lower index and handles float overshoot", () => {
    expect(largestRemainder([0.5, 0.5], 1)).toEqual([1, 0]);
    expect(largestRemainder([1.0000000001, 1], 2)).toEqual([1, 1]);
    expect(largestRemainder([2.4, 3.4, 4.4], 9)).toEqual([2, 3, 4]);
  });
});

it("clamp and round", () => {
  expect(clamp(5, 0, 3)).toBe(3);
  expect(round(1.25, 1)).toBe(1.3);
  expect(round(-1.25, 1)).toBe(-1.3);
});
