import { describe, expect, it } from "vitest";
import {
  isSettled,
  predictedProgress,
  stepLaneMotion,
  type LaneTarget,
} from "./lane-motion";

const target = (over: Partial<LaneTarget> = {}): LaneTarget => ({
  chars: 50,
  totalChars: 100,
  wpm: 60,
  sinceUpdateMs: 0,
  finished: false,
  racing: true,
  ...over,
});

describe("predictedProgress", () => {
  it("rests at the start before the gun", () => {
    expect(predictedProgress(target({ racing: false }))).toBe(0);
  });

  it("is the line once finished", () => {
    expect(predictedProgress(target({ finished: true, chars: 90 }))).toBe(1);
  });

  it("adds the racer's speed for the time since the update", () => {
    // 60 wpm = 5 chars a second, so 200 ms is 1 char.
    expect(predictedProgress(target({ sinceUpdateMs: 200 }))).toBeCloseTo(0.51);
  });

  it("caps the guess at a few characters and the prediction window", () => {
    expect(predictedProgress(target({ wpm: 300, sinceUpdateMs: 5_000 }))).toBeCloseTo(0.54);
    expect(predictedProgress(target({ wpm: 30, sinceUpdateMs: 5_000 }))).toBeCloseTo(0.515);
  });

  it("never guesses a racer over the line", () => {
    const p = predictedProgress(target({ chars: 99, wpm: 200, sinceUpdateMs: 600 }));
    expect(p).toBeLessThan(1);
    expect(p).toBeGreaterThanOrEqual(0.99);
  });

  it("is 0 for an empty passage", () => {
    expect(predictedProgress(target({ totalChars: 0 }))).toBe(0);
  });
});

describe("stepLaneMotion", () => {
  it("eases toward the target instead of jumping", () => {
    const next = stepLaneMotion({ pos: 0.4, angle: 0 }, target({ wpm: 0 }), 16, 600, 28);
    expect(next.pos).toBeGreaterThan(0.4);
    expect(next.pos).toBeLessThan(0.5);
  });

  it("reaches the target after a few time constants", () => {
    let m = { pos: 0.4, angle: 0 };
    for (let i = 0; i < 60; i += 1) m = stepLaneMotion(m, target({ wpm: 0 }), 16, 600, 28);
    expect(m.pos).toBe(0.5);
  });

  it("holds still rather than sliding back on a small drop", () => {
    const next = stepLaneMotion({ pos: 0.53, angle: 10 }, target({ wpm: 0 }), 16, 600, 28);
    expect(next.pos).toBe(0.53);
    expect(next.angle).toBe(10);
  });

  it("snaps back on a restart", () => {
    const next = stepLaneMotion({ pos: 0.6, angle: 0 }, target({ chars: 0, wpm: 0 }), 16, 600, 28);
    expect(next.pos).toBe(0);
  });

  it("returns to the start when the race isn't running", () => {
    expect(stepLaneMotion({ pos: 0.3, angle: 0 }, target({ racing: false }), 16, 600, 28).pos).toBe(0);
  });

  it("glides into the line on finishing", () => {
    const next = stepLaneMotion({ pos: 0.95, angle: 0 }, target({ chars: 100, finished: true }), 16, 600, 28);
    expect(next.pos).toBeGreaterThan(0.95);
  });

  it("rolls one turn per circumference travelled", () => {
    const stone = 28;
    const track = 1000;
    // Travel half a circumference in one big step: half a turn.
    const goal = (Math.PI * stone) / 2 / track;
    const next = stepLaneMotion(
      { pos: 0, angle: 0 },
      target({ chars: goal * 100, wpm: 0 }),
      10_000,
      track,
      stone,
    );
    expect(next.pos).toBeCloseTo(goal);
    expect(next.angle).toBeCloseTo(180, 0);
  });

  it("doesn't roll under reduced motion", () => {
    const next = stepLaneMotion({ pos: 0, angle: 0 }, target({ wpm: 0 }), 50, 600, 28, false);
    expect(next.angle).toBe(0);
    expect(next.pos).toBeGreaterThan(0);
  });
});

describe("isSettled", () => {
  it("keeps running while a racer is moving", () => {
    expect(isSettled({ pos: 0.5, angle: 0 }, target())).toBe(false);
  });

  it("sleeps once caught up with a still target", () => {
    expect(isSettled({ pos: 0.5, angle: 0 }, target({ wpm: 0 }))).toBe(true);
    expect(isSettled({ pos: 1, angle: 0 }, target({ finished: true }))).toBe(true);
    expect(isSettled({ pos: 0, angle: 0 }, target({ racing: false }))).toBe(true);
  });
});
