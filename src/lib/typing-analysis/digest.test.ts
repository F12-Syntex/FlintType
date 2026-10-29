import { describe, expect, it } from "vitest";
import { SLICE_ORDER, type DigestContext, type RunAnalysis, type RunInput, type TestDigestV1 } from "@/types/typing-analysis";
import { analyseRun } from "./analyse";
import { digestContext } from "./context";
import { buildDigest, bytesOf, parseDigest } from "./digest";
import { randomScript, steady, timeRun, withMistake, withPause } from "./run-script";

const WORDS = "the quick brown fox jumps over the lazy dog and then runs back across the open field to find a quiet place".split(" ");
const ctx = (o: Partial<DigestContext> = {}): DigestContext => ({ ...digestContext({ wordlist: "english" }, "keyboard", true, true), ...o });

function typical(): { a: RunAnalysis; r: RunInput } {
  let r: RunInput = { ...steady(WORDS), ctx: { codeMatch: 1 } };
  r = withMistake(withMistake(r, { word: 2, pos: 1, noticeAfter: 1 }), { word: 9, pos: 0 });
  r = withPause(withPause(r, { beforeWord: 5, ms: 900 }), { insideWord: [12, 1], ms: 450 });
  return { a: analyseRun(r)!, r };
}
const digestOf = (a: RunAnalysis, r: RunInput, c = ctx(), tracked: string[] = []) =>
  buildDigest(a, { acc: 97.25, wpm: r.wpm, trackedPairs: tracked, diff: 1.0834, ctx: c });

/** Every string value in a JSON tree, with its path. */
function strings(x: unknown, path = ""): [string, string][] {
  if (typeof x === "string") return [[path, x]];
  if (Array.isArray(x)) return x.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return [];
}

