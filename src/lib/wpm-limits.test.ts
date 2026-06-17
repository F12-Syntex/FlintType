import { describe, expect, it } from "vitest";
import {
  MAX_PLAUSIBLE_WPM,
  MIN_COMPLETED_RUN_MS,
  WPM_VOLUME_TOLERANCE,
  keystrokeRateWpm,
  keystrokeSpanMs,
  maxCredibleWpm,
  submittedCharVolume,
  timingsConsistent,
} from "./wpm-limits";

describe("wpm-limits", () => {
  it("mirrors the race authority's 500 gross-WPM cap", () => {
    expect(MAX_PLAUSIBLE_WPM).toBe(500);
  });

  it("submittedCharVolume counts ONLY the keystroke stream, not passage chars", () => {
    // 20 keystroke entries → volume 20.
    expect(submittedCharVolume(new Array(20).fill(0))).toBe(20);
    // Empty stream → volume 0, regardless of any (client-controlled,
    // unverified) passage the caller might claim. This is the #38
    // bypass closure: padding `words` can no longer inflate the volume.
    expect(submittedCharVolume([])).toBe(0);
  });

  it("timingsConsistent accepts a monotonic stream within elapsed", () => {
    const stream = [{ t: 0 }, { t: 120 }, { t: 240 }, { t: 360 }];
    expect(timingsConsistent(stream, 1_000)).toBe(true);
  });

  it("timingsConsistent treats an empty stream as vacuously consistent", () => {
    // The volume ceiling (0) is what rejects an empty stream, not this.
    expect(timingsConsistent([], 1_000)).toBe(true);
  });

  it("timingsConsistent rejects a keystroke timed beyond the run's elapsed", () => {
    // t = 9000 on a 1s run — the forger fabricated `t` without matching
    // the claimed elapsed.
    expect(timingsConsistent([{ t: 0 }, { t: 9_000 }], 1_000)).toBe(false);
  });

  it("timingsConsistent rejects a grossly non-monotonic stream", () => {
    expect(timingsConsistent([{ t: 5_000 }, { t: 100 }], 10_000)).toBe(false);
  });

  it("timingsConsistent rejects non-finite or negative t", () => {
    expect(timingsConsistent([{ t: -1 }], 1_000)).toBe(false);
    expect(timingsConsistent([{ t: Number.NaN }], 1_000)).toBe(false);
  });

  it("maxCredibleWpm scales volume over elapsed time with tolerance", () => {
    // 500 chars in 60s = 100 wpm × tolerance.
    expect(maxCredibleWpm(500, 60_000)).toBeCloseTo(100 * WPM_VOLUME_TOLERANCE);
  });

  it("maxCredibleWpm is 0 for zero or negative elapsed time", () => {
    expect(maxCredibleWpm(500, 0)).toBe(0);
    expect(maxCredibleWpm(500, -10)).toBe(0);
  });

  it("a legitimate 300-wpm run clears its own payload's ceiling", () => {
    // 300 net wpm over 30s = 750 correct chars; keystroke stream of
    // the same size must yield a ceiling comfortably above the claim.
    expect(maxCredibleWpm(750, 30_000)).toBeGreaterThan(300);
  });

  it("keystrokeSpanMs returns the latest t (0 for empty)", () => {
    expect(keystrokeSpanMs([])).toBe(0);
    expect(keystrokeSpanMs([{ t: 0 }, { t: 250 }, { t: 120 }])).toBe(250);
  });

  it("keystrokeRateWpm is the volume's raw-wpm over its own span", () => {
    // 1000 keystrokes spanning 60s = 200 raw wpm.
    expect(keystrokeRateWpm(1000, 60_000)).toBeCloseTo(200);
  });

  it("keystrokeRateWpm is Infinity when volume is packed into a zero span", () => {
    // The all-t=0 padding bypass: any volume claimed to happen in an
    // instant is physically impossible.
    expect(keystrokeRateWpm(1664, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(keystrokeRateWpm(0, 0)).toBe(0);
  });

  it("a legitimate fast run's keystroke density stays under the cap", () => {
    // 200 net wpm over 30s ≈ 417 printable keystrokes spanning the full
    // 30s → ~167 raw wpm, comfortably under the 500 human cap.
    expect(keystrokeRateWpm(417, 30_000)).toBeLessThan(MAX_PLAUSIBLE_WPM);
  });

  it("the time-compression bypass exceeds the keystroke-rate cap", () => {
    // Finding 1: claim 499 wpm over a 1 ms elapsed with one keystroke.
    // The stream's span is ≤ 1 ms, so its intrinsic rate blows past the
    // human cap and is rejected.
    expect(keystrokeRateWpm(14, 1)).toBeGreaterThan(MAX_PLAUSIBLE_WPM);
  });

  it("MIN_COMPLETED_RUN_MS is a sub-second floor", () => {
    expect(MIN_COMPLETED_RUN_MS).toBe(500);
  });
});
