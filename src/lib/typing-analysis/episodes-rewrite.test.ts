import { describe, expect, it } from "vitest";
import type { RunInput, RunLengthMode } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { episodesV2 } from "./episodes";
import { noTruth, render, type Act } from "./run-script-core";
import { buildTimeline } from "./timeline";

/** A rewrite that ends without its deleted text typed again is no episode,
 *  and the keys typed while it was open read as they would without it
 *  (spec-10 §6.2). */

const LONG = "the quick brown fox jumps over the lazy dog and then runs back across the open field".split(" ");
const RUN = "the quick brown fox jumps over the lazy dog and ";
const eps = (r: RunInput) => episodesV2(buildTimeline(r), r.words);

/** " " Space, "<" Backspace, "^" Ctrl+Backspace, 120 ms a key. */
function run(keys: string, mode: RunLengthMode, T?: number) {
  const acts: Act[] = [...keys].map((c, i) =>
    c === " " ? { k: "space", t: i * 120 } : c === "<" ? { k: "back", t: i * 120 } : c === "^" ? { k: "back", t: i * 120, word: true } : { k: "char", t: i * 120, ch: c });
  const r = render({ words: LONG, acts, ctx: {}, lengthMode: mode, ...(mode === "time" ? { T: T ?? keys.length * 120 + 300 } : {}), truth: noTruth() });
  return { r, e: eps(r), a: analyseRun(r)! };
}
const shape = (e: ReturnType<typeof eps>) => e.map((x) => [x.kind, x.word, x.fixed]);

describe("the end of a TIME run: a rewrite counts only once the deleted text is typed again", () => {
  const end = (keys: string, T: number) => run(RUN + "then runs " + keys, "time", T);

  it("2a: two Backspaces on correct letters, never retyped: no episode, no fixing", () => {
    const { e, a } = end("ba<<", 9000);
    expect(e).toEqual([]);
    expect(a.mistakes).toMatchObject({ count: 0, rewrites: 0, fixingMs: 0 });
    expect(a.slices!.fixing).toBe(0);
    expect(a.findings.find((f) => f.kind === "fixing")).toBeUndefined();
  });

  it("2b: Ctrl+Backspace at the end: no episode, no fixing", () => {
    const { e, a } = end("bac^", 9500);
    expect(e).toEqual([]);
    expect(a.mistakes).toMatchObject({ rewrites: 0, fixingMs: 0 });
    expect(a.findings.find((f) => f.kind === "fixing")).toBeUndefined();
  });

  it("partly typed again is still no rewrite; typed again in full is one, closed on its key", () => {
    expect(end("bac<<<ba", 9500).e).toEqual([]);
    const { r, e, a } = end("bac<<<bac", 9500);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "rewrite", fixed: true, word: 12 });
    expect(e[0]!.b).toBeLessThan(r.timings.length);
    expect(a.mistakes.rewrites).toBe(1);
  });

  it("an open rewrite on a word you pressed Space after stays an unfixed rewrite", () => {
    const { e, a } = end("bac<<a ", 9500);
    expect(shape(e)).toEqual([["rewrite", 12, false]]);
    expect(a.slices!.fixing).toBeGreaterThan(0);
    expect(a.mistakes).toMatchObject({ rewrites: 0, left: 1 });
  });

  it("a slip deleted at the end of a TIME run still closes fixed with the tail", () => {
    const { r, e } = end("bx<", 9000);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "slip", fixed: true, b: r.timings.length });
  });

  describe("a wrong key inside a rewrite that the run ends on counts as it would without the rewrite", () => {
    it("left wrong: one unfixed slip from that key, never a clean run", () => {
      const { r, e, a } = end("ba<<x", 9500);
      const K = r.timings.length;
      expect(e).toEqual([expect.objectContaining({ kind: "slip", fixed: false, word: 12, a: K - 2, b: K - 1 })]);
      expect(a.mistakes).toMatchObject({ count: 1, fixed: 0, rewrites: 0 });
      // The same as a slip typed with no deletion before it.
      expect(end("bx", 9000).a.mistakes).toMatchObject({ count: 1, fixed: 0, rewrites: 0 });
      expect(a.findings.find((f) => f.kind === "even")).toMatchObject({ mistakes: 1 });
    });

    it("fixed inside it: a fixed slip closed on the fixing key", () => {
      const { r, e, a } = end("ba<<x<b", 9500);
      const K = r.timings.length;
      expect(e).toEqual([expect.objectContaining({ kind: "slip", fixed: true, word: 12, a: K - 3, b: K - 1 })]);
      expect(a.mistakes).toMatchObject({ count: 1, fixed: 1, rewrites: 0 });
    });

    it("deleted at the end: fixed with the tail, as a slip deleted at the end", () => {
      const { r, e } = end("ba<<x<", 9500);
      expect(e).toEqual([expect.objectContaining({ kind: "slip", fixed: true, b: r.timings.length })]);
    });

    it("one fixed and one left wrong: two slips", () => {
      const { e, a } = end("ba<<x<bx", 9500);
      expect(e.map((x) => [x.kind, x.fixed])).toEqual([["slip", true], ["slip", false]]);
      expect(a.mistakes).toMatchObject({ count: 2, fixed: 1, rewrites: 0 });
    });

    it("a wrong key typed before you moved on still counts when you come back to the word", () => {
      // "bac", Backspace, a wrong "x", Space, "a", then back into "bax".
      const { e, a } = run(RUN + "then runs bac<x a<<", "time");
      expect(shape(e)).toEqual([["slip", 12, false]]);
      expect(a.mistakes).toMatchObject({ count: 1, rewrites: 0 });
      // The same as with no deletion before it.
      expect(shape(run(RUN + "then runs bax a<<", "time").e)).toEqual([["slip", 12, false]]);
      expect(a.findings.find((f) => f.kind === "even")).toMatchObject({ mistakes: 1 });
    });

    it("an inner slip's needed is taken at its fixing key, as with no rewrite", () => {
      const needed = (keys: string) => end(keys, 9500).e.map((x) => [x.kind, x.fixed, x.needed]);
      expect(needed("bac<<x<a<<")).toEqual([["slip", true, 1]]);
      expect(needed("bx<a<<")).toEqual([["slip", true, 1]]);
    });

    it("randomKeys 521 (\"flin\" deleted, then 11 wrong keys) is not read as a clean run", async () => {
      const { randomKeys } = await import("./run-keys");
      const r = randomKeys(521);
      expect(eps(r).map((x) => [x.kind, x.fixed])).toEqual([["slip", true], ["slip", false]]);
      const a = analyseRun(r)!;
      expect(a.mistakes).toMatchObject({ count: 2, fixed: 1, rewrites: 0 });
      expect(a.findings.find((f) => f.kind === "even")).toMatchObject({ mistakes: 2 });
    });

    it("randomKeys 11511 and 16201 (a rewrite left, reopened, then ended by the run) keep their wrong keys", async () => {
      const { randomKeys } = await import("./run-keys");
      for (const [seed, last] of [[11511, 2], [16201, 4]] as const) {
        expect(eps(randomKeys(seed)).at(-1)).toMatchObject({ kind: "slip", word: last, fixed: false });
      }
    });
  });
});

