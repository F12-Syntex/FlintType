// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import {
  BURST_THRESHOLD_FALLBACK,
  getAverageWpm,
  recordWpmSample,
  resolveBurstThreshold,
} from "./avg-wpm-cache";

describe("avg-wpm-cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the fallback when no samples have been recorded", () => {
    expect(getAverageWpm()).toBe(BURST_THRESHOLD_FALLBACK);
  });

  it("averages recorded samples", () => {
    recordWpmSample(40);
    recordWpmSample(60);
    expect(getAverageWpm()).toBe(50);
  });

  it("ignores garbage / negative / non-finite samples", () => {
    recordWpmSample(80);
    recordWpmSample(-10);
    recordWpmSample(Number.NaN);
    recordWpmSample(0);
    expect(getAverageWpm()).toBe(80);
  });

  it("caps the rolling window so old samples eventually drop out", () => {
    for (let i = 0; i < 30; i++) recordWpmSample(40);
    // Now 30 forties; cap at 20 keeps 20 of them, mean=40.
    expect(getAverageWpm()).toBe(40);
    // Push 20 eighties — should fully replace the forties.
    for (let i = 0; i < 20; i++) recordWpmSample(80);
    expect(getAverageWpm()).toBe(80);
  });

  it("resolveBurstThreshold honours an explicit pref over the cache", () => {
    recordWpmSample(40);
    recordWpmSample(40);
    expect(resolveBurstThreshold(75)).toBe(75);
    expect(resolveBurstThreshold(0)).toBe(40);
  });
});
