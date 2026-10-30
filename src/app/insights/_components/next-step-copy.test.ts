import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { BarrierKind, BarrierVariant, Gate, NextStep, SpeedHeadline, TrendState } from "@/types/insights";
import type { FrictionKey } from "@/types/typing-analysis";
import { testKindOf } from "./copy-phrases";
import {
  actionHref,
  actionLabel,
  alternativeLines,
  gainLine,
  nextStepBecause,
  nextStepTitle,
  pauseShareRose,
  TREND_WORD,
  trendSentence,
} from "./next-step-copy";

const kind = testKindOf({
  key: "training|words|25", mode: "training", lengthMode: "words", length: 25, touch: false,
  tests: 20, analysed: 20, lastAtMs: 0,
});
const NOW = Date.UTC(2026, 9, 29, 12);
const DAY = 86_400_000;

function headline(state: TrendState, o: Partial<SpeedHeadline["trend"]> = {}): SpeedHeadline {
  return {
    usual: 72, range: { low: 66, mid: 72, high: 79, n: 30, rule: "middle-80" }, last: 75, adjusted: false,
    trend: { state, deltaWpm: null, earlierN: 30, sinceMs: null, weeks: null, explanation: null, gate: null, ...o },
  };
}

const clean = (s: string) => expect(bannedPatterns(s), s).toEqual([]);
/** How many times a sentence says "about" (ui-law §27 rule 6: one hedge). */
const hedges = (s: string) => (s.match(/\babout\b/gi) ?? []).length;
const heading = (s: string) => expect(bannedPatterns(s, { heading: true }), s).toEqual([]);

describe("trend copy", () => {
  it("has a word for every state", () => {
    for (const w of Object.values(TREND_WORD)) clean(w);
  });
  it("says how much faster and since when", () => {
    const s = trendSentence(headline("improving", { deltaWpm: 4, sinceMs: NOW - 14 * DAY }), "wpm", kind, NOW);
    expect(s).toBe("About 4 wpm faster than 2 weeks ago.");
    const why = trendSentence(
      headline("improving", { deltaWpm: 4, sinceMs: NOW - 3 * DAY, explanation: "fixing" }), "wpm", kind, NOW,
    );
    expect(why).toBe("About 4 wpm faster than 3 days ago. Most of the gain came from fewer mistakes.");
  });
  it("names the drop's cause when slipping", () => {
    const s = trendSentence(headline("slipping", { deltaWpm: 3, explanation: "before" }), "cpm", kind, NOW);
    expect(s).toBe(
      "Your last 10 tests are about 15 cpm below the ones before. Tired days and harder passages can both do this. Most of the drop came from longer pauses before words.",
    );
  });
  it("counts up while early, in tests or sessions", () => {
    expect(trendSentence(headline("early", { gate: { have: 12, need: 15, unit: "tests" } }), "wpm", kind, NOW)).toBe(
      "3 more Adapt tests of 25 words and we can tell which way you're heading.",
    );
    expect(trendSentence(headline("early", { gate: { have: 14, need: 15, unit: "tests" } }), "wpm", kind, NOW)).toBe(
      "1 more Adapt test of 25 words and we can tell which way you're heading.",
    );
    expect(trendSentence(headline("early", { gate: { have: 1, need: 2, unit: "sessions" } }), "wpm", kind, NOW)).toBe(
      "We'll call a trend once your recent tests span 2 sessions.",
    );
  });
  it("passes the copy rules in every branch", () => {
    const states: TrendState[] = ["improving", "steady", "levelled", "slipping", "early"];
    const why: (FrictionKey | null)[] = [null, "fixing", "before", "inside"];
    for (const st of states) {
      for (const e of why) {
        clean(trendSentence(headline(st, { deltaWpm: 1, sinceMs: NOW - DAY, weeks: 3, explanation: e }), "wpm", kind, NOW));
      }
    }
    expect(trendSentence(headline("levelled", { weeks: 3 }), "wpm", kind, NOW)).toBe(
      "You've stayed around 72 wpm for about 3 weeks.",
    );
  });
});

