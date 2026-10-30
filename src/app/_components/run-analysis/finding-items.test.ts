import { describe, expect, it } from "vitest";
import { cloneAnalysisSource } from "@/app/live/_components/clone-source";
import { cloneState } from "@/app/live/_components/clone-state";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import { bannedPatterns } from "@/lib/copy-rules";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import type { LiveScreen } from "@/types/live";
import type { Finding, RunAnalysis } from "@/types/typing-analysis";
import { type CopyUnit, toPlain } from "./finding-copy";
import { findingItems, PARTIAL_NOTE, shownFindings } from "./finding-items";

const WPM: CopyUnit = { unit: "wpm", decimals: false };

const ALL: Finding[] = [
  { kind: "fixing", impactMs: 1500, ms: 1500, count: 2, worstWord: null, noticedLate: null },
  { kind: "left", impactMs: 1200, count: 1, lostWpm: 2, canFix: true },
  { kind: "before", impactMs: 1100, ms: 1100, count: 2, longest: null, longWords: false },
  { kind: "inside", impactMs: 900, ms: 900, count: 3, topWord: null },
  { kind: "fade", impactMs: 800, fromWpm: 80, toWpm: 70, lastSeconds: 10 },
  { kind: "startUp", impactMs: 700, words: 3, ms: 700 },
  { kind: "breaks", impactMs: 48_000, ms: 48_000, count: 1 },
];

type Shape = Pick<RunAnalysis, "findings" | "quality">;
const analysis = (findings: Finding[], partial: boolean): Shape => ({
  findings,
  quality: { capture: 1, replayOk: true, pace: "good", quantised: false, clockOk: true, partial, qwerty: false },
});
const leads = (a: Shape, pb: Parameters<typeof findingItems>[0]["pb"] = null) =>
  findingItems({ analysis: a, unit: WPM, pb }).map((c) => toPlain(c.lead));

describe("shownFindings", () => {
  it("passes every finding through on a whole run", () => {
    expect(shownFindings(analysis(ALL, false))).toEqual(ALL);
  });
  it("a partial view keeps only what its part shows, in the engine's order", () => {
    expect(shownFindings(analysis(ALL, true)).map((f) => f.kind)).toEqual(["fixing", "left", "before", "inside"]);
  });
  it("a partial view drops whole-test claims too", () => {
    const whole: Finding[] = [
      { kind: "even", impactMs: 0, mistakes: 0 },
      { kind: "short", impactMs: 0 },
      { kind: "clock", impactMs: 0 },
    ];
    for (const f of whole) expect(shownFindings(analysis([f], true))).toEqual([]);
  });
});

describe("findingItems", () => {
  it("a whole run lists the findings, after the PB line when it's a best", () => {
    const pb = { noun: "test of 25 words", wpm: 80, previousBest: null };
    const out = leads(analysis(ALL.slice(0, 2), false), pb);
    expect(out[0]).toBe("Your first test of 25 words. Now there's a best to beat.");
    expect(out).toHaveLength(3);
    expect(out).not.toContain(toPlain(PARTIAL_NOTE.lead));
  });
  it("a partial view opens with the note and never states a break, a start or an end", () => {
    const out = findingItems({ analysis: analysis(ALL, true), unit: WPM, pb: null });
    expect(out[0]).toBe(PARTIAL_NOTE);
    expect(out).toHaveLength(5);
    const text = out.map((c) => toPlain(c.lead)).join(" ");
    expect(text).not.toMatch(/stopped typing|get going|slowed down towards the end/);
  });
  it("a partial view whose findings all need the whole run shows the note alone", () => {
    expect(findingItems({ analysis: analysis([ALL[6]!], true), unit: WPM, pb: null })).toEqual([PARTIAL_NOTE]);
  });
  it("the PB line still comes first in a partial view", () => {
    const out = leads(analysis(ALL, true), { noun: "test of 25 words", wpm: 80, previousBest: undefined });
    expect(out[0]).toBe("Your best test of 25 words so far.");
    expect(out[1]).toBe(toPlain(PARTIAL_NOTE.lead));
  });
  it("the note keeps the copy rules (I11)", () => {
    expect(bannedPatterns(toPlain(PARTIAL_NOTE.lead))).toEqual([]);
    expect(bannedPatterns(toPlain(PARTIAL_NOTE.follow!))).toEqual([]);
  });
});

