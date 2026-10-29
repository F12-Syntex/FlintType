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
      "You stall partway through words for about 4.5 seconds of every minute, against about 1.2 seconds on your better days.",
    );
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
