import { describe, expect, it } from "vitest";
import { incompleteBeta, normalTwoSidedP, tTwoSidedP, welch, zForTwoSidedP } from "./t-test";

describe("welch", () => {
  it("matches a hand-computed Welch t and Satterthwaite df", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [3, 5, 7, 9, 11, 13];
    // var_a = 2.5, var_b = 14; t = (8 − 3) / √(0.5 + 14/6)
    const r = welch(a, b);
    expect(r.diff).toBe(5);
    expect(r.t).toBeCloseTo(5 / Math.sqrt(0.5 + 14 / 6), 10);
    const qa = 0.5;
    const qb = 14 / 6;
    expect(r.df).toBeCloseTo((qa + qb) ** 2 / (qa ** 2 / 4 + qb ** 2 / 5), 10);
  });
  it("is 0 without two values a side or without spread", () => {
    expect(welch([1], [2, 3]).t).toBe(0);
    expect(welch([2, 2], [2, 2]).t).toBe(0);
  });
});

describe("distributions", () => {
  it("t tail probabilities match tables", () => {
    expect(tTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3);
    expect(tTwoSidedP(3.169, 10)).toBeCloseTo(0.01, 3);
    expect(tTwoSidedP(-2.776, 4)).toBeCloseTo(0.05, 3);
    expect(tTwoSidedP(0, 7)).toBeCloseTo(1, 9);
    expect(tTwoSidedP(1.96, 1e7)).toBeCloseTo(0.05, 4);
    expect(tTwoSidedP(3, 0)).toBe(1);
  });
  it("the incomplete beta is a CDF with the right symmetry", () => {
    expect(incompleteBeta(0, 2, 3)).toBe(0);
    expect(incompleteBeta(1, 2, 3)).toBe(1);
    expect(incompleteBeta(0.3, 2, 5) + incompleteBeta(0.7, 5, 2)).toBeCloseTo(1, 7);
    expect(incompleteBeta(0.5, 1, 1)).toBeCloseTo(0.5, 7);
  });
  it("normal tails and their inverse agree", () => {
    expect(normalTwoSidedP(1.959964)).toBeCloseTo(0.05, 6);
    expect(normalTwoSidedP(-2.575829)).toBeCloseTo(0.01, 6);
    expect(zForTwoSidedP(0.05)).toBeCloseTo(1.959964, 5);
    for (const z of [0.1, 1, 2.5, 4, 7]) expect(zForTwoSidedP(normalTwoSidedP(z))).toBeCloseTo(z, 4);
  });
});
