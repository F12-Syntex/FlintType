import { describe, expect, it } from "vitest";
import { findSlipFix } from "@/lib/keystrokes/slips";
import type { KeystrokeTimingV2 } from "@/types/capture";
import type { RunInput } from "@/types/typing-analysis";
import { episodesV2 } from "./episodes";
import { episodesV1 } from "./episodes-v1";
import { asV1, randomScript, steady, withMistake } from "./run-script";
import { buildTimeline } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog".split(" ");
const v1 = (r: RunInput, P = 100) => episodesV1(buildTimeline(asV1(r)), P);

/** A v1 stream from [word, expected, typed, t] rows. */
function rows(list: [number, string, string, number][]): RunInput {
  const timings: KeystrokeTimingV2[] = list.map(([w, e, ty, t]) => ({ t, expected: e, typed: ty, correct: e !== "" && e === ty, wordIndex: w }));
  return { timings, words: ["book", "case", "dog"], durationMs: list[list.length - 1]![3], wpm: 0, lengthMode: "words" };
}

describe("v1 episodes", () => {
  it("count fixed and left-in substitutions as v2 does", () => {
    const fixed = withMistake(withMistake(steady(WORDS), { word: 1, pos: 2 }), { word: 5, pos: 1 });
    const left = withMistake(steady(WORDS), { word: 4, pos: 1, backspaces: 0 });
    for (const r of [fixed, left]) {
      const a = episodesV2(buildTimeline(r), r.words);
      const b = v1(r);
      expect(b.map((e) => [e.kind, e.fixed])).toEqual(a.map((e) => [e.kind, e.fixed]));
    }
    expect(v1(fixed).map((e) => e.needed)).toEqual([1, 1]);
  });

  it("carrying on keeps every stroke; leaving the word adds its Space", () => {
    // "casf" → "f" for "e" at the end, then next word: left the word.
    const left = episodesV1(buildTimeline(rows([[1, "c", "c", 0], [1, "a", "a", 100], [1, "s", "s", 200], [1, "e", "f", 300], [2, "d", "d", 500]])), 100);
    expect(left).toEqual([{ a: 2, b: 4, word: 1, kind: "slip", fixed: false, needed: 3 }]);
    // "cxse": a wrong "x", then the next letter is a different one: carried on.
    const on = episodesV1(buildTimeline(rows([[1, "c", "c", 0], [1, "a", "x", 100], [1, "s", "s", 200], [1, "e", "e", 300]])), 100);
    expect(on).toEqual([{ a: 0, b: 2, word: 1, kind: "slip", fixed: false, needed: 2 }]);
  });

  it("went back to an earlier word: fixed, running until the cursor is back", () => {
    const back = episodesV1(buildTimeline(rows([
      [0, "b", "b", 0], [0, "o", "o", 100], [0, "o", "o", 200], [0, "k", "k", 300],
      [1, "c", "x", 500], [0, "k", "k", 900], [1, "c", "c", 1100], [1, "a", "a", 1200],
    ])), 100);
    expect(back).toEqual([{ a: 3, b: 6, word: 1, kind: "slip", fixed: true, needed: 2 }]);
  });

  it("the doubled-letter guard: a 'fix' sooner than 1.5·P is a coincidence, unless blocked", () => {
    // "book" typed "bxok": x (for o) then the second o is correct with the same expected letter.
    const quick = rows([[0, "b", "b", 0], [0, "o", "x", 100], [0, "o", "o", 200], [0, "k", "k", 300]]);
    expect(episodesV1(buildTimeline(quick), 100)[0]).toMatchObject({ fixed: false, needed: 2 });
    const slow = rows([[0, "b", "b", 0], [0, "o", "x", 100], [0, "o", "o", 400], [0, "k", "k", 500]]);
    expect(episodesV1(buildTimeline(slow), 100)[0]).toMatchObject({ fixed: true, needed: 1 });
    const blocked = { ...quick, ctx: { stopOnError: true } };
    expect(episodesV1(buildTimeline(blocked), 100)[0]).toMatchObject({ fixed: true, needed: 1 });
  });

  it("an extra fixed in the same word needs nothing; one carried into the next word needs 2", () => {
    const same = rows([[1, "e", "e", 0], [1, "", "x", 100], [1, "e", "e", 400]]);
    expect(episodesV1(buildTimeline(same), 100)[0]).toMatchObject({ kind: "extra", fixed: true, needed: 0 });
    const next = rows([[1, "e", "e", 0], [1, "", "x", 100], [2, "d", "d", 400]]);
    expect(episodesV1(buildTimeline(next), 100)[0]).toMatchObject({ kind: "extra", fixed: false, needed: 2 });
  });

  it("a run that ends inside the mistake is unfixed at K − 1", () => {
    const end = rows([[0, "b", "b", 0], [0, "o", "x", 100], [0, "o", "y", 200]]);
    expect(episodesV1(buildTimeline(end), 100)).toEqual([{ a: 0, b: 2, word: 0, kind: "slip", fixed: false, needed: 2 }]);
  });

  it("parity: a fixed episode's span time is the unclamped slipCost from findSlipFix", () => {
    let checked = 0;
    for (let s = 0; s < 200; s++) {
      const r = asV1(randomScript(s));
      const tl = buildTimeline(r);
      for (const e of episodesV1(tl, 100)) {
        const j = e.a + 1;
        const prev = r.timings[e.a];
        if (!e.fixed || e.kind !== "slip" || !prev || !prev.correct || prev.wordIndex !== r.timings[j]!.wordIndex) continue;
        if (r.timings[e.b]!.wordIndex !== r.timings[j]!.wordIndex) continue;
        const fix = findSlipFix(r.timings, j);
        if (fix < 0) continue;
        expect(fix).toBe(e.b);
        expect(r.timings[e.b]!.t - prev.t).toBe(r.timings[fix]!.t - r.timings[j - 1]!.t);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});
