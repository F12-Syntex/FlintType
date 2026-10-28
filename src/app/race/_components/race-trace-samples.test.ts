import { describe, expect, it } from "vitest";
import {
  appendTraceSample,
  MAX_TRACE_SAMPLES,
  type TraceRacer,
} from "./race-trace-samples";

const racer = (over: Partial<TraceRacer> = {}): TraceRacer => ({
  id: "you",
  wpm: 60,
  finishedAt: null,
  disconnected: false,
  ...over,
});

describe("appendTraceSample", () => {
  it("adds one sample per second with every racing racer's wpm", () => {
    const a = appendTraceSample([], 1, [racer(), racer({ id: "mireille", wpm: 72.4 })]);
    expect(a).toEqual([{ t: 1, wpmByRacer: { you: 60, mireille: 72 } }]);
  });

  it("skips second 0 and non-finite clocks", () => {
    const empty: never[] = [];
    expect(appendTraceSample(empty, 0, [racer()])).toBe(empty);
    expect(appendTraceSample(empty, Number.NaN, [racer()])).toBe(empty);
  });

  it("ignores a second that isn't later than the last sample", () => {
    const one = appendTraceSample([], 3, [racer()]);
    expect(appendTraceSample(one, 3, [racer({ wpm: 99 })])).toBe(one);
    expect(appendTraceSample(one, 2, [racer({ wpm: 99 })])).toBe(one);
  });

  it("samples a finisher once after they cross, then drops them", () => {
    const s1 = appendTraceSample([], 11, [racer(), racer({ id: "b" })]);
    // `you` crossed during second 12 — included in the next sample.
    const s2 = appendTraceSample(s1, 12, [racer({ finishedAt: 12, wpm: 64 }), racer({ id: "b" })]);
    expect(s2[1]).toEqual({ t: 12, wpmByRacer: { you: 64, b: 60 } });
    // Next second: `you` is done, only `b` is still racing.
    const s3 = appendTraceSample(s2, 13, [racer({ finishedAt: 12, wpm: 64 }), racer({ id: "b" })]);
    expect(s3[2]).toEqual({ t: 13, wpmByRacer: { b: 60 } });
  });

  it("never samples disconnected racers and adds nothing when nobody is left", () => {
    const s1 = appendTraceSample([], 5, [racer({ finishedAt: 2 })]);
    expect(s1).toEqual([{ t: 5, wpmByRacer: { you: 60 } }]);
    const s2 = appendTraceSample(s1, 6, [racer({ finishedAt: 2 }), racer({ id: "x", disconnected: true })]);
    expect(s2).toBe(s1);
  });

  it("clamps negative wpm to 0", () => {
    expect(appendTraceSample([], 1, [racer({ wpm: -4 })])[0]!.wpmByRacer.you).toBe(0);
  });

  it("stops growing at the sample cap", () => {
    const full = Array.from({ length: MAX_TRACE_SAMPLES }, (_, i) => ({
      t: i + 1,
      wpmByRacer: { you: 50 },
    }));
    expect(appendTraceSample(full, MAX_TRACE_SAMPLES + 1, [racer()])).toBe(full);
  });
});
