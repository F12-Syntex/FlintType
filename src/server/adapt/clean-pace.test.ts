import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import type { KeystrokeTiming } from "@/types/adapt";
import { deltasFor } from "./apply";
import { MIN_PACE_INTERVALS, cleanPaceMs } from "./clean-pace";
import { extract, MIN_INTERVAL_MS } from "./measure";
import { baselineMean } from "./scoring";
import { SLIP_COST_DEFAULT_RATIO } from "./slips";
import type { ModelState } from "./welford";

function k(
  t: number,
  expected: string,
  correct = true,
  wordIndex = 0,
): KeystrokeTiming {
  return { t, expected, typed: correct ? expected : "#", correct, wordIndex };
}

/** One clean word whose in-word intervals are `gaps`. */
function word(gaps: number[], wordIndex = 0, start = 0): KeystrokeTiming[] {
  const out = [k(start, "a", true, wordIndex)];
  let t = start;
  for (const g of gaps) {
    t += g;
    out.push(k(t, "a", true, wordIndex));
  }
  return out;
}

const pace = (timings: KeystrokeTiming[], overall: number, tainted?: boolean[]) =>
  cleanPaceMs(timings, tainted ?? timings.map(() => false), overall, MIN_INTERVAL_MS);

describe("cleanPaceMs", () => {
  it("is 0 before the user has a baseline", () => {
    expect(pace(word([100, 100, 100, 100, 100, 100]), 0)).toBe(0);
  });

  it("is the median clean interval, capped at the baseline", () => {
    const timings = word([100, 120, 140, 160, 2_000]);
    expect(pace(timings, 500)).toBe(140); // the 2s hesitation doesn't move it
    expect(pace(timings, 130)).toBe(130);
  });

  it("falls back to the baseline when the test has too few clean intervals", () => {
    const gaps = Array.from({ length: MIN_PACE_INTERVALS - 1 }, () => 100);
    expect(pace(word(gaps), 300)).toBe(300);
  });

  it("only counts clean in-word intervals", () => {
    // Clean: 100, 110, 120 | 130, 140 → median 120. Any one excluded
    // interval leaking in would move the median off 120.
    const timings = [
      ...word([100, 110, 120], 0, 0),
      ...word([130, 140], 1, 1_000), // 670ms across the word boundary
      k(1_300, "b", false, 1), // wrong key
      k(1_500, "c", true, 1), // its recovery key (tainted)
      k(1_700, "d", true, 1), // 200ms after a tainted key
      k(1_710, "e", true, 1), // below MIN_INTERVAL_MS
    ];
    const tainted = timings.map((_, i) => i === 7 || i === 8);
    expect(pace(timings, 1_000, tainted)).toBe(120);
  });
});

describe("extract with the clean pace", () => {
  const sloppyWord = (start: number, wordIndex: number) => [
    k(start, "t", true, wordIndex),
    k(start + 100, "h", false, wordIndex), // slip on "th", never fixed
    k(start + 200, "e", true, wordIndex),
  ];

  it("charges slips against the test's clean pace, not the inflated baseline", () => {
    const timings = [...word([100, 100, 100, 100, 100], 0), ...sloppyWord(2_000, 1)];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, {
      bigram: new Map(),
      trigram: new Map(),
      word: new Map(),
      overallBigram: 900, // a baseline inflated by earlier slip costs
    });
    expect(m.slips.bigrams.get("th")).toEqual([SLIP_COST_DEFAULT_RATIO * 100]);
  });

  it("caps the pause gate at the clean pace", () => {
    // 900ms passes a gate built on the 900ms baseline but is a pause
    // for someone whose clean pace is 100ms.
    const timings = [...word([100, 100, 100, 100, 100, 900], 0)];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, {
      bigram: new Map([["aa", 900]]),
      trigram: new Map(),
      word: new Map(),
      overallBigram: 900,
    });
    expect(m.bigrams.get("aa")).toEqual([100, 100, 100, 100, 100]);
    expect(m.rejected).toBe(1);
  });
});

describe("slip costs over many tests", () => {
  const WORDS = ["there", "about", "would", "these", "other", "words", "could", "write"];
  const CLEAN_MS = 150;

  /** A typist with a steady clean pace who leaves 22% of keys wrong and
   *  never fixes them: the case whose means used to climb without bound. */
  function sloppyTest(rand: () => number): KeystrokeTiming[] {
    const out: KeystrokeTiming[] = [];
    let t = 0;
    for (let w = 0; w < 60; w++) {
      const target = WORDS[Math.floor(rand() * WORDS.length)]!;
      for (const ch of target) {
        t += CLEAN_MS + (rand() - 0.5) * 60;
        out.push(k(t, ch, rand() >= 0.22, w));
      }
      t += CLEAN_MS;
    }
    return out;
  }

  it("keeps the overall bigram mean bounded instead of compounding", () => {
    let seed = 12_345;
    const rand = () => {
      seed = (seed * 1_103_515_245 + 12_345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    let states = new Map<string, ModelState>();
    const history: number[] = [];
    for (let test = 0; test < 80; test++) {
      const m = extract(sloppyTest(rand), DEFAULT_HAND_LAYOUT, {
        bigram: new Map(Array.from(states, ([key, s]) => [key, s.mean] as const)),
        trigram: new Map(),
        word: new Map(),
        overallBigram: baselineMean(states),
      });
      const next = new Map(states);
      for (const [key, d] of deltasFor(states, m.bigrams, { slips: m.slips.bigrams })) {
        next.set(key, { mean: d.meanMs, variance: d.varianceMs, n: d.sampleCount });
      }
      states = next;
      history.push(baselineMean(states));
    }
    // Mistakes still cost time (effective means sit above the clean
    // pace), but the cost no longer feeds on itself: before the fix
    // this run reached about 14× the clean pace and was still rising.
    const last = history.at(-1)!;
    expect(last).toBeLessThan(2 * CLEAN_MS);
    expect(Math.abs(last - history[39]!)).toBeLessThan(0.1 * last);
  });
});
