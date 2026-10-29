import { describe, expect, it } from "vitest";
import type { Finding, RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { findingsFor, type FindingInputs } from "./findings";
import { steady, withMistake, withPause } from "./run-script";
import { render, scriptOf } from "./run-script-core";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field to find a quiet place where light falls".split(" ");

const base = (o: Partial<FindingInputs> = {}): FindingInputs => ({
  P: 100, T: 20_000, wpm: 60, gate: "ok", quantised: false, fixMode: "fix",
  mistakes: { count: 0, fixed: 0, rewrites: 0, fixingMs: 0, left: 0, lostChars: 0, lostWpm: 0, canFix: true },
  fixingByWord: new Map(), words: ["alpha", "bravo", "charlie"], noticedLate: null,
  pauses: { count: 0, ms: 0, longest: null, byLength: [[10, 0], [10, 0], [10, 0]] },
  catches: { count: 0, ms: 0, topWord: null }, breaks: { count: 0, ms: 0 }, fade: null, startUp: null,
  ...o,
});
const kinds = (f: Finding[]) => f.map((x) => x.kind);
// minImpact here = max(4·100, 0.03·20000) = 600 ms.

describe("each finding fires at its threshold", () => {
  it("fixing", () => {
    const m = (ms: number) => base({ mistakes: { ...base().mistakes, count: 2, fixed: 2, fixingMs: ms } });
    expect(kinds(findingsFor(m(600)))).toEqual(["fixing"]);
    expect(kinds(findingsFor(m(599)))).toEqual(["even"]);
  });

  it("before: two pauses need minImpact, one needs twice that", () => {
    const p = (count: number, ms: number) => base({ pauses: { ...base().pauses, count, ms } });
    expect(kinds(findingsFor(p(2, 600)))).toEqual(["before"]);
    expect(kinds(findingsFor(p(2, 599)))).toEqual(["even"]);
    expect(kinds(findingsFor(p(1, 1199)))).toEqual(["even"]);
    expect(kinds(findingsFor(p(1, 1200)))).toEqual(["before"]);
  });

  it("inside needs two catches and minImpact, and never on a quantised clock", () => {
    const c = (count: number, ms: number, quantised = false) => base({ quantised, catches: { count, ms, topWord: "bravo" } });
    expect(kinds(findingsFor(c(2, 600)))).toEqual(["inside"]);
    expect(kinds(findingsFor(c(1, 900)))).toEqual(["even"]);
    expect(kinds(findingsFor(c(2, 599)))).toEqual(["even"]);
    expect(kinds(findingsFor(c(3, 900, true)))).toEqual(["even"]);
  });

  it("left needs a lost word worth a whole wpm; breaks need one in-run break", () => {
    const l = (lostWpm: number) => base({ mistakes: { ...base().mistakes, count: 1, left: 1, lostChars: 6, lostWpm } });
    expect(findingsFor(l(1))[0]).toMatchObject({ kind: "left", count: 1, lostWpm: 1, canFix: true });
    expect(kinds(findingsFor(l(0)))).toEqual(["even"]);
    expect(findingsFor(base({ breaks: { count: 1, ms: 3000 } }))[0]).toMatchObject({ kind: "breaks", count: 1, ms: 3000 });
  });

  it("fade and start-up carry their figures", () => {
    const f = findingsFor(base({ fade: { fromWpm: 80, toWpm: 68, lastSeconds: 20, significant: true }, startUp: { words: 4, ms: 900 } }));
    expect(f).toEqual([
      { kind: "fade", impactMs: 3000, fromWpm: 80, toWpm: 68, lastSeconds: 20 },
      { kind: "startUp", impactMs: 900, words: 4, ms: 900 },
    ]);
    expect(kinds(findingsFor(base({ fade: { fromWpm: 80, toWpm: 68, lastSeconds: 20, significant: false } })))).toEqual(["even"]);
  });

  it("minImpact is max(4P, 3% of T): a 12 s run at P = 200 with 0.3 s of catches says nothing about them", () => {
    expect(kinds(findingsFor(base({ P: 200, T: 12_000, catches: { count: 3, ms: 300, topWord: null } })))).toEqual(["even"]);
    expect(kinds(findingsFor(base({ P: 50, T: 60_000, catches: { count: 3, ms: 1700, topWord: null } })))).toEqual(["even"]);
  });
});

describe("ranking and the fallbacks", () => {
  it("keeps at most 3, by impact, ties in the fixed order", () => {
    const f = findingsFor(base({
      mistakes: { ...base().mistakes, count: 1, fixed: 1, fixingMs: 800, left: 1, lostChars: 30, lostWpm: 9 },
      pauses: { ...base().pauses, count: 3, ms: 800 }, catches: { count: 3, ms: 800, topWord: null }, breaks: { count: 1, ms: 5000 },
    }));
    expect(kinds(f)).toEqual(["breaks", "left", "fixing"]);
    const tie = findingsFor(base({ pauses: { ...base().pauses, count: 3, ms: 800 }, catches: { count: 3, ms: 800, topWord: null } }));
    expect(kinds(tie)).toEqual(["before", "inside"]);
  });

  it("even, short and clock", () => {
    expect(findingsFor(base())).toEqual([{ kind: "even", impactMs: 0, mistakes: 0 }]);
    expect(findingsFor(base({ mistakes: { ...base().mistakes, count: 2 } }))).toEqual([{ kind: "even", impactMs: 0, mistakes: 2 }]);
    expect(findingsFor(base({ P: null }))).toEqual([{ kind: "short", impactMs: 0 }]);
    expect(findingsFor(base({ gate: "short" }))).toEqual([{ kind: "short", impactMs: 0 }]);
    const clock = findingsFor(base({ gate: "clock", mistakes: { ...base().mistakes, count: 1, left: 1, lostChars: 6, lostWpm: 3 } }));
    expect(kinds(clock)).toEqual(["clock", "left"]);
  });

  it("backspace off never gives fixing; stop on error with backspace off can", () => {
    const m = { ...base().mistakes, count: 2, fixed: 2, fixingMs: 2000 };
    expect(kinds(findingsFor(base({ fixMode: "none", mistakes: m })))).toEqual(["even"]);
    expect(kinds(findingsFor(base({ fixMode: "block", mistakes: m })))).toEqual(["fixing"]);
    const blocked = analyseRun({ ...withMistake(steady(WORDS), { word: 3, pos: 1, fixGapMs: 900 }), ctx: { stopOnError: true, confidence: "all" } });
    expect(blocked!.mistakes.fixMode).toBe("block");
  });

  it("the fixing count includes rewrites, and worstWord needs half the fixing time and two of them", () => {
    const m = { ...base().mistakes, count: 1, fixed: 1, rewrites: 1, fixingMs: 1000 };
    const two = findingsFor(base({ mistakes: m, fixingByWord: new Map([[1, 500], [2, 500]]) }))[0];
    expect(two).toMatchObject({ kind: "fixing", count: 2, worstWord: "bravo" });
    const most = findingsFor(base({ mistakes: m, fixingByWord: new Map([[1, 400], [2, 600]]) }))[0];
    expect(most).toMatchObject({ worstWord: "charlie" });
    const spread = findingsFor(base({ mistakes: m, fixingByWord: new Map([[0, 300], [1, 300], [2, 400]]) }))[0];
    expect(spread).toMatchObject({ worstWord: null });
    const one = findingsFor(base({ mistakes: { ...m, rewrites: 0 }, fixingByWord: new Map([[1, 1000]]) }))[0];
    expect(one).toMatchObject({ count: 1, worstWord: null });
  });

  it("longWords: the long-word pause rate is at least twice the short one, with two long pauses", () => {
    const p = (bl: FindingInputs["pauses"]["byLength"]) => findingsFor(base({ pauses: { count: 4, ms: 2000, longest: null, byLength: bl } }))[0];
    expect(p([[20, 1], [10, 1], [10, 2]])).toMatchObject({ kind: "before", longWords: true });
    expect(p([[20, 4], [10, 1], [10, 2]])).toMatchObject({ longWords: false });
    expect(p([[20, 0], [10, 3], [10, 1]])).toMatchObject({ longWords: false });
  });

  it("longWords needs boundaries into short words to compare against", () => {
    const p = (bl: FindingInputs["pauses"]["byLength"]) => findingsFor(base({ pauses: { count: 3, ms: 2000, longest: null, byLength: bl } }))[0];
    expect(p([[0, 0], [0, 0], [29, 3]])).toMatchObject({ kind: "before", longWords: false });
    expect(p([[2, 0], [0, 0], [29, 3]])).toMatchObject({ longWords: false });
    expect(p([[3, 0], [0, 0], [29, 3]])).toMatchObject({ longWords: true });
    // A passage of long words only, end to end.
    const w = "together business anything everyone important something brilliant knowledge different questions".split(" ");
    let r = steady([...w, ...w, ...w]);
    for (const b of [3, 9, 17]) r = withPause(r, { beforeWord: b, ms: 1500 });
    const a = analyseRun(r)!;
    expect(a.pauses.byLength[0]).toEqual([0, 0]);
    expect(a.findings.find((f) => f.kind === "before")).toMatchObject({ longWords: false });
  });
});

/** Scales every clock reading of a run by f (all gaps scaled). */
function scaled(r: RunInput, f: number): RunInput {
  const sc = scriptOf(r);
  return render({ ...sc, acts: sc.acts.map((a) => ({ ...a, t: a.t * f })) });
}
const summary = (r: RunInput) => analyseRun(r)!.findings.map((x) => [x.kind, "count" in x ? x.count : null]);

describe("I13: speed invariance", () => {
  it("the same 25-word script at 45 wpm and 220 wpm gives the same findings", () => {
    let slow = steady(WORDS.slice(0, 25), { key: 240, gap: 480, jitter: 12 });
    slow = withMistake(slow, { word: 3, pos: 2, noticeAfter: 1, fixGapMs: 700 });
    slow = withMistake(slow, { word: 9, pos: 1, fixGapMs: 900 });
    slow = withMistake(slow, { word: 15, pos: 2, backspaces: 0 });
    for (const w of [5, 12, 19]) slow = withPause(slow, { beforeWord: w, ms: 1700 });
    for (const w of [7, 17]) slow = withPause(slow, { insideWord: [w, 1], ms: 800 });
    const a = analyseRun(slow)!;
    expect(a.pace!.P).toBeGreaterThan(200);
    const fast = scaled(slow, 45 / 220);
    const b = analyseRun(fast)!;
    expect(b.pace!.P).toBeLessThan(55);
    expect(summary(fast)).toEqual(summary(slow));
    expect(summary(slow).length).toBeGreaterThanOrEqual(2);
  });
});