describe("crossing back out of a rewrite's word ends the rewrite", () => {
  // "then" (word 10) is left as "th"; "runs" (word 11) is started, then
  // deleted on the way back into "th".
  const BACK = RUN + "th runs<<<<<";
  const REST = " runs back across the open field";

  it("wrong keys typed in the earlier word are a slip there (TIME, the run ends after a Space)", () => {
    const { e, a } = run(RUN + "th r<<xy ", "time");
    expect(shape(e)).toEqual([["slip", 10, false]]);
    expect(a.mistakes).toMatchObject({ count: 1, rewrites: 0, left: 1 });
    // The same as with no deletion before it.
    expect(run(RUN + "th <xy ", "time").a.mistakes).toMatchObject({ count: 1, rewrites: 0, left: 1 });
  });

  it("a wrong key fixed in the earlier word is a fixed slip, and typing the later word again is no rewrite", () => {
    const { r, e, a } = run(BACK + "x<en" + REST, "words");
    expect(shape(e)).toEqual([["slip", 10, true]]);
    expect(r.timings[e[0]!.b]!.wordIndex).toBe(10);
    expect(a.mistakes).toMatchObject({ count: 1, fixed: 1, rewrites: 0 });
  });

  it("going back through a correct word to finish a skipped one is no episode", () => {
    const { e, a } = run(BACK + "en" + REST, "words");
    expect(e).toEqual([]);
    expect(a.mistakes).toMatchObject({ count: 0, rewrites: 0, fixingMs: 0 });
  });

  it("a slip typed and fixed inside the rewrite stays a fixed slip, closed on its fixing key", () => {
    // "ru", a wrong "x", deleted, "n": fixed. Then back into "th".
    const { r, e, a } = run(RUN + "th runs<<x<n<<<<en" + REST, "words");
    expect(shape(e)).toEqual([["slip", 11, true]]);
    expect(r.timings[e[0]!.b]!.typed).toBe("n");
    expect(a.mistakes).toMatchObject({ count: 1, fixed: 1, rewrites: 0 });
    // Then a wrong key in the earlier word, left when the TIME run ends, is its own slip.
    const t = run(RUN + "th runs<<x<n<<<<ex ", "time");
    expect(shape(t.e)).toEqual([["slip", 11, true], ["slip", 10, false]]);
    expect(t.a.mistakes).toMatchObject({ count: 2, fixed: 1, rewrites: 0 });
  });

  it("a deleted wrong key still waiting for its fix carries on, as with no rewrite", () => {
    const withRewrite = run(RUN + "th runs<<x<<<<en" + REST, "words");
    const without = run(RUN + "th rux<<<<en" + REST, "words");
    expect(shape(withRewrite.e)).toEqual([["slip", 11, true]]);
    expect(shape(without.e)).toEqual(shape(withRewrite.e));
    expect(withRewrite.a.mistakes).toMatchObject({ count: 1, fixed: 1, rewrites: 0 });
  });

  it("a cross edit back into the rewrite's own word keeps it open", () => {
    // "bac", delete "c", Space, then Backspace back into "ba": the edit lands
    // on the rewrite's own word, so typing "ck" again fixes it.
    const words = run(RUN + "then runs bac< <ck across the open field", "words");
    expect(shape(words.e)).toEqual([["rewrite", 12, true]]);
    expect(words.a.mistakes).toMatchObject({ rewrites: 1 });
    const time = run(RUN + "then runs bac< <ck", "time");
    expect(shape(time.e)).toEqual([["rewrite", 12, true]]);
    expect(time.a.mistakes).toMatchObject({ rewrites: 1 });
  });
});
