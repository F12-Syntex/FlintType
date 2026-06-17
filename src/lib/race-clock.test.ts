import { describe, expect, it } from "vitest";
import {
  countdownDigit,
  elapsedSeconds,
  mergeOffset,
  offsetSample,
  serverNow,
} from "./race-clock";

describe("offsetSample", () => {
  it("is server minus local", () => {
    expect(offsetSample(10_000, 9_000)).toBe(1_000);
    expect(offsetSample(9_000, 10_000)).toBe(-1_000);
  });
});

describe("mergeOffset", () => {
  it("adopts the first sample", () => {
    expect(mergeOffset(null, 250)).toBe(250);
  });

  it("keeps the max of close samples (lower latency wins)", () => {
    expect(mergeOffset(250, 400)).toBe(400);
    expect(mergeOffset(400, 250)).toBe(400);
  });

  it("resets on a clock jump beyond the threshold", () => {
    expect(mergeOffset(0, 60_000)).toBe(60_000);
    expect(mergeOffset(60_000, 0)).toBe(0);
  });
});

describe("serverNow", () => {
  it("adds the offset to the local clock", () => {
    expect(serverNow(500, 1_000)).toBe(1_500);
    expect(serverNow(-500, 1_000)).toBe(500);
  });

  it("treats a missing offset as zero", () => {
    expect(serverNow(null, 1_000)).toBe(1_000);
  });
});

describe("countdownDigit", () => {
  const t0 = 100_000;

  it("returns null with no anchor", () => {
    expect(countdownDigit(null, t0)).toBeNull();
  });

  it("walks 3 → 2 → 1 → 0 on exact second boundaries", () => {
    expect(countdownDigit(t0, t0)).toBe(3);
    expect(countdownDigit(t0, t0 + 999)).toBe(3);
    expect(countdownDigit(t0, t0 + 1_000)).toBe(2);
    expect(countdownDigit(t0, t0 + 2_000)).toBe(1);
    expect(countdownDigit(t0, t0 + 2_999)).toBe(1);
    expect(countdownDigit(t0, t0 + 3_000)).toBe(0);
  });

  it("clamps at 0 past the end", () => {
    expect(countdownDigit(t0, t0 + 10_000)).toBe(0);
  });

  it("clamps to the duration digit before the anchor", () => {
    // serverNow slightly behind the anchor (offset estimate still
    // catching up) must never paint a digit above 3.
    expect(countdownDigit(t0, t0 - 200)).toBe(3);
    expect(countdownDigit(t0, t0 - 10_000)).toBe(3);
  });
});

describe("elapsedSeconds", () => {
  it("returns 0 with no start or before the gun", () => {
    expect(elapsedSeconds(null, 5_000)).toBe(0);
    expect(elapsedSeconds(5_000, 4_000)).toBe(0);
  });

  it("floors whole seconds since the gun", () => {
    expect(elapsedSeconds(5_000, 5_999)).toBe(0);
    expect(elapsedSeconds(5_000, 6_000)).toBe(1);
    expect(elapsedSeconds(5_000, 17_350)).toBe(12);
  });
});

describe("end-to-end skew immunity", () => {
  it("two clients with skewed device clocks derive the same digit", () => {
    const serverCountdownStart = 1_000_000;
    // Client A's clock is 30s fast; client B's is 12s slow.
    const skewA = 30_000;
    const skewB = -12_000;
    // Both receive a snapshot stamped serverNowMs=1_000_000 at the
    // same true instant.
    const offsetA = mergeOffset(null, offsetSample(1_000_000, 1_000_000 + skewA));
    const offsetB = mergeOffset(null, offsetSample(1_000_000, 1_000_000 + skewB));
    // 1.5 true seconds later:
    const localA = 1_001_500 + skewA;
    const localB = 1_001_500 + skewB;
    const digitA = countdownDigit(serverCountdownStart, serverNow(offsetA, localA));
    const digitB = countdownDigit(serverCountdownStart, serverNow(offsetB, localB));
    expect(digitA).toBe(2);
    expect(digitB).toBe(2);
  });
});
