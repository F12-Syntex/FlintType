import { describe, expect, it } from "vitest";
import {
  type BurstTry,
  burstBuckets,
  burstCaption,
  burstResult,
  burstSpeed,
  summariseBursts,
  timedKeys,
} from "./burst-stats";

/** A clean, cleared try: `chars` keys, closed by space. */
function cleared(chars: number, ms: number, endT: number): BurstTry {
  return { endT, ms, keys: chars, chars, endedBySpace: true, cleared: true };
}

describe("burstSpeed", () => {
  it("matches the live readout: (chars / 5) per minute", () => {
    // 5 chars in 1s = 1 word per second = 60 wpm.
    expect(burstSpeed(5, 1000)).toBe(60);
    expect(burstSpeed(4, 200)).toBe(240);
  });

  it("is 0 for empty or untimed input", () => {
    expect(burstSpeed(0, 500)).toBe(0);
    expect(burstSpeed(5, 0)).toBe(0);
  });
});

describe("timedKeys", () => {
  it("counts a space-closed try at its key count", () => {
    expect(timedKeys(cleared(4, 200, 0))).toBe(4);
  });

  it("drops the clock-starting key when a wrong key ends the try", () => {
    const miss: BurstTry = {
      endT: 0,
      ms: 90,
      keys: 3,
      chars: 5,
      endedBySpace: false,
      cleared: false,
    };
    expect(timedKeys(miss)).toBe(2);
    expect(timedKeys({ ...miss, keys: 1 })).toBe(0);
  });
});

describe("summariseBursts", () => {
  it("returns null until a try clears", () => {
    expect(summariseBursts([])).toBeNull();
    expect(
      summariseBursts([
        { endT: 900, ms: 900, keys: 5, chars: 5, endedBySpace: true, cleared: false },
      ]),
    ).toBeNull();
  });

  it("headlines the cleared tries' speed, not committed words over the whole run", () => {
    // Ten cleared reps of a 5-letter word at 100 wpm (600ms each), with
    // long pauses between them: the run lasts 20s.
    const tries = Array.from({ length: 10 }, (_, i) =>
      cleared(5, 600, (i + 1) * 2000),
    );
    const s = summariseBursts(tries)!;
    expect(s.wpm).toBeCloseTo(100);
    // A clean run: raw equals the burst speed.
    expect(s.raw).toBeCloseTo(100);
    expect(s.best).toBeCloseTo(100);
    expect(s.slowest).toBeCloseTo(100);
    expect(s.consistency).toBe(100);
    expect(s.cleared).toBe(10);
    expect(s.tries).toBe(10);
  });

  it("weights the average by time, so a tiny fast word can't dominate it", () => {
    // "of" in 60ms (400 wpm) and "people" in 1440ms (50 wpm).
    const s = summariseBursts([cleared(2, 60, 1000), cleared(6, 1440, 3000)])!;
    // (2 + 6) chars over 1500ms = 64 wpm; a plain mean would say 225.
    expect(s.wpm).toBeCloseTo(64);
    expect(s.best).toBeCloseTo(400);
    expect(s.slowest).toBeCloseTo(50);
  });

  it("counts misses, slow tries and retries in raw but not in the headline", () => {
    const tries: BurstTry[] = [
      cleared(5, 600, 1000), // 100 wpm
      // slow try: typed right, but 30 wpm
      { endT: 4000, ms: 2000, keys: 5, chars: 5, endedBySpace: true, cleared: false },
      // wrong key on the 3rd char: 2 timed keys in 200ms
      { endT: 5000, ms: 200, keys: 3, chars: 5, endedBySpace: false, cleared: false },
      cleared(5, 600, 6000), // 100 wpm
    ];
    const s = summariseBursts(tries)!;
    expect(s.wpm).toBeCloseTo(100);
    // (5 + 5 + 2 + 5) keys over 3400ms.
    expect(s.raw).toBeCloseTo((17 * 12_000) / 3400);
    expect(s.cleared).toBe(2);
    expect(s.tries).toBe(4);
  });

  it("scores uneven bursts as less consistent", () => {
    const even = summariseBursts([cleared(5, 600, 1000), cleared(5, 600, 2000)])!;
    const uneven = summariseBursts([cleared(5, 300, 1000), cleared(5, 1200, 2000)])!;
    expect(even.consistency).toBe(100);
    expect(uneven.consistency).toBeLessThan(even.consistency);
  });
});

