import { describe, expect, it } from "vitest";
import { SLICE_ORDER } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { replayEpisodes } from "./episodes";
import { randomKeys } from "./run-keys";
import { buildTimeline, wordAt, type Timeline } from "./timeline";

/** Nothing after char event c touches word w: no key or mark in it, and
 *  no Backspace crossing into it. */
function untouchedAfter(tl: Timeline, w: number, c: number): boolean {
  for (let k = c + 1; k < tl.K; k++) if (tl.ev[k]!.wordIndex <= w) return false;
  for (let g = c + 1; g <= tl.K; g++) {
    for (const m of tl.marks[g]!) {
      const wi = m.kind === "space" ? m.s.wordIndex : m.e.wordIndex;
      if (wi <= w || (m.kind === "edit" && m.e.cross === true && wi <= w + 1)) return false;
    }
  }
  return true;
}

describe("v2 episodes on key-level random runs (reducer rules)", () => {
  it("replay exact, spans never empty, and a fix never leaves its word wrong", () => {
    const seen = { movedOnFixed: 0, movedOnUnfixed: 0, endFixed: 0, rewrites: 0, unfixedRewrites: 0, cross: 0 };
    for (let s = 0; s < 1500; s++) {
      const r = randomKeys(s);
      if (r.timings.length < 2) continue;
      const tl = buildTimeline(r);
      expect(tl.capture).toBe(2);
      const rep = replayEpisodes(tl, r.words);
      expect(rep.mismatches).toBe(0);
      // typedFinal stops at the cursor's word; slots past it (a Space, then back) are empty.
      expect(rep.typed.slice(0, r.typedFinal!.length)).toEqual(r.typedFinal);
      expect(rep.typed.slice(r.typedFinal!.length).every((b) => b === "")).toBe(true);
      if (r.edits!.some((e) => e.cross)) seen.cross++;
      let prevB = -Infinity;
      for (const e of rep.episodes) {
        expect(e.b).toBeGreaterThan(e.a);
        expect(e.a).toBeGreaterThanOrEqual(prevB);
        prevB = e.b;
        if (e.kind === "rewrite") seen[e.fixed ? "rewrites" : "unfixedRewrites"]++;
        const target = wordAt(r.words, e.word);
        const final = rep.typed[e.word] ?? "";
        if (e.b === tl.K) {
          // Closed at the end: fixed only when the word isn't left wrong (lostOf's rule).
          const committed = e.word < tl.wordsReached - 1 || r.lengthMode !== "time" || e.word < rep.cursor;
          expect(e.fixed).toBe(true);
          expect(!committed || final === target).toBe(true);
          seen.endFixed++;
          continue;
        }
        if (tl.ev[e.b]!.wordIndex > e.word) {
          // Closed by a key in a later word. If it never came back, it is
          // fixed exactly when the word was typed in full.
          if (!untouchedAfter(tl, e.word, e.b)) continue;
          expect(final === target).toBe(e.fixed);
          seen[e.fixed ? "movedOnFixed" : "movedOnUnfixed"]++;
        } else if (!e.fixed && e.b + 1 < tl.K && tl.ev[e.b + 1]!.wordIndex > e.word && untouchedAfter(tl, e.word, e.b + 1)) {
          // Cut off by the next word's slip (a fixed one here may have closed in its own word).
          expect(final).not.toBe(target);
          seen.movedOnUnfixed++;
        }
      }
      const a = analyseRun(r);
      if (a?.slices) expect(SLICE_ORDER.reduce((x, k) => x + a.slices![k], 0)).toBe(a.T);
      if (a) expect(a.mistakes.rewrites).toBe(rep.episodes.filter((e) => e.kind === "rewrite" && e.fixed).length);
    }
    // The generator reaches the corners this test is about.
    for (const n of Object.values(seen)) expect(n).toBeGreaterThan(10);
  });
});
