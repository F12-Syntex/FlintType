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
    const seen = { movedOnFixed: 0, movedOnUnfixed: 0, endFixed: 0, endWrong: 0, endWrongBack: 0, rewrites: 0, unfixedRewrites: 0, cross: 0, fixingWithUnfixed: 0 };
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
      const committed = (w: number) => w < tl.wordsReached - 1 || r.lengthMode !== "time" || w < rep.cursor;
      // The highest word a key went to (past the passage, wordsReached is capped).
      const maxKey = tl.ev.reduce((m, e) => Math.max(m, e.wordIndex), -1);
      let prevB = -Infinity;
      for (const e of rep.episodes) {
        expect(e.b).toBeGreaterThan(e.a);
        expect(e.a).toBeGreaterThanOrEqual(prevB);
        prevB = e.b;
        if (e.kind === "rewrite") seen[e.fixed ? "rewrites" : "unfixedRewrites"]++;
        // A rewrite left unfixed is a word left wrong, so never the word still being typed.
        if (e.kind === "rewrite" && !e.fixed && maxKey <= e.word) expect(committed(e.word)).toBe(true);
        // Crossing back out of a rewrite's word ends it, so it never holds a key typed in an earlier word.
        if (e.kind === "rewrite") {
          const back = tl.ev.slice(e.a + 1, Math.min(e.b, tl.K - 1) + 1).some((x) => x.wordIndex < e.word);
          expect(back).toBe(false);
        }
        const target = wordAt(r.words, e.word);
        const final = rep.typed[e.word] ?? "";
        if (e.b === tl.K) {
          // Closed at the end: fixed only when the word isn't left wrong (lostOf's rule).
          // Never a rewrite: one typed again closes on its own key, and one
          // never typed again is no episode.
          expect(e.kind).not.toBe("rewrite");
          expect(e.fixed).toBe(true);
          expect(!committed(e.word) || final === target).toBe(true);
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
      // The word still being typed at the end of a TIME run, left wrong:
      // its wrong keys are an unfixed slip or extra, so the run never reads
      // as clean. With no key past it, that slip closes at K − 1. A key may
      // have gone past it and the cursor come back (then the slip may have
      // closed when you moved on). Skipped: a later word's mistake still
      // open at the end, which holds the keys typed after crossing back.
      const last = tl.wordsReached - 1;
      const laterOpen = rep.episodes.some((e) => e.word > last && e.b >= tl.K - 1);
      if (r.lengthMode === "time" && last >= 0 && !laterOpen && !committed(last) && !wordAt(r.words, last).startsWith(rep.typed[last] ?? "")) {
        const back = maxKey > last;
        expect(rep.episodes.some((e) => e.word === last && e.kind !== "rewrite" && !e.fixed && (back || e.b === tl.K - 1))).toBe(true);
        seen[back ? "endWrongBack" : "endWrong"]++;
      }
      const a = analyseRun(r);
      if (a?.slices) expect(SLICE_ORDER.reduce((x, k) => x + a.slices![k], 0)).toBe(a.T);
      if (a) expect(a.mistakes.rewrites).toBe(rep.episodes.filter((e) => e.kind === "rewrite" && e.fixed).length);
      // The fixing finding's count, time and worst word describe the same (fixed) episodes.
      const f = a?.findings.find((x) => x.kind === "fixing");
      if (a?.slices && f?.kind === "fixing") {
        const fixed = rep.episodes.filter((e) => e.fixed);
        expect(f.count).toBe(fixed.length);
        expect(f.ms).toBeLessThanOrEqual(a.slices.fixing);
        if (f.worstWord !== null) expect(fixed.map((e) => wordAt(r.words, e.word))).toContain(f.worstWord);
        expect(f.worstWord).not.toBe("");
        if (fixed.length === rep.episodes.length) expect(f.ms).toBe(a.mistakes.fixingMs);
        else seen.fixingWithUnfixed++;
      }
    }
    // The generator reaches the corners this test is about.
    for (const n of Object.values(seen)) expect(n).toBeGreaterThan(10);
  });
});
