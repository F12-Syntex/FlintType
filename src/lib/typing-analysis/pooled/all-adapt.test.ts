import { describe, expect, it } from "vitest";
import { ALL_ADAPT_BUCKET, type TestSummaryRow } from "@/types/insights";
import { allAdapt, allAdaptOption, ANCHOR_WINDOW, insightsOptions, POOL_MIN } from "./all-adapt";
import { toPooled, windowsFor } from "./windows";

const T0 = 1_790_000_000_000;
const HOUR = 3_600_000;

let seq = 0;
/** `n` Adapt rows of one kind, newest first from `at`, one an hour. */
function kind(n: number, o: Partial<TestSummaryRow> & { at?: number } = {}): TestSummaryRow[] {
  const at = o.at ?? T0;
  return Array.from({ length: n }, (_, i) => ({
    id: `t${seq++}`, startedAt: new Date(at - i * HOUR), mode: "training", lengthMode: "words",
    durationOrWordCount: 25, wpm: 80, accuracy: 96, errorCount: 2, wasCompleted: true, ...o,
  }));
}
const pooledOf = (rows: TestSummaryRow[]) =>
  toPooled([...rows].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()), new Map(), new Map());

describe("allAdapt", () => {
  it("is null until some Adapt kind has enough tests", () => {
    expect(allAdapt(pooledOf(kind(POOL_MIN - 1)))).toBeNull();
    expect(allAdapt(pooledOf(kind(8, { mode: "casual" })))).toBeNull();
  });

  it("scales each kind's speed and accuracy to the anchor kind's usual", () => {
    const rows = [
      ...kind(10, { wpm: 80, accuracy: 96 }),
      ...kind(6, { lengthMode: "time", durationOrWordCount: 60, wpm: 60, accuracy: 94, at: T0 - 20 * HOUR }),
    ];
    const all = allAdapt(pooledOf(rows))!;
    expect(all.kinds).toEqual(["training|words|25", "training|time|60"]);
    const timed = all.tests.filter((t) => t.lengthMode === "time");
    expect(timed).toHaveLength(6);
    for (const t of timed) {
      expect(t.wpm).toBeCloseTo(80);
      expect(t.accuracy).toBeCloseTo(96);
      expect(t.typed).toEqual({ wpm: 60, accuracy: 94 });
      expect(t.bucket).toBe(ALL_ADAPT_BUCKET);
    }
    // The anchor kind is unchanged.
    expect(all.tests.filter((t) => t.lengthMode === "words").every((t) => t.wpm === 80)).toBe(true);
  });

  it("keeps each test's own variation within its kind", () => {
    const rows = kind(6, { lengthMode: "time", durationOrWordCount: 30, wpm: 50 });
    rows[0]!.wpm = 60;
    const all = allAdapt(pooledOf([...kind(10, { wpm: 100, at: T0 - HOUR / 2 }), ...rows]))!;
    const newest = all.tests.find((t) => t.id === rows[0]!.id)!;
    expect(newest.wpm).toBeCloseTo(120);
  });

  it("anchors on the kind played most lately, not the one with the most tests", () => {
    const old = kind(40, { durationOrWordCount: 50, at: T0 - 1_000 * HOUR });
    const recent = kind(ANCHOR_WINDOW, { lengthMode: "time", durationOrWordCount: 15 });
    expect(allAdapt(pooledOf([...old, ...recent]))!.kinds[0]).toBe("training|time|15");
  });

  it("leaves out (and counts) kinds without enough tests, and ignores ineligible runs", () => {
    const rows = [
      ...kind(POOL_MIN),
      ...kind(2, { durationOrWordCount: 100 }),
      ...kind(3, { wasCompleted: false, durationOrWordCount: 50 }),
      ...kind(2, { mode: "casual" }),
    ];
    const all = allAdapt(pooledOf(rows))!;
    expect(all.tests).toHaveLength(POOL_MIN);
    expect(all.leftOut).toBe(2);
  });

  it("clamps scaled accuracy to 0 to 100", () => {
    const rows = [
      ...kind(6, { accuracy: 100 }),
      ...kind(6, { durationOrWordCount: 50, accuracy: 90, at: T0 - 10 * HOUR }),
    ];
    rows[6]!.accuracy = 99;
    const t = allAdapt(pooledOf(rows))!.tests.find((x) => x.id === rows[6]!.id)!;
    expect(t.accuracy).toBe(100);
  });
});

describe("the pooled option and windows", () => {
  const rows = [
    ...kind(12, { wpm: 80 }),
    ...kind(6, { durationOrWordCount: 50, wpm: 70, at: T0 - 20 * HOUR }),
    ...kind(3, { durationOrWordCount: 10, wpm: 90, at: T0 - 40 * HOUR }),
  ];
  const ts = pooledOf(rows);

  it("names the anchor kind and counts what it pools", () => {
    expect(allAdaptOption(ts)).toMatchObject({
      key: ALL_ADAPT_BUCKET, mode: "training", lengthMode: "words", length: 25, touch: false,
      tests: 18, analysed: 0, all: { kinds: 2, leftOut: 3 },
    });
  });

  it("comes first in the picker, before every kind", () => {
    const opts = insightsOptions(ts, T0);
    expect(opts[0]!.key).toBe(ALL_ADAPT_BUCKET);
    expect(opts.slice(1).map((o) => o.key)).toEqual(["training|words|25", "training|words|50", "training|words|10"]);
  });

  it("windows the scaled tests, newest first", () => {
    const w = windowsFor(ts, ALL_ADAPT_BUCKET);
    expect(w.tests).toHaveLength(18);
    expect(w.tests.every((t, i) => i === 0 || t.startedAtMs <= w.tests[i - 1]!.startedAtMs)).toBe(true);
    expect(w.usual.every((t) => Math.abs(t.wpm - 80) < 1e-9)).toBe(true);
  });
});
