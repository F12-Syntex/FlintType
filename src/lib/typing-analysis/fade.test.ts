import { describe, expect, it } from "vitest";
import type { RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { steady, timeRun, withBreak } from "./run-script";
import { noTruth, render, scriptOf, seeded, type Act } from "./run-script-core";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field to find a quiet place".split(" ");
const many = (n: number) => Array.from({ length: n }, (_, i) => WORDS[i % WORDS.length]!);
const hasFade = (r: RunInput) => analyseRun(r)!.findings.some((f) => f.kind === "fade");

/** Re-times a run: every gap that ends after `fromMs` is scaled by `f`. */
function slowAfter(r: RunInput, fromMs: number, f: number): RunInput {
  const sc = scriptOf(r);
  let prevOld = 0;
  let prevNew = 0;
  const acts: Act[] = sc.acts.map((a) => {
    const g = a.t - prevOld;
    prevOld = a.t;
    prevNew += g * (a.t > fromMs ? f : 1);
    return { ...a, t: prevNew };
  });
  return render({ ...sc, acts, truth: noTruth() });
}

/** A TIME run with realistic keystroke noise: log-normal key gaps (log
 *  SD `sig`), word gaps 2.2× a key, a 3× pause before a word with
 *  probability `pauses`, and optionally a word-level AR(1) drift (`phi`,
 *  innovation SD `wsig`) and a slowdown by `slow` after `slowFrom` ms. */
function noisy(seed: number, T: number, o: { sig: number; pauses: number; phi?: number; wsig?: number; slowFrom?: number; slow?: number }): RunInput {
  const rng = seeded(seed);
  const z = () => (rng() + rng() + rng() + rng() - 2) * 1.73;
  const acts: Act[] = [];
  const words: string[] = [];
  let t = 0;
  let drift = 0;
  while (t < T + 2000) {
    const w = WORDS[Math.floor(rng() * WORDS.length)]!;
    words.push(w);
    drift = (o.phi ?? 0) * drift + (o.wsig ?? 0) * z();
    [...w].forEach((ch, ci) => {
      if (words.length > 1 || ci > 0) {
        const pause = ci === 0 && rng() < o.pauses ? 3 : 1;
        const slow = o.slowFrom !== undefined && t > o.slowFrom ? o.slow! : 1;
        const g = (ci === 0 ? 260 : 120) * Math.exp(o.sig * z() + drift) * pause * slow;
        if (ci === 0) acts.push({ k: "space", t: t + g / 2 });
        t += g;
      }
      acts.push({ k: "char", t, ch });
    });
  }
  return render({ words, acts, ctx: {}, lengthMode: "time", T, truth: noTruth() });
}

const share = (n: number, run: (seed: number) => RunInput) => {
  let shown = 0;
  for (let s = 0; s < n; s++) if (hasFade(run(s))) shown++;
  return shown / n;
};

describe("fade", () => {
  it("is found on a 60 s run slowing 15% in its last 20 s", () => {
    const r = slowAfter(timeRun(steady(many(160)), 60_000), 40_000, 1 / 0.85);
    const a = analyseRun(timeRun(r, 60_000))!;
    expect(a.fade!.significant).toBe(true);
    expect(a.fade!.toWpm / a.fade!.fromWpm).toBeCloseTo(0.85, 1);
    expect(a.findings.some((f) => f.kind === "fade")).toBe(true);
  });

  it("under 6 windows the drop must also be 10% or more; under 30 s there is none", () => {
    const at = (f: number) => analyseRun(timeRun(slowAfter(timeRun(steady(many(100)), 30_000), 20_000, f), 30_000))!.fade!;
    expect(at(1 / 0.8).significant).toBe(true);
    const small = at(1 / 0.93);
    expect(small.toWpm).toBeLessThan(small.fromWpm);
    expect(small.significant).toBe(false);
    expect(analyseRun(steady(WORDS))!.fade).toBeNull();
  });

  it("steady runs with realistic noise show a fade in at most 5% of 30 s and 60 s tests", () => {
    expect(share(200, (s) => noisy(100 + s, 30_000, { sig: 0.28, pauses: 0.1 }))).toBeLessThanOrEqual(0.05);
    expect(share(200, (s) => noisy(400 + s, 60_000, { sig: 0.28, pauses: 0.1 }))).toBeLessThanOrEqual(0.05);
    // Speed that wanders from word to word (lag-1 correlated) is not a fade either.
    expect(share(200, (s) => noisy(700 + s, 60_000, { sig: 0.28, pauses: 0.1, phi: 0.5, wsig: 0.15 }))).toBeLessThanOrEqual(0.05);
  }, 60_000);

  it("a real 25% slowdown under the same noise is still found in most 60 s tests", () => {
    expect(share(200, (s) => noisy(1000 + s, 60_000, { sig: 0.28, pauses: 0.1, slowFrom: 40_000, slow: 1 / 0.75 }))).toBeGreaterThan(0.5);
  }, 60_000);
});

describe("fade and breaks", () => {
  it("a TIME run left idle for its last 35 s has no fade", () => {
    const a = analyseRun(timeRun(steady(many(50)), 60_000))!;
    expect(a.findings.map((f) => f.kind)).toContain("breaks");
    expect(a.fade?.significant ?? false).toBe(false);
    expect(a.findings.some((f) => f.kind === "fade")).toBe(false);
  });

  it("a 9 s or 25 s break near the end of a run doesn't read as a fade", () => {
    for (const [beforeWord, ms] of [[90, 9000], [80, 25_000]] as const) {
      const a = analyseRun(withBreak(steady(many(100)), { beforeWord, ms }))!;
      expect(a.breaks.count).toBe(1);
      expect(a.findings.some((f) => f.kind === "fade")).toBe(false);
      // The break leaves the windows' rates alone: the speed never changed.
      expect(a.fade!.toWpm / a.fade!.fromWpm).toBeGreaterThan(0.95);
    }
  });
});
