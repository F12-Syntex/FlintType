import { describe, expect, it } from "vitest";
import { submitTestInputSchema } from "@/types/adapt";
import type { RunInput } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { submitToRunInput } from "./from-submit";
import { steady, withMistake, withPause } from "./run-script";

/** I8: the work stays bounded for any schema-valid payload. */

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field".split(" ");

/** A hand-built submit payload; `pos` follows a simple buffer model (capped at the schema's 4096). */
class Payload {
  t = 0;
  seq = 0;
  w = 0;
  len: number[] = [0];
  timings: object[] = [];
  edits: object[] = [];
  spaces: object[] = [];
  constructor(readonly words: string[], readonly dt: number) {}
  private mark(list: object[], extra: object = {}) {
    list.push({ t: (this.t += this.dt), at: this.timings.length, seq: this.seq++, wordIndex: this.w, pos: Math.min(4096, this.len[this.w] ?? 0), ...extra });
  }
  key(typed: string, expected: string, correct: boolean) {
    this.timings.push({ t: (this.t += this.dt), expected, typed, correct, wordIndex: this.w, pos: Math.min(4096, this.len[this.w] ?? 0) });
    this.len[this.w] = (this.len[this.w] ?? 0) + typed.length;
  }
  space() {
    this.mark(this.spaces);
    this.w++;
  }
  back() {
    this.mark(this.edits, { kind: "back" });
    this.len[this.w] = Math.max(0, (this.len[this.w] ?? 0) - 1);
  }
  crossBack() {
    this.mark(this.edits, { kind: "back", cross: true });
    this.w--;
  }
  input(): RunInput {
    return submitToRunInput(submitTestInputSchema.parse({
      startedAt: 1_000, completedAt: 1_000 + this.t + 100, mode: "casual", durationOrWordCount: this.words.length, lengthMode: "time",
      wpm: 30, accuracy: 90, errorCount: 0, resetCount: 0, wasCompleted: true,
      words: this.words, timings: this.timings, edits: this.edits, spaces: this.spaces, ctx: {},
    }))!;
  }
}

/** Review case B: one slip and a 14,900-key cascade in word 0, then 4,999
 *  keys in word 1, each followed by a Backspace crossing back into word 0
 *  (its episode reopens and closes again every time). */
function reviewCaseB(): RunInput {
  const p = new Payload(["abcd", "efgh", "ijkl"], 5);
  p.key("x", "a", false);
  for (let i = 0; i < 14_900; i++) p.key("y", "", false);
  p.space();
  for (let i = 0; i < 4_999; i++) {
    p.timings.push({ t: (p.t += 5), expected: "e", typed: "e", correct: true, wordIndex: 1, pos: 0 });
    p.edits.push({ t: (p.t += 5), at: p.timings.length, seq: p.seq++, wordIndex: 1, pos: 0, kind: "back", cross: true });
  }
  return p.input();
}

/** The same with consistent positions: a key, a Backspace, back into word 0, Space. */
function reopenCycles(): RunInput {
  const p = new Payload(["abcd", "efgh", "ijkl"], 5);
  p.key("x", "a", false);
  for (let i = 0; i < 9_000; i++) p.key("y", "", false);
  p.space();
  for (let i = 0; i < 2_499; i++) {
    p.key("e", "e", true);
    p.back();
    p.crossBack();
    p.space();
  }
  return p.input();
}

/** 1,600 unfixed rewrites, a long stretch, then back through them one by one, each closing again across the stretch. */
function nestedReopens(): RunInput {
  const n = 1_600;
  const p = new Payload(Array.from({ length: n + 2 }, () => "abcd"), 20);
  for (let i = 0; i < n; i++) {
    p.key("a", "a", true);
    p.key("b", "b", true);
    p.back();
    p.key("z", "b", false);
    p.space();
  }
  p.key("a", "a", true);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 2_700; i++) p.key("y", "y", true);
    if (j < 3) p.space();
  }
  for (let j = 0; j < 4; j++) p.crossBack();
  p.space();
  p.key("q", "q", true);
  while (p.edits.length < 4_996 && p.w > 1) {
    p.crossBack();
    p.crossBack();
    p.space();
    p.key("q", "q", true);
  }
  return p.input();
}

/** A 112,000-character buffer, then a key and a Backspace 2,900 times. */
function longBuffer(): RunInput {
  const p = new Payload(["abcd", "efgh"], 5);
  p.key("x", "a", false);
  for (let i = 0; i < 14_000; i++) p.key("yyyyyyyy", "", false);
  for (let i = 0; i < 2_900; i++) {
    p.key("y", "", true);
    p.back();
  }
  return p.input();
}

/** The fastest of three runs after a warm-up. */
function best(input: RunInput): number {
  analyseRun(input);
  let out = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    analyseRun(input);
    out = Math.min(out, performance.now() - t0);
  }
  return out;
}

describe("bounded work (I8)", () => {
  it("schema-valid extremes (a huge duration or word index) return at once", () => {
    const r = steady(WORDS);
    const viaSchema = (o: Record<string, unknown>) => submitToRunInput(submitTestInputSchema.parse({
      startedAt: 1_000, completedAt: 1_000 + r.durationMs, mode: "casual", durationOrWordCount: WORDS.length, lengthMode: "words",
      wpm: 30, accuracy: 98, errorCount: 0, resetCount: 0, wasCompleted: false, words: r.words, timings: r.timings,
      edits: r.edits, spaces: r.spaces, ctx: r.ctx, ...o,
    }))!;
    const hostile = (i: number, wordIndex: number) => r.timings.map((e, j) => (j === i ? { ...e, wordIndex } : e));
    for (const input of [
      viaSchema({ startedAt: 0, completedAt: 1e12 }),
      viaSchema({ startedAt: 0, completedAt: 3e10 }),
      viaSchema({ timings: hostile(5, 4e9) }),
      viaSchema({ timings: hostile(5, 30_000_000) }),
    ]) {
      expect(analyseRun(input)).toBeNull();
      expect(best(input)).toBeLessThan(50);
    }
    // Inside the bounds a hostile index is one replay mismatch, not a huge buffer.
    const deep = { ...r, timings: hostile(5, 99_999) };
    expect(best(deep)).toBeLessThan(50);
    expect(analyseRun(deep)!.counts.words).toBe(WORDS.length);
    const day = { ...r, durationMs: 86_400_000 };
    expect(best(day)).toBeLessThan(50);
    expect(analyseRun(day)!.breaks.count).toBe(1);
  });

  it("reopening, long buffers and nested detours stay as fast as a real 20,000-key run", () => {
    const words: string[] = [];
    for (let n = 0, i = 0; n < 20_000; i++) {
      words.push(WORDS[i % WORDS.length]!);
      n += WORDS[i % WORDS.length]!.length;
    }
    const real = withPause(withMistake(steady(words), { word: 50, pos: 1, noticeAfter: 1 }), { beforeWord: 90, ms: 900 });
    // 50 ms, or twice the real run on a slow machine (the quadratic paths took 0.4–1 s).
    const limit = Math.max(50, 2 * best(real));
    for (const input of [reviewCaseB(), reopenCycles(), nestedReopens(), longBuffer()]) {
      expect(input.edits?.length).toBeGreaterThan(2_000);
      expect(analyseRun(input)).not.toBeNull();
      expect(best(input)).toBeLessThan(limit);
    }
  });
});
