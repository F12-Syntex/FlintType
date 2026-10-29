import { describe, expect, it } from "vitest";
import type { RunContext } from "@/types/capture";
import type { RunInput, RunLengthMode } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { episodesV2 } from "./episodes";
import { asV1, backIntoPrevious, extras, steady, withMistake } from "./run-script";
import { noTruth, render, type Act } from "./run-script-core";
import { buildTimeline } from "./timeline";

const WORDS = "the quick brown fox jumps over the lazy dog".split(" ");
const eps = (r: RunInput) => episodesV2(buildTimeline(r), r.words);

/** Keys as in replay.test: " " Space, "<" Backspace, "^" Ctrl+Backspace, 100 ms apart. */
function typed(words: string[], keys: string, o: { ctx?: RunContext; mode?: RunLengthMode; T?: number } = {}) {
  const acts: Act[] = [...keys].map((c, i) =>
    c === " " ? { k: "space", t: i * 100 } : c === "<" ? { k: "back", t: i * 100 } : c === "^" ? { k: "back", t: i * 100, word: true } : { k: "char", t: i * 100, ch: c });
  const mode = o.mode ?? "time";
  return render({ words, acts, ctx: o.ctx ?? {}, lengthMode: mode, ...(mode === "time" ? { T: o.T ?? keys.length * 100 } : {}), truth: noTruth() });
}