describe("buildDigest", () => {
  it("stores integer slices that sum to ms, and the run's figures", () => {
    const { a, r } = typical();
    const d = digestOf(a, r);
    expect(d.sl.reduce((s, v) => s + v, 0)).toBe(d.ms);
    expect(d.sl).toEqual(SLICE_ORDER.map((k) => a.slices![k]));
    expect(d).toMatchObject({ v: 1, ms: a.T, acc: 97.3, diff: 1.083, q: 0, keys: a.counts.keys, words: a.counts.words });
    expect(d.chars).toBe(Math.round((r.wpm * a.T) / 12000));
    expect(d.err).toMatchObject({ n: a.mistakes.count, rw: a.mistakes.rewrites, nk: a.mistakes.noticeKeys });
    expect(d.iw).toBe(a.inWordShare);
    expect(d.fin).not.toBeNull();
  });

  it("a typical default run is under 1.8 KB", () => {
    const { a, r } = typical();
    expect(bytesOf(digestOf(a, r))).toBeLessThan(1800);
  });

  it("a 600 s TIME run at 200 wpm stays within 4,096 bytes", () => {
    const words = Array.from({ length: 2200 }, (_, i) => WORDS[(i * 7) % WORDS.length]!);
    let r: RunInput = { ...steady(words, { key: 60, gap: 120 }), ctx: { codeMatch: 1, wordlist: "x".repeat(64) } };
    for (let w = 3; w < 2000; w += 41) r = withMistake(r, { word: w, pos: 1, noticeAfter: 1 });
    r = timeRun(r, 600_000);
    const a = analyseRun(r)!;
    expect(a.T).toBe(600_000);
    const d = digestOf(a, r, ctx({ wordlist: "x".repeat(64) }), Object.keys(a.cells.pairs).slice(-8));
    expect(bytesOf(d)).toBeLessThanOrEqual(4096);
    expect(d.pairs.length).toBe(16);
  });

  it("sheds pairs, then fin, then cls, then ip to fit", () => {
    const { a, r } = typical();
    const full = digestOf(a, r);
    const pad = (target: number) => ctx({ wordlist: "w".repeat(Math.max(0, 4096 - bytesOf(full) + target)) });
    const shedPairs = digestOf(a, r, pad(10));
    expect(shedPairs.pairs).toEqual([]);
    expect(shedPairs.fin).not.toBeNull();
    const pairsBytes = bytesOf(full) - bytesOf({ ...full, pairs: [] });
    const shedFin = digestOf(a, r, pad(pairsBytes + 10));
    expect(shedFin.pairs).toEqual([]);
    expect(shedFin.fin).toBeNull();
    expect(Object.keys(shedFin.cls).length).toBeGreaterThan(0);
  });

  it("pairs: the tracked pairs plus the 8 most frequent, n ≥ 2, at most 16", () => {
    const { a, r } = typical();
    const counts = Object.entries(a.cells.pairs).sort((x, y) => y[1][0] - x[1][0]);
    const rare = counts.filter(([, c]) => c[0] >= 2).slice(-9).map(([k]) => k);
    const d = digestOf(a, r, ctx(), [...rare, "zz", "q"]);
    const keys = d.pairs.map((p) => p[0]);
    expect(keys.length).toBeLessThanOrEqual(16);
    expect(keys.slice(0, rare.length)).toEqual(rare.slice(0, 16));
    expect(keys).not.toContain("zz");
    for (const p of d.pairs) expect(p[1]).toBeGreaterThanOrEqual(2);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("fin is null on a non-standard hand layout", () => {
    const { a, r } = typical();
    expect(digestOf(a, r, ctx({ std: false })).fin).toBeNull();
  });

  it("I4: no string longer than 2 characters but the layout, wordlist and enum values; no passage word", () => {
    for (let s = 0; s < 200; s++) {
      const r = randomScript(s);
      const a = analyseRun(r);
      if (!a?.slices) continue;
      const d = buildDigest(a, { acc: 95, wpm: r.wpm, trackedPairs: ["th", "he"], diff: null, ctx: digestContext(r.ctx, "keyboard", true, a.quality.qwerty) });
      for (const [path, v] of strings(d)) {
        if (["ctx.layout", "ctx.wordlist", "ctx.input", "ctx.fixMode", "pace.q"].includes(path)) continue;
        expect(v.length, path).toBeLessThanOrEqual(2);
      }
      const json = JSON.stringify(d);
      const enums = ["keyboard", "touch", "mixed", "qwerty", "plain", "fix", "block", "none"];
      for (const w of r.words) if (w.length > 2 && !enums.includes(w)) expect(json).not.toContain(`"${w}"`);
    }
  });
});

describe("parseDigest", () => {
  it("round-trips and never throws", () => {
    const { a, r } = typical();
    const d = digestOf(a, r);
    expect(parseDigest(JSON.parse(JSON.stringify(d)))).toEqual(d);
    for (const bad of [null, undefined, 3, "x", [], {}, { v: 2 }, () => 1]) expect(parseDigest(bad)).toBeNull();
  });

  it("rejects v ≠ 1, wrong types and over-long arrays", () => {
    const { a, r } = typical();
    const d = JSON.parse(JSON.stringify(digestOf(a, r))) as TestDigestV1;
    const broken: unknown[] = [
      { ...d, v: 2 }, { ...d, ms: "1" }, { ...d, sl: [1, 2, 3, 4] }, { ...d, se: [1, 2] }, { ...d, pace: { ...d.pace, q: "x" } },
      { ...d, ip: Array(6).fill(["ab", 1]) }, { ...d, pairs: Array(17).fill(["ab", 2, 1, 1]) }, { ...d, pairs: [["abc", 2, 1, 1]] },
      { ...d, bl: [[1, 2], [3, 4]] }, { ...d, cls: { cross: [1, 2] } }, { ...d, fin: { X9: [1, 2, 3] } }, { ...d, fade: [1] },
      { ...d, ctx: { ...d.ctx, input: "pen" } }, { ...d, ctx: { ...d.ctx, layout: "dvorak" } }, { ...d, err: { ...d.err, med: "1" } },
      { ...d, q: 2 }, { ...d, iw: NaN },
    ];
    for (const b of broken) expect(parseDigest(b)).toBeNull();
  });
});
