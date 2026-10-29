import { describe, expect, it } from "vitest";
import type { TestSummaryRow } from "@/types/insights";
import type { TestDigestV1 } from "@/types/typing-analysis";
import { fixtureData } from "./digest-fixtures";
import {
  bucketOptions, chooseBucket, defaultBucket, eligible, fixKeyOf, listedBuckets, toPooled, windowsFor,
  type AnalysisIndex,
} from "./windows";

const T0 = 1_790_000_000_000;
const MIN = 60_000;
const DAY = 86_400_000;

function row(id: string, at: number, over: Partial<TestSummaryRow> = {}): TestSummaryRow {
  return { id, startedAt: new Date(at), mode: "casual", lengthMode: "words", durationOrWordCount: 25, wpm: 70,
    accuracy: 96, errorCount: 2, wasCompleted: true, ...over };
}
const aDigest = (over: Partial<TestDigestV1["ctx"]> = {}): TestDigestV1 => {
  const d = fixtureData({ tests: 1 }).digests.values().next().value!;
  return { ...d, ctx: { ...d.ctx, ...over } };
};
const newestFirst = (rows: TestSummaryRow[]) => [...rows].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

describe("eligible", () => {
  const idx: AnalysisIndex = new Map();
  it("excludes imports, legacy rows, incomplete runs, sudden death and drills", () => {
    const rows = [
      row("mt_1", T0), row("a", T0 + 1, { lengthMode: null }), row("b", T0 + 2, { wasCompleted: false }),
      row("c", T0 + 3, { mode: "training", durationOrWordCount: 30, accuracy: 100 }),
      row("d", T0 + 4), row("e", T0 + 5), row("f", T0 + 6),
    ];
    const digests = new Map([["e", aDigest({ suddenDeath: true })], ["f", aDigest({ drill: true })]]);
    const ts = toPooled(newestFirst(rows), idx, digests);
    expect(ts.filter(eligible).map((t) => t.id)).toEqual(["d"]);
  });
  it("keeps a 30-word Adapt run at 100% when its digest says it wasn't sudden death", () => {
    const ts = toPooled([row("c", T0, { mode: "training", durationOrWordCount: 30, accuracy: 100 })], idx, new Map([["c", aDigest()]]));
    expect(eligible(ts[0]!)).toBe(true);
  });
  it("keeps an indexed 30-word Adapt run at 100% whose digest isn't loaded; a non-indexed one is legacy sudden death", () => {
    const perfect = { mode: "training", durationOrWordCount: 30, accuracy: 100 } as const;
    const rows = [row("i", T0 + 1, perfect), row("n", T0, perfect)];
    const index: AnalysisIndex = new Map([["i", { bucket: "training|words|30", diff: null }]]);
    const ts = toPooled(rows, index, new Map());
    expect(ts.map((t) => [t.id, eligible(t)])).toEqual([["i", true], ["n", false]]);
  });
});

describe("toPooled", () => {
  it("uses the stored bucket (touch), the keyboard bucket otherwise, and the index diff", () => {
    const rows = [row("t", T0 + 2), row("k", T0 + 1), row("r", T0, { mode: "race", durationOrWordCount: 41 })];
    const index: AnalysisIndex = new Map([["t", { bucket: "casual|words|25|t", diff: 1.1 }]]);
    const ts = toPooled(rows, index, new Map());
    expect(ts.map((t) => t.bucket)).toEqual(["casual|words|25|t", "casual|words|25", "race|words|41"]);
    expect(ts[0]!.diff).toBe(1.1);
    expect(ts[0]!.indexed).toBe(true);
    expect(ts[0]!.digest).toBeNull();
    expect(ts[1]!.diff).toBeNull();
  });
  it("numbers sessions over every eligible test, splitting at the gap", () => {
    const rows = newestFirst([row("a", T0), row("b", T0 + 10 * MIN), row("c", T0 + 50 * MIN), row("x", T0 + 55 * MIN, { wasCompleted: false })]);
    const ts = toPooled(rows, new Map(), new Map());
    const s = Object.fromEntries(ts.map((t) => [t.id, t.session]));
    expect(s).toEqual({ x: -1, c: 0, b: 1, a: 1 });
  });
});

