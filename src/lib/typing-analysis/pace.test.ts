import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { bigramCategory } from "@/lib/keystrokes/motor-features";
import type { RunContext } from "@/types/capture";
import type { RunInput } from "@/types/typing-analysis";
import { boundaryUnits, episodeMask } from "./budget";
import { episodesV2 } from "./episodes";
import { cleanSet, estimatePace, letterGaps, taintOf, thresholds } from "./pace";
import { steady, withMistake } from "./run-script";
import { noTruth, render, type Act } from "./run-script-core";
import { seeded } from "./run-script-core";
import { median } from "./stats";
import { buildTimeline } from "./timeline";

/** A v2 run whose every gap comes from `gap` (boundary = word to word). */
function stream(words: string[], gap: (a: string, b: string, boundary: boolean) => number, ctx: RunContext = { codeMatch: 1 }): RunInput {
  const acts: Act[] = [];
  let t = 0;
  let prev = "";
  words.forEach((w, wi) => [...w].forEach((ch, ci) => {
    if (wi > 0 || ci > 0) {
      const g = gap(prev, ch, ci === 0);
      if (ci === 0) acts.push({ k: "space", t: t + g / 2 });
      t += g;
    }
    acts.push({ k: "char", t, ch });
    prev = ch;
  }));
  return render({ words, acts, ctx, lengthMode: "words", truth: noTruth() });
}

function randomWords(rng: () => number, n: number, letters = "abcdefghijklmnopqrstuvwxyz"): string[] {
  return Array.from({ length: n }, () => Array.from({ length: 3 + Math.floor(rng() * 5) }, () => letters[Math.floor(rng() * letters.length)]!).join(""));
}
const noise = (rng: () => number, s: number) => Math.exp(s * (rng() + rng() + rng() + rng() - 2) * 1.73);
const cat = (a: string, b: string) => bigramCategory(a, b, DEFAULT_HAND_LAYOUT);

function paceOf(r: RunInput) {
  const tl = buildTimeline(r);
  const base = estimatePace(tl, taintOf(tl));
  const eps = episodesV2(tl, r.words);
  const th = base.P === null ? null : thresholds(tl, { ...base, P: base.P }, boundaryUnits(tl, episodeMask(tl, eps)));
  return { tl, base, th };
}