function barrier(kindB: BarrierKind, variant: BarrierVariant, detail: Partial<Extract<NextStep, { kind: "barrier" }>["detail"]> = {}): NextStep {
  return {
    kind: "barrier", barrier: kindB, variant, detail, recent: 4.5, better: 1.2, gain: { low: 3, high: 5 },
    action: { kind: "drill", drillId: "tricky" }, alternatives: [],
  };
}

describe("next step copy", () => {
  // The fixing barrier's copy has its own file: next-step-fixing.test.ts.
  it("writes each barrier's title and because", () => {
    const lw = barrier("before", "longWords", { pauseOneIn: [0.2, 0.1] });
    expect(nextStepTitle(lw)).toBe("Get ready for longer words");
    expect(nextStepBecause(lw, kind)).toBe(
      "You pause before about 1 in 5 words, more often before long ones. Let your eyes read the next word while you finish this one.",
    );
    const fl = barrier("before", "flat", { pauseOneIn: [0.25, 0.125] });
    expect(nextStepTitle(fl)).toBe("Keep moving between words");
    expect(nextStepBecause(fl, kind)).toBe(
      "You pause before about 1 in 4 words, against 1 in 8 on your better days. Short, common words help you flow from one to the next.",
    );
    const p = barrier("inside", "pair", { pair: "th" });
    expect(nextStepTitle(p)).toBe("Smooth out “th”");
    expect(nextStepBecause(p, kind)).toBe(
      "You stall partway through words, especially at “th”. Practising your slowest letter pairs trains exactly that.",
    );
    const inf = barrier("inside", "flat");
    expect(nextStepTitle(inf)).toBe("Type words in one go");
    expect(nextStepBecause(inf, kind)).toBe(
      "Hesitations inside words take you about 4.5 seconds of every minute, against 1.2 seconds on your better days.",
    );
  });
  it("compares how often you pause only when it rose", () => {
    expect(pauseShareRose({ pauseOneIn: [0.25, 0.125] })).toBe(true);
    expect(pauseShareRose({ pauseOneIn: [0.5, 0.2] })).toBe(true);
    // Equal, equal once written as "1 in N", or fewer pauses than on
    // better days: the pauses got longer, not more frequent.
    expect(pauseShareRose({ pauseOneIn: [0.2, 0.2] })).toBe(false);
    expect(pauseShareRose({ pauseOneIn: [0.2, 0.19] })).toBe(false);
    expect(pauseShareRose({ pauseOneIn: [0.5, 0.47] })).toBe(false);
    expect(pauseShareRose({ pauseOneIn: [0.17, 0.2] })).toBe(false);
    expect(pauseShareRose({})).toBe(false);
    // "about half" and "1 in 2" are the same step: no rise to report.
    expect(pauseShareRose({ pauseOneIn: [0.47, 0.43] })).toBe(false);
    expect(pauseShareRose({ pauseOneIn: [0.45, 0.41] })).toBe(false);
    expect(pauseShareRose({ pauseOneIn: [0.59, 0.42] })).toBe(false);
    // A real step up from half still counts.
    expect(pauseShareRose({ pauseOneIn: [0.65, 0.43] })).toBe(true);
    expect(pauseShareRose({ pauseOneIn: [0.45, 0.4] })).toBe(true);
    const perMinute =
      "Pauses before words take you about 4.5 seconds of every minute, against 1.2 seconds on your better days. Short, common words help you flow from one to the next.";
    const sameStep: [number, number][] = [[0.47, 0.43], [0.45, 0.41], [0.5, 0.44]];
    for (const pauseOneIn of [[0.2, 0.2], [0.2, 0.19], [0.5, 0.47], [0.17, 0.2], [0.05, 0.4], ...sameStep] as [number, number][]) {
      const s = barrier("before", "flat", { pauseOneIn });
      expect(nextStepTitle(s)).toBe("Keep moving between words");
      expect(nextStepBecause(s, kind), String(pauseOneIn)).toBe(perMinute);
      clean(nextStepBecause(s, kind));
    }
    expect(nextStepBecause(barrier("before", "flat"), kind)).toBe(perMinute);
    const small = { ...barrier("before", "flat", { pauseOneIn: [0.17, 0.2] }), recent: 0.6, better: 0.3 } as NextStep;
    expect(nextStepBecause(small, kind)).toBe(
      "Pauses before words take you about 0.6 seconds of every minute, against under half a second on your better days. Short, common words help you flow from one to the next.",
    );
    const half = barrier("before", "flat", { pauseOneIn: [0.97, 0.5] });
    expect(nextStepBecause(half, kind)).toBe(
      "You pause before almost all your words, against half on your better days. Short, common words help you flow from one to the next.",
    );
    clean(nextStepBecause(half, kind));
    const fromHalf = barrier("before", "flat", { pauseOneIn: [0.45, 0.4] });
    expect(nextStepBecause(fromHalf, kind)).toBe(
      "You pause before about half your words, against 1 in 3 on your better days. Short, common words help you flow from one to the next.",
    );
  });
  it("never compares two figures that both mean half", () => {
    const rates = Array.from({ length: 101 }, (_, i) => i / 100);
    let compared = 0;
    for (const a of rates) for (const b of rates) {
      const s = nextStepBecause(barrier("before", "flat", { pauseOneIn: [a, b] }), kind);
      if (!s.startsWith("You pause before")) continue;
      compared++;
      const halves = (s.match(/\bhalf\b|1 in 2\b/g) ?? []).length;
      expect(halves, `${a},${b}: ${s}`).toBeLessThan(2);
      expect(hedges(s), `${a},${b}: ${s}`).toBeLessThanOrEqual(1);
      clean(s);
    }
    expect(compared).toBeGreaterThan(0);
  });
  it("words the gain as a range, one number or an upper bound", () => {
    expect(gainLine(barrier("inside", "flat"), "wpm")).toBe("Typing like your better days is worth about 3 to 5 wpm.");
    const one = { ...barrier("inside", "flat"), gain: { low: 4, high: 4 } } as NextStep;
    expect(gainLine(one, "wpm")).toBe("Typing like your better days is worth about 4 wpm.");
    const small = { ...barrier("inside", "flat"), gain: { low: 0, high: 1 } } as NextStep;
    expect(gainLine(small, "wpm")).toBe("Typing like your better days is worth up to about 1 wpm.");
  });
  it("has copy for every step kind, and the learning count", () => {
    const step = (k: Exclude<NextStep["kind"], "barrier">, gate: Gate | null = null): NextStep =>
      ({ kind: k, action: { kind: "test" }, alternatives: [], gate });
    expect(nextStepTitle(step("levelled"))).toBe("Push a little past comfortable");
    expect(nextStepTitle(step("improving"))).toBe("Stretch to a longer test");
    expect(nextStepTitle(step("slipping"))).toBe("Take it easy for a test or two");
    expect(nextStepTitle(step("learning"))).toBe("Keep typing");
    expect(nextStepBecause(step("learning", { have: 7, need: 10, unit: "tests" }), kind)).toBe(
      "3 more Adapt tests of 25 words and we can show you what would help most.",
    );
    expect(gainLine(step("steady"), "wpm")).toBeNull();
    for (const k of ["levelled", "improving", "steady", "slipping", "learning"] as const) {
      heading(nextStepTitle(step(k)));
      clean(nextStepBecause(step(k, { have: 1, need: 2, unit: "sessions" }), kind));
      clean(nextStepBecause(step(k, { have: 9, need: 10, unit: "tests" }), kind));
    }
  });
  it("makes no claim about pauses or fixes without the analysis", () => {
    const step = (k: Exclude<NextStep["kind"], "barrier">, gate: Gate | null = null): NextStep =>
      ({ kind: k, action: { kind: "test" }, alternatives: [], gate });
    const off = { analysed: false };
    expect(nextStepBecause(step("improving"), kind, off)).toBe("Your speed is improving. A longer test shows how well it holds.");
    expect(nextStepBecause(step("levelled"), kind, off)).toBe(
      "A few tests slightly faster than feels comfortable is how speed grows from here, and some extra mistakes are fine.",
    );
    expect(nextStepBecause(step("learning", { have: 12, need: 15, unit: "tests" }), kind, off)).toBe(
      "3 more Adapt tests of 25 words and we can tell which way you're heading.",
    );
    for (const k of ["levelled", "improving", "steady", "slipping", "learning"] as const) {
      const s = nextStepBecause(step(k, { have: 1, need: 2, unit: "sessions" }), kind, off);
      clean(s);
      expect(s).not.toMatch(/nothing in particular|pauses and fixes|what would help most/i);
    }
  });
  it("passes the copy rules for every barrier branch, with and without details", () => {
    const cases: [BarrierKind, BarrierVariant][] = [
      ["fixing", "frequency"], ["fixing", "cost"], ["before", "longWords"], ["before", "flat"], ["inside", "pair"], ["inside", "flat"],
    ];
    const details = [{}, { perMin: [1, 1] as [number, number], costKeys: [1, 2] as [number, number], pauseOneIn: [0.5, 0.97] as [number, number], pair: "er" }];
    for (const [k, v] of cases) {
      for (const d of details) {
        for (const recent of [0.2, 4.5, 30]) {
          const s = { ...barrier(k, v, d), recent, better: recent / 3 } as NextStep;
          heading(nextStepTitle(s));
          clean(nextStepBecause(s, kind));
          clean(gainLine(s, "wpm")!);
        }
      }
    }
  });
});

