import { describe, expect, it } from "vitest";
import {
  appendTraceSample,
  closeTraceSamples,
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
    expect(s2[1]).toEqual({ t: 12, wpmByRacer: { you: 64, b: 60 }, finished: ["you"] });
    // Next second: `you` is done, only `b` is still racing.
    const s3 = appendTraceSample(s2, 13, [racer({ finishedAt: 12, wpm: 64 }), racer({ id: "b" })]);
    expect(s3[2]).toEqual({ t: 13, wpmByRacer: { b: 60 } });
  });

  it("keeps the final speed of a racer who crossed after that second's sample", () => {
    // Sample 11 is taken as second 11 starts, while `you` is still
    // typing. They cross at 11.7s: `finishedAt` floors to 11.
    const s1 = appendTraceSample([], 11, [racer({ wpm: 123 })]);
    const s2 = appendTraceSample(s1, 12, [racer({ finishedAt: 11, wpm: 130 })]);
    expect(s2[1]).toEqual({ t: 12, wpmByRacer: { you: 130 }, finished: ["you"] });
  });

  it("keeps the final speed when the finish shows up a second late", () => {
    // Crossed at 11.9s, but the snapshot saying so lands after sample 12.
    let s = appendTraceSample([], 11, [racer({ wpm: 120 })]);
    s = appendTraceSample(s, 12, [racer({ wpm: 124 })]);
    s = appendTraceSample(s, 13, [racer({ finishedAt: 11, wpm: 128 }), racer({ id: "b" })]);
    expect(s[2]).toEqual({ t: 13, wpmByRacer: { you: 128, b: 60 }, finished: ["you"] });
    s = appendTraceSample(s, 14, [racer({ finishedAt: 11, wpm: 128 }), racer({ id: "b" })]);
    expect(s[3]).toEqual({ t: 14, wpmByRacer: { b: 60 } });
  });

  it("never samples disconnected racers and adds nothing when nobody is left", () => {
    const s1 = appendTraceSample([], 5, [racer({ finishedAt: 2 })]);
    expect(s1).toEqual([{ t: 5, wpmByRacer: { you: 60 }, finished: ["you"] }]);
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

describe("closeTraceSamples", () => {
  it("adds the last finisher's final point when the race ends in a later second", () => {
    // The finished snapshot is the first to show `you` crossed: no
    // racing snapshot ever did, so the trace still ends at 54.
    const racing = appendTraceSample([], 8, [racer({ wpm: 54 })]);
    const closed = closeTraceSamples(racing, 9, [racer({ finishedAt: 9, wpm: 58 })]);
    expect(closed[1]).toEqual({ t: 9, wpmByRacer: { you: 58 }, finished: ["you"] });
  });

  it("updates the last sample in place when the race ends in the same second", () => {
    let s = appendTraceSample([], 7, [racer({ wpm: 50 }), racer({ id: "b", wpm: 40 })]);
    s = appendTraceSample(s, 8, [racer({ wpm: 54 }), racer({ id: "b", finishedAt: 7, wpm: 41 })]);
    const closed = closeTraceSamples(s, 8, [
      racer({ finishedAt: 8, wpm: 58 }),
      racer({ id: "b", finishedAt: 7, wpm: 41 }),
    ]);
    expect(closed).toHaveLength(2);
    expect(closed[0]).toBe(s[0]);
    // `b`'s final point was already recorded; only `you` changes.
    expect(closed[1]).toEqual({ t: 8, wpmByRacer: { you: 58, b: 41 }, finished: ["b", "you"] });
  });

  it("uses the last sample when the end second is earlier (clock drift)", () => {
    const s = appendTraceSample([], 9, [racer({ wpm: 54 })]);
    expect(closeTraceSamples(s, 8, [racer({ finishedAt: 8, wpm: 57 })])).toEqual([
      { t: 9, wpmByRacer: { you: 57 }, finished: ["you"] },
    ]);
  });

  it("closes every racer at the time limit", () => {
    const s = appendTraceSample([], 29, [racer({ wpm: 70 }), racer({ id: "b", wpm: 80 })]);
    const closed = closeTraceSamples(s, 30, [
      racer({ finishedAt: 30, wpm: 72 }),
      racer({ id: "b", finishedAt: 30, wpm: 81 }),
    ]);
    expect(closed[1]).toEqual({ t: 30, wpmByRacer: { you: 72, b: 81 }, finished: ["you", "b"] });
  });

  it("returns the same array when every final point is already there", () => {
    let s = appendTraceSample([], 5, [racer({ wpm: 60 })]);
    s = appendTraceSample(s, 6, [racer({ finishedAt: 5, wpm: 62 })]);
    expect(closeTraceSamples(s, 6, [racer({ finishedAt: 5, wpm: 62 })])).toBe(s);
    expect(closeTraceSamples(s, 7, [racer({ finishedAt: 5, wpm: 62 })])).toBe(s);
  });

  it("leaves disconnected racers out", () => {
    const s = appendTraceSample([], 4, [racer({ wpm: 60 }), racer({ id: "x", wpm: 30 })]);
    const closed = closeTraceSamples(s, 4, [
      racer({ finishedAt: 4, wpm: 61 }),
      racer({ id: "x", disconnected: true, wpm: 0 }),
    ]);
    expect(closed[0]).toEqual({ t: 4, wpmByRacer: { you: 61, x: 30 }, finished: ["you"] });
  });

  it("still closes the trace once it has hit the sample cap", () => {
    const full = Array.from({ length: MAX_TRACE_SAMPLES }, (_, i) => ({
      t: i + 1,
      wpmByRacer: { you: 50 },
    }));
    const closed = closeTraceSamples(full, MAX_TRACE_SAMPLES + 1, [racer({ finishedAt: 600, wpm: 52 })]);
    expect(closed).toHaveLength(MAX_TRACE_SAMPLES);
    expect(closed[MAX_TRACE_SAMPLES - 1]).toEqual({
      t: MAX_TRACE_SAMPLES,
      wpmByRacer: { you: 52 },
      finished: ["you"],
    });
  });

  it("starts the trace from an empty one like a normal sample", () => {
    expect(closeTraceSamples([], 3, [racer({ finishedAt: 3, wpm: 90 })])).toEqual([
      { t: 3, wpmByRacer: { you: 90 }, finished: ["you"] },
    ]);
  });
});