describe("burstBuckets", () => {
  it("is empty without tries", () => {
    expect(burstBuckets([])).toEqual([]);
  });

  it("plots the running burst speed per second and ends on the headline", () => {
    const tries: BurstTry[] = [
      { endT: 800, ms: 500, keys: 2, chars: 5, endedBySpace: false, cleared: false },
      cleared(5, 600, 2400), // 100 wpm
      cleared(5, 400, 3600), // 150 wpm
    ];
    const buckets = burstBuckets(tries);
    // Starts at second 1 like a regular run, so the opening miss gets
    // its ribbon bar and ✕ mark.
    expect(buckets.map((b) => b.sec)).toEqual([1, 2, 3, 4]);
    // Nothing cleared before 2.4s: those seconds carry the first burst
    // speed back, while raw already counts the miss (1 timed key in
    // 500ms = 24 wpm).
    expect(buckets[0]).toEqual({ sec: 1, wpm: 100, raw: 24 });
    expect(buckets[1]).toEqual({ sec: 2, wpm: 100, raw: 24 });
    expect(buckets[2]!.wpm).toBe(100);
    const last = buckets[buckets.length - 1]!;
    expect(last.wpm).toBeCloseTo(summariseBursts(tries)!.wpm, 1);
    expect(last.raw).toBeCloseTo(summariseBursts(tries)!.raw, 1);
  });

  it("carries the first raw value back to seconds before any try ended", () => {
    const buckets = burstBuckets([cleared(5, 600, 3000), cleared(5, 600, 4000)]);
    expect(buckets.map((b) => b.sec)).toEqual([1, 2, 3, 4]);
    expect(buckets[0]).toEqual({ sec: 1, wpm: 100, raw: 100 });
  });

  it("puts every try in the final second even when it rounds down", () => {
    // Last try ends at 4.3s → the final bucket is second 4 and holds it.
    const tries = [cleared(5, 600, 1000), cleared(5, 300, 4300)];
    const buckets = burstBuckets(tries);
    expect(buckets[buckets.length - 1]).toMatchObject({ sec: 4 });
    expect(buckets[buckets.length - 1]!.wpm).toBeCloseTo(
      summariseBursts(tries)!.wpm,
      1,
    );
  });
});

describe("burstCaption", () => {
  it("names the cleared bursts and the best one", () => {
    expect(burstCaption({ cleared: 8, tries: 8 }, "160", "WPM")).toBe(
      "Speed across your 8 cleared bursts. Best 160 WPM.",
    );
  });

  it("special-cases a single cleared burst", () => {
    expect(burstCaption({ cleared: 1, tries: 1 }, "90", "WPM")).toBe(
      "Speed of your one cleared burst.",
    );
  });

  it("says why Raw is lower when some tries didn't clear", () => {
    expect(burstCaption({ cleared: 20, tries: 96 }, "181", "CPM")).toBe(
      "Speed across your 20 cleared bursts. Best 181 CPM. Raw also counts the 76 tries that didn't clear.",
    );
    expect(burstCaption({ cleared: 1, tries: 2 }, "90", "WPM")).toBe(
      "Speed of your one cleared burst. Raw also counts the 1 try that didn't clear.",
    );
  });
});

describe("burstResult", () => {
  it("is null until a try clears", () => {
    expect(burstResult([])).toBeNull();
    const miss: BurstTry = {
      endT: 500,
      ms: 200,
      keys: 2,
      chars: 5,
      endedBySpace: false,
      cleared: false,
    };
    expect(burstResult([miss])).toBeNull();
  });

  it("bundles the summary and the chart series of the same tries", () => {
    const tries = [cleared(5, 1000, 1200), cleared(5, 500, 2600)];
    const r = burstResult(tries);
    expect(r?.summary).toEqual(summariseBursts(tries));
    expect(r?.buckets).toEqual(burstBuckets(tries));
  });
});
