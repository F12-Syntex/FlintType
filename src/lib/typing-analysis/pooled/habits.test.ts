import { describe, expect, it } from "vitest";
import type { TestDigestV1 } from "@/types/typing-analysis";
import { buildPooled } from "./digest-fixtures";
import { habitsOf, longWordsOf, mistakeCostOf, paceToEndOf } from "./habits";
import { dg, type PooledTest } from "./windows";

const base = (n = 30) => buildPooled({ tests: n, seed: 6 });
const edit = (ts: PooledTest[], f: (d: TestDigestV1, i: number) => Partial<TestDigestV1>) =>
  ts.map((t, i) => ({ ...t, digest: { ...dg(t), ...f(dg(t), i) } }));

describe("mistakeCost", () => {
  it("is a figure with no band: cost in ms and keys, and how soon you notice", () => {
    const ts = edit(base(), (d) => ({ err: { ...d.err, fixed: 2, med: 800, nk: 1.2 }, pace: { ...d.pace, P: 160 } }));
    const h = mistakeCostOf(ts, "fix");
    expect(h).toEqual({ kind: "mistakeCost", costMs: 800, costKeys: 5, noticeKeys: 1.2, n: 30 });
    expect(Object.keys(h!)).not.toContain("answer");
  });
  it("leaves noticeKeys out with fewer than 10 digests carrying it", () => {
    const ts = edit(base(), (d, i) => ({ err: { ...d.err, fixed: 2, med: 800, nk: i < 9 ? 1 : null } }));
    expect(mistakeCostOf(ts, "fix")).toMatchObject({ noticeKeys: null });
  });
  it("waits for 10 fixed mistakes over 3 tests, and is omitted for other fix modes", () => {
    const few = edit(base(), (d, i) => ({ err: { ...d.err, fixed: i < 4 ? 2 : 0, med: 800 } }));
    expect(mistakeCostOf(few, "fix")).toEqual({ kind: "mistakeCost", gate: { have: 8, need: 10, unit: "fixes" } });
    const two = edit(base(), (d, i) => ({ err: { ...d.err, fixed: i < 2 ? 6 : 0, med: 800 } }));
    expect(mistakeCostOf(two, "fix")).toEqual({ kind: "mistakeCost", gate: { have: 2, need: 3, unit: "tests" } });
    expect(mistakeCostOf(base(), "none")).toBeNull();
    expect(mistakeCostOf([], null)).toMatchObject({ gate: { have: 0 } });
  });
});

describe("longWords", () => {
  const withRates = (short: number, long: number, bd = 100) => edit(base(10), () => ({
    bl: [[bd, Math.round(bd * short)], [10, 1], [bd, Math.round(bd * long)]] as TestDigestV1["bl"],
  }));
  it("answers at each boundary", () => {
    expect(longWordsOf(withRates(0.1, 0.25))).toMatchObject({ answer: "yes-quite", n: 2100 });
    expect(longWordsOf(withRates(0.1, 0.15))).toMatchObject({ answer: "a-little" });
    expect(longWordsOf(withRates(0.1, 0.12))).toMatchObject({ answer: "not-really" });
    expect(longWordsOf(withRates(0.2, 0.2))).toMatchObject({ answer: "not-really", longRate: 0.2, shortRate: 0.2 });
  });
  it("waits for 150 word gaps and 30 before long words", () => {
    const thin = edit(base(4), () => ({ bl: [[10, 1], [10, 1], [10, 1]] as TestDigestV1["bl"] }));
    expect(longWordsOf(thin)).toEqual({ kind: "longWords", gate: { have: 120, need: 150, unit: "gaps" } });
    const fewLong = edit(base(10), () => ({ bl: [[15, 1], [15, 1], [2, 1]] as TestDigestV1["bl"] }));
    expect(longWordsOf(fewLong)).toEqual({ kind: "longWords", gate: { have: 20, need: 30, unit: "gaps" } });
  });
});

describe("paceToEnd", () => {
  const fades = (ratios: number[]) => edit(base(ratios.length), (d, i) => ({ fade: [70, 70 * ratios[i]!] as [number, number] }));
  it("answers at each boundary", () => {
    expect(paceToEndOf(fades(Array(10).fill(0.93)))).toEqual({ kind: "paceToEnd", answer: "fade-a-little", slower: 10, of: 10, n: 10 });
    expect(paceToEndOf(fades(Array(10).fill(0.97)))).toMatchObject({ answer: "yes" });
    expect(paceToEndOf(fades(Array(10).fill(1.06)))).toMatchObject({ answer: "speed-up", slower: 0 });
    expect(paceToEndOf(fades([0.9, 1.1, 0.9, 1.1, 0.9, 1.1, 0.9, 1.1]))).toMatchObject({ answer: "yes" });
  });
  it("waits for 8 tests with a fade", () => {
    expect(paceToEndOf(fades(Array(7).fill(0.9)))).toEqual({ kind: "paceToEnd", gate: { have: 7, need: 8, unit: "tests" } });
    expect(paceToEndOf(edit(base(10), () => ({ fade: null })))).toMatchObject({ gate: { have: 0 } });
  });
});

describe("habitsOf", () => {
  const warmUp = { found: true, wpm: 4, n: 9 };
  const fatigue = { gate: { have: 2, need: 6, unit: "sessions" as const } };
  it("lists answered habits and pending ones with their counts, in a fixed order", () => {
    const h = habitsOf({ usualD: base(30), fixKey: "fix", warmUp, fatigue });
    expect(h.items.map((x) => x.kind)).toEqual(expect.arrayContaining(["warmUp"]));
    expect(h.items.find((x) => x.kind === "warmUp")).toEqual({ kind: "warmUp", answer: "usually", wpm: 4, n: 9 });
    expect(h.pending).toContainEqual({ kind: "fatigue", gate: { have: 2, need: 6, unit: "sessions" } });
    const kinds = [...h.items.map((x) => x.kind), ...h.pending.map((x) => x.kind)];
    expect(new Set(kinds).size).toBe(kinds.length);
  });
  it("without digests, lists only the habits built from tests", () => {
    const h = habitsOf({ usualD: null, fixKey: null, warmUp: { found: false, wpm: null, n: 8 }, fatigue });
    expect(h).toEqual({ items: [{ kind: "warmUp", answer: "not-really", wpm: null, n: 8 }], pending: [{ kind: "fatigue", gate: fatigue.gate }] });
  });
});
