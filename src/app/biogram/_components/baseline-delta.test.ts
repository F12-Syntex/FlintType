import { describe, expect, it } from "vitest";
import { baselineDeltaMs, shownMs } from "./baseline-delta";

describe("shownMs", () => {
  it("matches the toFixed(0) figure the table prints", () => {
    for (const ms of [0.4, 71.47, 109.538, 119.5, 120.506, 151.559, 999.5]) {
      expect(String(shownMs(ms))).toBe(ms.toFixed(0));
    }
  });
});

describe("baselineDeltaMs", () => {
  // The live rows that didn't add up when the raw gap was rounded:
  // the usual letter-pair pace is 71.47, shown as "71 ms".
  const usual = 71.47;

  it("reconciles with the shown mean and the shown usual pace", () => {
    expect(baselineDeltaMs(151.559, usual)).toBe(81); // "152 ms", not 80
    expect(baselineDeltaMs(119.911, usual)).toBe(49); // "120 ms", not 48
    expect(baselineDeltaMs(120.506, usual)).toBe(50); // "121 ms", not 49
    expect(baselineDeltaMs(109.538, usual)).toBe(39); // "110 ms", not 38
  });

  it("is negative when the pattern is faster than usual", () => {
    expect(baselineDeltaMs(60.2, usual)).toBe(-11);
  });

  it("is 0 when both times print alike, even if the raw gap isn't", () => {
    expect(baselineDeltaMs(70.6, usual)).toBe(0);
    expect(baselineDeltaMs(71.49, usual)).toBe(0);
  });

  it("is null without a usual pace", () => {
    expect(baselineDeltaMs(120, 0)).toBeNull();
    expect(baselineDeltaMs(120, -5)).toBeNull();
    expect(baselineDeltaMs(120, Number.NaN)).toBeNull();
    expect(baselineDeltaMs(120, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("is null when the mean isn't a real number", () => {
    expect(baselineDeltaMs(Number.NaN, usual)).toBeNull();
  });
});
