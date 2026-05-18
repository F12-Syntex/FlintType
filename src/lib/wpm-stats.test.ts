import { describe, expect, it } from "vitest";
import {
  avgWpm,
  consistencyScore,
  peakWpm,
  stallWpm,
  type WpmSample,
} from "./wpm-stats";

const SAMPLES: WpmSample[] = [
  { t: 1000, wpm: 60, raw: 64 },
  { t: 2000, wpm: 80, raw: 82 },
  { t: 3000, wpm: 100, raw: 102 },
  { t: 4000, wpm: 90, raw: 94 },
  { t: 5000, wpm: 70, raw: 72 },
];

describe("wpm-stats", () => {
  it("peakWpm returns the maximum sample", () => {
    expect(peakWpm(SAMPLES)).toBe(100);
  });

  it("peakWpm returns 0 for empty input", () => {
    expect(peakWpm([])).toBe(0);
  });

  it("avgWpm averages the samples", () => {
    expect(avgWpm(SAMPLES)).toBe(80);
  });

  it("stallWpm returns the minimum sample", () => {
    expect(stallWpm(SAMPLES)).toBe(60);
  });

  it("stallWpm returns 0 for empty input", () => {
    expect(stallWpm([])).toBe(0);
  });

  it("consistencyScore returns 100 for a flat series", () => {
    const flat: WpmSample[] = Array.from({ length: 5 }, (_, i) => ({
      t: (i + 1) * 1000,
      wpm: 80,
      raw: 80,
    }));
    expect(consistencyScore(flat)).toBe(100);
  });

  it("consistencyScore is lower for noisier series", () => {
    const noisy: WpmSample[] = [
      { t: 1000, wpm: 30, raw: 30 },
      { t: 2000, wpm: 120, raw: 120 },
      { t: 3000, wpm: 30, raw: 30 },
      { t: 4000, wpm: 120, raw: 120 },
    ];
    expect(consistencyScore(noisy)).toBeLessThan(50);
  });

  it("consistencyScore handles fewer than 2 samples", () => {
    expect(consistencyScore([])).toBe(100);
    expect(consistencyScore([SAMPLES[0]!])).toBe(100);
  });
});
