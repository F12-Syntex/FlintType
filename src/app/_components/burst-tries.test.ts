import { describe, expect, it } from "vitest";
import type { BurstTry } from "./burst-stats";
import { appendBurstTry, burstTriesFor, NO_TRIES } from "./burst-tries";

function tryAt(endT: number): BurstTry {
  return { endT, ms: 300, keys: 4, chars: 4, endedBySpace: true, cleared: true };
}

describe("burst try store", () => {
  it("is empty for a passage with no tries", () => {
    expect(burstTriesFor(["a", "b"])).toBe(NO_TRIES);
  });

  it("appends in order and returns the passage's tries so far", () => {
    const words = ["one", "two"];
    const first = appendBurstTry(words, tryAt(100));
    expect(first.map((t) => t.endT)).toEqual([100]);
    const second = appendBurstTry(words, tryAt(250));
    expect(second.map((t) => t.endT)).toEqual([100, 250]);
    expect(burstTriesFor(words)).toBe(second);
    // Earlier snapshots are never mutated (React state holds them).
    expect(first.map((t) => t.endT)).toEqual([100]);
  });

  it("keys on the words array itself, so a new passage starts empty", () => {
    const run1 = ["same", "text"];
    const run2 = ["same", "text"]; // a restart loads a new array
    appendBurstTry(run1, tryAt(10));
    expect(burstTriesFor(run2)).toEqual([]);
    appendBurstTry(run2, tryAt(20));
    expect(burstTriesFor(run1).map((t) => t.endT)).toEqual([10]);
    expect(burstTriesFor(run2).map((t) => t.endT)).toEqual([20]);
  });
});