describe("bucket options", () => {
  const now = T0 + 100 * DAY;
  const rows = newestFirst([
    ...Array.from({ length: 5 }, (_, i) => row(`old${i}`, T0 + i * MIN, { durationOrWordCount: 50 })),
    ...Array.from({ length: 3 }, (_, i) => row(`new${i}`, now - DAY + i * MIN, { mode: "training" })),
    ...Array.from({ length: 2 }, (_, i) => row(`two${i}`, now - 40 * DAY + i * MIN, { lengthMode: "time", durationOrWordCount: 60 })),
  ]);
  const ts = toPooled(rows, new Map(), new Map());
  const opts = bucketOptions(ts, now);
  it("sorts by tests in the last 30 days, then by the last test", () => {
    expect(opts.map((o) => o.key)).toEqual(["training|words|25", "casual|time|60", "casual|words|50"]);
    expect(opts[0]).toMatchObject({ mode: "training", lengthMode: "words", length: 25, touch: false, tests: 3, analysed: 0 });
    expect(defaultBucket(opts, now)).toBe("training|words|25");
  });
  it("falls back to the most recent bucket when nothing is recent", () => {
    expect(defaultBucket(bucketOptions(ts, now + 365 * DAY), now)).toBe("training|words|25");
  });
  it("lists buckets with 3 or more tests, plus the default and the requested one", () => {
    expect(listedBuckets(opts, ["training|words|25", null]).map((o) => o.key)).toEqual(["training|words|25", "casual|words|50"]);
    expect(listedBuckets(opts, ["training|words|25", "casual|time|60"]).map((o) => o.key)).toHaveLength(3);
    const tiny = bucketOptions(toPooled([row("a", T0), row("b", T0 + 1, { durationOrWordCount: 10 })], new Map(), new Map()), now);
    expect(listedBuckets(tiny, [])).toHaveLength(2);
  });
  it("chooses the requested bucket only when it has an eligible test", () => {
    expect(chooseBucket(opts, now, "casual|time|60")).toBe("casual|time|60");
    expect(chooseBucket(opts, now, "race|words|25")).toBe("training|words|25");
    expect(chooseBucket([], now)).toBeNull();
  });
  it("counts analysed tests from the index", () => {
    const idx: AnalysisIndex = new Map([["new0", { bucket: "training|words|25", diff: null }]]);
    expect(bucketOptions(toPooled(rows, idx, new Map()), now)[0]!.analysed).toBe(1);
  });
});

describe("windows", () => {
  const f = fixtureData({ tests: 45, seed: 3 });
  const ts = toPooled(f.rows, f.index, f.digests);
  const w = windowsFor(ts, "casual|words|25");
  it("recent 10, earlier 30, usual 30, newest first", () => {
    expect([w.tests.length, w.recent.length, w.earlier.length, w.usual.length]).toEqual([45, 10, 30, 30]);
    expect(w.recent[0]!.startedAtMs).toBeGreaterThan(w.recent[9]!.startedAtMs);
    expect(w.earlier[0]!.id).toBe(w.tests[10]!.id);
    expect([w.recentD.length, w.earlierD.length, w.usualD.length]).toEqual([10, 30, 30]);
  });
  it("digest windows range over the tests that have a loaded digest", () => {
    const partial = new Map([...f.digests].filter((_, i) => i % 2 === 0));
    const w2 = windowsFor(toPooled(f.rows, f.index, partial), "casual|words|25");
    expect(w2.recentD.every((t) => t.digest !== null)).toBe(true);
    expect(w2.recentD.length + w2.earlierD.length).toBe(Math.min(40, partial.size));
  });
  it("counts the sessions in the recent window and reads the newest fix mode", () => {
    expect(w.sessionsInRecent).toBe(new Set(w.recent.map((t) => t.session)).size);
    expect(fixKeyOf(w)).toBe("fix");
    expect(windowsFor(ts, "race|words|25").tests).toHaveLength(0);
  });
});