// The live clone's partial views, end to end: the source the watch page
// builds, the engine, then what the card lists.
const BEHAVIOUR: BehaviourPrefs = {
  quickRestart: false,
  stopOnError: false,
  confidence: "off",
  allowExtras: true,
  strictSpace: false,
  blindMode: false,
  minWordLength: 0,
  showSecondary: false,
  excludeCasualFromAdapt: false,
  burstThreshold: 0,
};
/** A done frame as the broadcaster sends it (live-screen-payload.ts). */
const frame = (over: Partial<LiveScreen>): LiveScreen => ({
  phase: "done",
  typed: [],
  cursorWord: 0,
  cursorChar: 3,
  mode: "WORDS",
  length: 10,
  quoteSource: null,
  elapsedMs: 10_000,
  raw: 60,
  adapt: false,
  events: [],
  ...over,
});
type Ev = NonNullable<LiveScreen["events"]>[number];
/** Clean keys for `words` from `t0`, `gap` ms apart, 200 ms between words. */
function keys(words: readonly string[], t0: number, gap: number, upTo = Infinity): Ev[] {
  const out: Ev[] = [];
  let t = t0;
  words.forEach((w, wi) => {
    for (const ch of w) {
      if (out.length >= upTo) return;
      out.push({ t, expected: ch, typed: ch, correct: true, wordIndex: wi });
      t += gap;
    }
    t += 200;
  });
  return out;
}
/** Builds the clone's source from a frame and lists what the card shows. */
function cloneItems(words: string[], screen: LiveScreen) {
  const s = cloneAnalysisSource({
    state: cloneState(words, screen, 5_000_000),
    behaviour: BEHAVIOUR,
    wordlist: "english",
    windowStart: screen.windowStart,
  })!;
  const a = analyseRun(s.input)!;
  return { a, out: findingItems({ analysis: a, unit: WPM, pb: null }) };
}

describe("a partial clone never states what it can't see", () => {
  const W = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", "and", "then",
    "some", "more", "words", "here", "for", "test", "again", "with", "them", "all"];

  it("a TIME window that starts at word 100: no break, start-up or slow-down finding", () => {
    // The last 20 words of a 60 s test: the window's keys run from 48 s
    // to 60 s on the run's clock, word indexes rebased to 0.
    const { a, out } = cloneItems(W, frame({ mode: "TIME", length: 60, elapsedMs: 60_000, typed: W, cursorWord: 19, events: keys(W, 48_000, 110), windowStart: 100 }));
    expect(a.quality.partial).toBe(true);
    // The engine puts the unseen 48 s head into Breaks: the hazard.
    expect(a.findings.some((f) => f.kind === "breaks")).toBe(true);
    const kinds = shownFindings(a).map((f) => f.kind);
    for (const k of ["breaks", "startUp", "fade", "even", "short", "clock"] as const) expect(kinds).not.toContain(k);
    expect(out[0]).toBe(PARTIAL_NOTE);
    expect(out.map((c) => toPlain(c.lead)).join(" ")).not.toMatch(/stopped typing|get going|towards the end/);
  });
  it("a done frame cut at 3,000 keys: the unseen tail isn't a break either", () => {
    // 300 eleven-letter words, keys cut at the cap; the test ran on after them.
    const long = Array.from({ length: 300 }, (_, i) => `abcdefghij${String.fromCharCode(97 + (i % 26))}`);
    const ev = keys(long, 0, 100, 3_000);
    const { a, out } = cloneItems(long, frame({ length: 300, elapsedMs: ev.at(-1)!.t + 40_000, typed: long, cursorWord: 299, events: ev, windowStart: 0 }));
    expect(a.quality.partial).toBe(true); // the engine's cap rule
    expect(shownFindings(a).some((f) => f.kind === "breaks" || f.kind === "fade")).toBe(false);
    expect(out[0]).toBe(PARTIAL_NOTE);
  });
});
