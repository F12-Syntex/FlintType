import { describe, expect, it } from "vitest";
import type { Finding, RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import type { Episode } from "./episodes";
import { findingsFor, fixedFixing, type FindingInputs } from "./findings";
import { prepareRun } from "./prepare";
import { asV1, steady, withMistake, withPause } from "./run-script";
import { noTruth, render, scriptOf, type Act } from "./run-script-core";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field to find a quiet place where light falls".split(" ");

const base = (o: Partial<FindingInputs> = {}): FindingInputs => ({
  P: 100, T: 20_000, wpm: 60, gate: "ok", quantised: false, fixMode: "fix",
  mistakes: { count: 0, fixed: 0, rewrites: 0, left: 0, lostChars: 0, lostWpm: 0, canFix: true },
  fixed: { ms: 0, byWord: new Map() }, words: ["alpha", "bravo", "charlie"], noticedLate: null,
  pauses: { count: 0, ms: 0, longest: null, byLength: [[10, 0], [10, 0], [10, 0]] },
  catches: { count: 0, ms: 0, topWord: null }, breaks: { count: 0, ms: 0 }, fade: null, startUp: null,
  ...o,
});
const kinds = (f: Finding[]) => f.map((x) => x.kind);
// minImpact here = max(4·100, 0.03·20000) = 600 ms.

describe("each finding fires at its threshold", () => {
  it("fixing", () => {
    const m = (ms: number) => base({ mistakes: { ...base().mistakes, count: 2, fixed: 2 }, fixed: { ms, byWord: new Map() } });
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

  it("inside: two catches need minImpact, one needs twice that, never on a quantised clock", () => {
    const c = (count: number, ms: number, quantised = false) => base({ quantised, catches: { count, ms, topWord: "bravo" } });
    expect(kinds(findingsFor(c(2, 600)))).toEqual(["inside"]);
    expect(kinds(findingsFor(c(1, 900)))).toEqual(["even"]);
    expect(kinds(findingsFor(c(1, 1199)))).toEqual(["even"]);
    expect(kinds(findingsFor(c(1, 1200)))).toEqual(["inside"]);
    expect(kinds(findingsFor(c(1, 1200, true)))).toEqual(["even"]);
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
      mistakes: { ...base().mistakes, count: 1, fixed: 1, left: 1, lostChars: 30, lostWpm: 9 }, fixed: { ms: 800, byWord: new Map() },
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
    const m = { ...base().mistakes, count: 2, fixed: 2 };
    const fixed = { ms: 2000, byWord: new Map() };
    expect(kinds(findingsFor(base({ fixMode: "none", mistakes: m, fixed })))).toEqual(["even"]);
    expect(kinds(findingsFor(base({ fixMode: "block", mistakes: m, fixed })))).toEqual(["fixing"]);
    const blocked = analyseRun({ ...withMistake(steady(WORDS), { word: 3, pos: 1, fixGapMs: 900 }), ctx: { stopOnError: true, confidence: "all" } });
    expect(blocked!.mistakes.fixMode).toBe("block");
  });

  it("the fixing count includes rewrites, and worstWord needs half the fixing time and two of them", () => {
    const m = { ...base().mistakes, count: 1, fixed: 1, rewrites: 1 };
    const by = (byWord: [number, number][]) => ({ ms: 1000, byWord: new Map(byWord) });
    const two = findingsFor(base({ mistakes: m, fixed: by([[1, 500], [2, 500]]) }))[0];
    expect(two).toMatchObject({ kind: "fixing", count: 2, worstWord: "bravo" });
    const most = findingsFor(base({ mistakes: m, fixed: by([[1, 400], [2, 600]]) }))[0];
    expect(most).toMatchObject({ worstWord: "charlie" });
    const spread = findingsFor(base({ mistakes: m, fixed: by([[0, 300], [1, 300], [2, 400]]) }))[0];
    expect(spread).toMatchObject({ worstWord: null });
    const one = findingsFor(base({ mistakes: { ...m, rewrites: 0 }, fixed: by([[1, 1000]]) }))[0];
    expect(one).toMatchObject({ count: 1, worstWord: null });
    // A word index past the passage (a TIME run that ended after going back) names no word.
    const past = findingsFor(base({ mistakes: m, fixed: by([[1, 200], [5, 800]]) }))[0];
    expect(past).toMatchObject({ kind: "fixing", worstWord: null });
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

describe("the fixing finding describes the fixed mistakes only", () => {
  const ep = (word: number, fixed: boolean, kind: Episode["kind"] = "slip"): Episode => ({ a: 0, b: 1, word, kind, fixed, needed: 1 });

  it("fixedFixing: time and words from the fixed episodes; the slice itself when nothing is unfixed", () => {
    // The slice itself, not the rounded sum (800): the slice's own rounding gave it 801.
    const all = fixedFixing([ep(0, true), ep(2, true, "rewrite")], [300.2, 500.2], 801);
    expect(all.ms).toBe(801);
    // An unfixed episode that cost nothing changes nothing.
    expect(fixedFixing([ep(0, true), ep(1, false), ep(2, true)], [300.2, 0, 500.2], 801).ms).toBe(801);
    expect([...all.byWord]).toEqual([[0, 300.2], [2, 500.2]]);
    const some = fixedFixing([ep(0, true), ep(1, false), ep(2, true, "extra")], [300.4, 1980, 179.9], 2460);
    expect(some.ms).toBe(480);
    expect([...some.byWord.keys()]).toEqual([0, 2]);
    // Never more than the slice (reconcile can take from fixing), and 0 without a budget.
    expect(fixedFixing([ep(0, true), ep(1, false)], [900, 50], 700).ms).toBe(700);
    expect(fixedFixing([ep(0, true), ep(1, false)], [], 0).ms).toBe(0);
  });

  const WORDS2 = "the quick brown fox jumps over the lazy dog and then runs back across the open field and on to the river bank".split(" ");
  const TAIL = " over the lazy dog and then runs back across the open field and on to the river bank";
  /** " " Space, "<" Backspace, "|" a 1.5 s wait; 120 ms a key. */
  function typed(keys: string): RunInput {
    const acts: Act[] = [];
    let t = 0;
    for (const c of keys) {
      if (c === "|") {
        t += 1500;
        continue;
      }
      acts.push(c === " " ? { k: "space", t } : c === "<" ? { k: "back", t } : { k: "char", t, ch: c });
      t += 120;
    }
    return render({ words: WORDS2, acts, ctx: {}, lengthMode: "words", truth: noTruth() });
  }
  /** The finding's figures against the fixed episodes' own costs. */
  function check(r: RunInput) {
    const a = analyseRun(r)!;
    const { episodes, budget } = prepareRun(r);
    const fixedCost = Math.round(episodes.reduce((s, e, i) => s + (e.fixed ? budget!.episodeCost[i]! : 0), 0));
    const f = a.findings.find((x) => x.kind === "fixing");
    expect(a.mistakes).toMatchObject({ count: 3, fixed: 2, left: 1 });
    expect(fixedCost).toBeLessThan(a.mistakes.fixingMs);
    expect(f).toMatchObject({ kind: "fixing", count: 2, ms: fixedCost, impactMs: fixedCost });
    expect(f).not.toMatchObject({ worstWord: "jumps" });
    return f;
  }

  it("1a: a slip deleted and then skipped is never where the fixing time went", () => {
    const r = typed("tx<he qx<uick brown fox jumx|<<<" + TAIL);
    expect(check(r)).toMatchObject({ ms: 480, worstWord: "the" });
    const v1 = analyseRun(asV1(r))!.findings.find((x) => x.kind === "fixing");
    expect(v1).toMatchObject({ kind: "fixing", count: 2, worstWord: "the" });
  });

  it("1b: a wrong letter, a hesitation and Space is not fixing time", () => {
    expect(check(typed("tx<he qx<uick brown fox jumx|" + TAIL))).toMatchObject({ ms: 480, worstWord: "the" });
  });

  it("a slow fix that fires names its own word, not the word left wrong", () => {
    const f = check(typed("tx|<he qx<uick brown fox jumx|<<<" + TAIL));
    expect(f).toMatchObject({ kind: "fixing", count: 2, worstWord: "the" });
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
