import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
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