describe("v2 episodes", () => {
  it("a substitution fixed with one Backspace", () => {
    const e = eps(withMistake(steady(WORDS), { word: 1, pos: 2 }));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, needed: 1, word: 1, noticeKeys: 0 });
  });

  it("noticed two letters later with three Backspaces is one episode", () => {
    const e = eps(withMistake(steady(WORDS), { word: 2, pos: 1, noticeAfter: 2 }));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, needed: 1, noticeKeys: 2 });
  });

  it("a cascade of three wrong keys is one episode", () => {
    let r = withMistake(steady(WORDS), { word: 2, pos: 1, backspaces: 0 });
    r = withMistake(r, { word: 2, pos: 2, backspaces: 0 });
    r = withMistake(r, { word: 2, pos: 3, backspaces: 3 });
    expect(r.timings.filter((t) => !t.correct)).toHaveLength(3);
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ fixed: true, needed: 1 });
  });

  it("extras deleted then Space close at the next word's first key with needed 2", () => {
    const r = extras(steady(WORDS), { word: 3, n: 2, deleted: true });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "extra", fixed: true, needed: 2 });
    expect(r.timings[e[0]!.b]!.wordIndex).toBe(4);
  });

  it("a slip left in, then Space, is unfixed and its word is lost", () => {
    const r = withMistake(steady(WORDS), { word: 4, pos: 1, backspaces: 0 });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: false });
    expect(analyseRun(r)!.mistakes).toMatchObject({ left: 1, lostChars: "jumps".length + 1 });
  });

  it("fixed back in the previous word: the undone Space isn't needed", () => {
    const e = eps(backIntoPrevious(steady(WORDS), { word: 2 }));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, needed: 1, word: 2 });
  });

  it("going back: 'teh', Space, one letter, back into 'teh' and fix is one fixed slip, no rewrite", () => {
    const e = eps(typed(["the", "quick"], "teh q<<<<he quick"));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, word: 0 });
  });

  it("Ctrl+Backspace, wipe and retype: the retyped letters still alive at the fix are needed", () => {
    const e = eps(typed(["quick", "fox"], "quxx^quick fox"));
    expect(e).toHaveLength(1);
    // Closes at "i" (the buffer "qui" passes the slip's position); q, u, i are alive.
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, needed: 3, a: 1, b: 6 });
  });

  it("deleting correct text is a rewrite, counted apart from mistakes", () => {
    const r = typed(["quick", "brown", "fox"], "quic<<ick brown fox", { mode: "words" });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "rewrite", fixed: true });
    expect(analyseRun(r)!.mistakes).toMatchObject({ count: 0, rewrites: 1 });
  });

  it("extras deleted just before the run ends close fixed at b = K, taking the tail", () => {
    // (A WORDS run finishes on its last letter, so extras before a final
    // Space only happen in TIME: the timer ends right after the Space.)
    const r = typed(["the", "quick"], "thexx<< ", { T: 900 });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "extra", fixed: true, b: r.timings.length, needed: 1 });
  });

  it("the run ends mid-episode with the word still wrong: unfixed at K − 1", () => {
    const r = typed(["the", "quick"], "the qux");
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ fixed: false, b: r.timings.length - 1 });
  });

  it("records latency from the wrong key to the first Backspace", () => {
    const e = eps(withMistake(steady(WORDS), { word: 1, pos: 3, fixGapMs: 450 }));
    expect(e[0]!.latencyMs).toBeCloseTo(450, -1);
  });

  it("a blocked slip (stop on error) has no notice timing", () => {
    const e = eps(typed(["alpha", "bravo"], "alxpha bravo", { ctx: { stopOnError: true } }));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, needed: 1 });
    expect(e[0]!.noticeKeys).toBeUndefined();
  });

  it("a slip deleted, then an early Space: unfixed and left, as v1 says", () => {
    const r = typed(WORDS, "thx< quick brown fox", { mode: "words" });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: false, word: 0 });
    expect(analyseRun(r)!.mistakes).toMatchObject({ count: 1, fixed: 0, left: 1 });
    expect(analyseRun(asV1(r))!.mistakes).toMatchObject({ count: 1, fixed: 0, left: 1 });
  });

  it("three slips deleted and skipped: no fixing finding counts them", () => {
    const a = analyseRun(typed(WORDS, "thx< quixk< brown fox jumpx< over the lazy dog", { mode: "words" }))!;
    expect(a.mistakes).toMatchObject({ count: 3, fixed: 0, left: 3 });
    expect(a.findings.find((f) => f.kind === "fixing")).toBeUndefined();
  });

  it("going back to finish a skipped word reopens its slip and fixes it", () => {
    const r = typed(WORDS, "thx< q<<e quick brown", { mode: "words" });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, word: 0 });
    expect(analyseRun(r)!.mistakes).toMatchObject({ count: 1, fixed: 1, rewrites: 0, left: 0 });
  });

  it("a rewrite cut off by an early Space and a wrong key leaves no empty episode", () => {
    const r = typed(WORDS, "the< xuick brown fox", { mode: "words" });
    const e = eps(r);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", word: 1 });
    expect(analyseRun(r)!.mistakes).toMatchObject({ count: 1, rewrites: 0, left: 2 });
  });

  it("a rewrite left incomplete is unfixed and not counted as a rewrite", () => {
    const w = typed(["quick", "the", "quick", "brown"], "quick the< quick brown", { mode: "words" });
    const e = eps(w);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "rewrite", fixed: false, word: 1 });
    expect(e[0]!.b).toBeGreaterThan(e[0]!.a);
    expect(analyseRun(w)!.mistakes).toMatchObject({ count: 0, rewrites: 0, left: 1 });
  });

  it("at the end of a run: an incomplete word is fixed only while still in progress", () => {
    // TIME: the last word is in progress, so the deleted slip counts as fixed.
    const time = typed(["the", "quick"], "the qux<", { T: 900 });
    expect(eps(time)[0]).toMatchObject({ fixed: true, b: time.timings.length });
    // The timer ran out right after an early Space: that word is committed, so unfixed.
    const spaced = typed(["the", "quick"], "thx< ", { T: 600 });
    expect(eps(spaced)[0]).toMatchObject({ fixed: false, b: spaced.timings.length - 1 });
    expect(analyseRun(spaced)!.mistakes).toMatchObject({ fixed: 0, left: 1 });
  });

  it("spans are disjoint and ordered on random runs", async () => {
    const { randomScript } = await import("./run-script");
    for (let s = 0; s < 300; s++) {
      const r = randomScript(s);
      if (!r.edits) continue;
      const list = eps(r);
      for (let i = 1; i < list.length; i++) expect(list[i]!.a).toBeGreaterThanOrEqual(list[i - 1]!.b);
      for (const ep of list) expect(ep.needed).toBeGreaterThanOrEqual(0);
    }
  });
});