describe("sentence length and hedges", () => {
  it("keeps every sentence of a shown next step to 20 words, with one about", () => {
    // A barrier is shown only when it costs at least half a second a
    // minute over better days, so recent is at least better + 0.5.
    const cases: [BarrierKind, BarrierVariant][] = [
      ["fixing", "frequency"], ["fixing", "cost"], ["before", "longWords"], ["before", "flat"], ["inside", "pair"], ["inside", "flat"],
    ];
    const details = [
      {},
      { perMin: [12.5, 0] as [number, number], costKeys: [14, 2] as [number, number], pauseOneIn: [0.25, 0.125] as [number, number], pair: "th" },
      { perMin: [0.4, 0.01] as [number, number], costKeys: [1.5, 1] as [number, number], pauseOneIn: [0.97, 0.005] as [number, number], pair: "er" },
    ];
    const words = (x: string) => x.trim().split(/\s+/).length;
    for (const [k, v] of cases) {
      for (const d of details) {
        for (const better of [0, 0.1, 0.4, 0.5, 1.2, 9.9, 29]) {
          for (const gap of [0.5, 0.9, 3.3, 30]) {
            const s = { ...barrier(k, v, d), recent: Math.min(60, better + gap), better } as NextStep;
            for (const sentence of nextStepBecause(s, kind).split(/(?<=[.!?”])\s+/)) {
              expect(words(sentence), sentence).toBeLessThanOrEqual(20);
              expect(hedges(sentence), sentence).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    }
  });
});

describe("actions", () => {
  it("names the drill or the test, and links to it", () => {
    expect(actionLabel({ kind: "drill", drillId: "tricky" })).toBe("Start Tongue-twister gauntlet");
    expect(actionLabel({ kind: "test" })).toBe("Take a test");
    expect(actionHref({ kind: "drill", drillId: "top-100-sprint" })).toBe("/drills/top-100-sprint");
    expect(actionHref({ kind: "test" })).toBe("/");
    expect(alternativeLines({ kind: "drill", drillId: "pangrams" }).title).toBe("Pangram sprint");
    expect(alternativeLines({ kind: "drill", drillId: "pangrams" }).about).toMatch(/^Eight classic pangrams/);
    expect(alternativeLines({ kind: "drill", drillId: "nope" })).toEqual({ title: "nope", about: "" });
  });
});