describe("P and σ", () => {
  it("a constant 100 ms stream gives P = 100 ± 1", () => {
    const { base } = paceOf(steady("the quick brown fox jumps over the lazy dog".split(" ")));
    expect(base.quality).toBe("good");
    expect(Math.abs(base.P! - 100)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("10% of gaps at 3× leaves P within 5% of the fluent median (20 seeds)", () => {
    for (let s = 0; s < 20; s++) {
      const rng = seeded(100 + s);
      const fluent: number[] = [];
      const r = stream(randomWords(rng, 40), (_a, _b, bd) => {
        const g = (bd ? 250 : 120) * noise(rng, 0.15);
        const slow = !bd && rng() < 0.1;
        if (!bd && !slow) fluent.push(g);
        return slow ? 3 * g : g;
      }, {});
      const { base } = paceOf(r);
      expect(Math.abs(base.P! / median(fluent) - 1)).toBeLessThan(0.05);
    }
  });

  it("same-finger gaps at 1.35× leave P unchanged; at 1.8× the run's own ratio takes over", () => {
    const rng = seeded(3);
    const words = randomWords(rng, 60, "edcrfvujmik");
    const at = (f: number) => (a: string, b: string, bd: boolean) => (bd ? 260 : cat(a, b) === "same-finger" ? 100 * f : cat(a, b) === "same-hand" ? 106 : 100);
    const plain = paceOf(stream(words, at(1.35)));
    expect(Math.abs(plain.base.P! - 100)).toBeLessThan(2);
    const slow = paceOf(stream(words, at(1.8)));
    const fingers = slow.base.cls.filter((c, k) => c === "finger" && slow.base.inI[k]).length;
    expect(fingers).toBeGreaterThanOrEqual(40);
    expect(slow.base.rho.finger).toBeGreaterThanOrEqual(1.6);
    let caught = 0;
    for (let k = 1; k < slow.tl.K; k++) if (slow.base.cls[k] === "finger" && slow.base.inI[k] && slow.tl.ds[k]! > slow.th!.catchAt(k)) caught++;
    expect(caught / fingers).toBeLessThan(0.03);
  });

  it("P = 55 ms gives a cross-hand catch threshold within [88, 165]", () => {
    const rng = seeded(9);
    const { tl, base, th } = paceOf(stream(randomWords(rng, 40), (_a, _b, bd) => (bd ? 130 : 55) * noise(rng, 0.3), {}));
    expect(Math.abs(base.P! / 55 - 1)).toBeLessThan(0.1);
    for (let k = 1; k < tl.K; k++) {
      if (base.cls[k] !== "cross") continue;
      expect(th!.catchAt(k)).toBeGreaterThanOrEqual(88 * 0.9);
      expect(th!.catchAt(k)).toBeLessThanOrEqual(165 * 1.1);
    }
  });

  it("14 clean gaps give a rough pace and fewer than 5 give none", () => {
    expect(paceOf(steady(["abcdefghijklmno"])).base.quality).toBe("rough");
    expect(paceOf(steady(["abcdefghijklmnop"])).base.quality).toBe("good");
    expect(paceOf(steady(["abcd", "efg"])).base.quality).toBe("rough");
    expect(paceOf(steady(["abc", "de"])).base.quality).toBe("none");
    expect(paceOf(steady(["abc", "de"])).base.P).toBeNull();
  });
});

describe("word-gap pace P_B", () => {
  it("word gaps at 3P give P_B ≈ 3P and under 2% of fluent word gaps as pauses (50 seeds)", () => {
    let pauses = 0;
    let gaps = 0;
    for (let s = 0; s < 50; s++) {
      const rng = seeded(500 + s);
      const { tl, base, th } = paceOf(stream(randomWords(rng, 40), (_a, _b, bd) => (bd ? 300 : 100) * noise(rng, 0.18), {}));
      expect(th!.boundaryMs / base.P!).toBeGreaterThan(2.6);
      expect(th!.boundaryMs / base.P!).toBeLessThanOrEqual(3 + 1e-9);
      for (let k = 1; k < tl.K; k++) {
        if (tl.ev[k]!.wordIndex === tl.ev[k - 1]!.wordIndex) continue;
        gaps++;
        if (tl.ds[k]! > th!.pauseAt(k)) pauses++;
      }
    }
    expect(pauses / gaps).toBeLessThan(0.02);
  });

  it("word gaps at 6P on 60% of boundaries are still pauses (the 3P clamp)", () => {
    const rng = seeded(11);
    let n = 0;
    const words = randomWords(rng, 30);
    const { tl, th } = paceOf(stream(words, (_a, _b, bd) => (bd ? (n++ % 5 < 3 ? 600 : 200) : 100) * noise(rng, 0.1), {}));
    expect(th!.boundaryMs).toBeLessThan(400);
    for (let k = 1; k < tl.K; k++) {
      if (tl.ev[k]!.wordIndex === tl.ev[k - 1]!.wordIndex) continue;
      expect(tl.ds[k]! > th!.pauseAt(k)).toBe(tl.ds[k]! > 400);
    }
  });

  it("with pauses before 90% of words P_B holds at 3P and the in-word spread sets the bar", () => {
    const rng = seeded(12);
    let n = 0;
    const { tl, base, th } = paceOf(stream(randomWords(rng, 30), (_a, _b, bd) => (bd ? (n++ % 10 < 9 ? 600 : 200) : 100) * noise(rng, 0.1), {}));
    expect(th!.boundaryMs).toBeCloseTo(3 * base.P!, 6);
    for (let k = 1; k < tl.K; k++) {
      if (tl.ev[k]!.wordIndex !== tl.ev[k - 1]!.wordIndex) expect(tl.ds[k]! > th!.pauseAt(k)).toBe(tl.ds[k]! > 400);
    }
  });

  it("fewer than 10 boundaries give P_B = 2.4P", () => {
    const { base, th } = paceOf(steady("alpha bravo charlie delta echo foxtrot golf hotel".split(" ")));
    expect(th!.boundaryMs).toBeCloseTo(2.4 * base.P!, 6);
  });

  it("a shifted next letter uses s = (1 + ρ_shift)/2", () => {
    const { tl, th } = paceOf(steady("alpha Bravo charlie delta".split(" ")));
    const k = tl.ev.findIndex((e) => e.expected === "B");
    expect(th!.shiftFactor(k)).toBeCloseTo(1.3, 6);
    expect(th!.needB(k)).toBeCloseTo(th!.boundaryMs * 1.3, 6);
    expect(th!.shiftFactor(1)).toBe(1);
  });
});

describe("the clean set", () => {
  it("the statistics floor is 5 ms for keydowns on ht and 25 ms otherwise; chunks are excluded", () => {
    const fast = (o: { ht?: boolean; src?: "input" }) => {
      const r = steady(["abcdefghij", "klmnopq"], { key: 12, jitter: 0, ...o });
      const tl = buildTimeline(r);
      return cleanSet(tl, taintOf(tl)).reduce((a, v) => a + v, 0);
    };
    expect(fast({ ht: true })).toBeGreaterThan(10);
    expect(fast({})).toBe(0);
    expect(fast({ ht: true, src: "input" })).toBe(0);
    const chunked = steady(["abcdefghij"], { key: 2, jitter: 0, ht: true });
    const tl = buildTimeline(chunked);
    expect(cleanSet(tl, taintOf(tl)).reduce((a, v) => a + v, 0)).toBe(0);
  });
});

describe("letterGaps", () => {
  it("never returns a word's first letter, the key after a wrong key or the key after an edit", () => {
    const r = withMistake(steady(["alpha", "bravo", "charlie"]), { word: 1, pos: 2, noticeAfter: 1 });
    const gaps = letterGaps(r);
    expect(gaps.length).toBeGreaterThan(0);
    const tl = buildTimeline(r);
    const inI = cleanSet(tl, taintOf(tl));
    for (let k = 1; k < tl.K; k++) {
      const e = tl.ev[k]!;
      const afterWrong = !tl.ev[k - 1]!.correct;
      const afterEdit = tl.marks[k]!.some((m) => m.kind === "edit");
      const first = e.wordIndex !== tl.ev[k - 1]!.wordIndex;
      if (afterWrong || afterEdit || first) expect(inI[k]).toBe(0);
    }
    expect(gaps[0]).toEqual({ letter: "l", ms: tl.ds[1] });
    expect(letterGaps({ ...r, timings: r.timings.slice(0, 1) })).toEqual([]);
  });

  it("returns [] for a malformed payload instead of throwing (the live clone renders it)", () => {
    const ok = steady(["ab"]);
    const bad = [
      { ...ok, timings: [{ t: 0, correct: true, wordIndex: 0 }, { t: 90, correct: true, wordIndex: 0 }] },
      { ...ok, timings: [null, ok.timings[0]] },
      { ...ok, words: undefined },
      { ...ok, timings: ok.timings.map((e) => ({ ...e, wordIndex: 4e9 })) },
      { ...ok, durationMs: 1e12 },
      null,
    ] as unknown as RunInput[];
    for (const input of bad) expect(letterGaps(input)).toEqual([]);
    expect(letterGaps(ok).length).toBe(1);
  });
});
