import { describe, expect, it } from "vitest";
import { SLICE_ORDER } from "@/types/typing-analysis";
import { FIXTURE_T0, fixtureData, mergeFixtures, nowAfter, type FixtureOptions } from "./digest-fixtures";
import { assembleOverview, type PatternInput } from "./overview";
import { bucketOptions, chooseBucket, toPooled } from "./windows";

const PATTERNS: PatternInput = {
  pairs: [{ key: "th", extraMs: 30, meanMs: 160, samples: 40 }], words: [], cold: false, weakPairs: 3, weakWords: 2,
};
function overview(o: FixtureOptions | ReturnType<typeof fixtureData>, extra: { bucket?: string; unavailable?: boolean } = {}) {
  const f = "rows" in o ? o : fixtureData(o);
  const nowMs = nowAfter(f.rows.map((r) => ({ startedAtMs: r.startedAt.getTime() })));
  return assembleOverview({ rows: f.rows, index: f.index, digests: extra.unavailable ? "unavailable" : f.digests,
    patterns: PATTERNS, nowMs, bucket: extra.bucket });
}

describe("assembleOverview", () => {
  it("fills every section for an established typist", () => {
    const o = overview({ tests: 60, recent: { before: 10 }, slices: { before: 2 }, zeroShare: { before: 0 } });
    expect(o.status).toBe("ready");
    expect(o.bucket).toMatchObject({ key: "casual|words|25", tests: 60, analysed: 60 });
    expect(o.headline).toMatchObject({ adjusted: false, range: { rule: "middle-80", n: 30 } });
    expect(o.headline!.trend.state).not.toBe("early");
    expect(o.time.status).toBe("ready");
    if (o.time.status === "ready") {
      const recent = o.time.recent;
      expect(Math.round(SLICE_ORDER.reduce((s, k) => s + recent[k], 0) * 10) / 10).toBe(60);
      expect(o.time.focus).toBe(o.nextStep.kind === "barrier" ? o.nextStep.barrier : null);
    }
    expect(o.barriers.status).toBe("ready");
    expect(o.nextStep).toMatchObject({ kind: "barrier", barrier: "before" });
    expect(o.changes).toMatchObject({ status: "ready", earlierN: 30 });
    expect(o.series!.points).toHaveLength(60);
    expect(o.habits!.items.length + o.habits!.pending.length).toBe(6);
    expect(o.practice).toEqual({ pairs: PATTERNS.pairs, words: [], weaknessReady: true, worstWordsReady: false });
    expect(o.progress).toMatchObject({ tests: 60, analysed: 60 });
    expect(o.progress.spanDays).toBeGreaterThan(3);
    expect(o.cold).toBe(false);
  });
  it("is empty without an eligible test", () => {
    const o = overview({ tests: 0 });
    expect(o).toMatchObject({ status: "empty", buckets: [], bucket: null, headline: null, series: null, habits: null,
      nextStep: { kind: "learning" }, time: { status: "learning" }, progress: { tests: 0 } });
    const imports = fixtureData({ tests: 5, idPrefix: "mt_" });
    expect(overview(imports).status).toBe("empty");
  });
  it("passes not-ready through: speed, trend, series and session habits still fill", () => {
    const o = overview({ tests: 40 }, { unavailable: true });
    expect(o.status).toBe("not-ready");
    expect(o.headline).not.toBeNull();
    expect(o.series).not.toBeNull();
    expect([o.time, o.barriers, o.changes]).toEqual([{ status: "not-ready" }, { status: "not-ready" }, { status: "not-ready" }]);
    const kinds = [...o.habits!.items, ...o.habits!.pending].map((h) => h.kind).sort();
    expect(kinds).toEqual(["fatigue", "warmUp"]);
  });
  it("falls back to the default bucket for an unknown or empty one, and keeps a requested small bucket listed", () => {
    const f = mergeFixtures([fixtureData({ tests: 30 }), fixtureData({ tests: 2, length: 50, idPrefix: "b", seed: 2 })]);
    expect(overview(f, { bucket: "race|words|25" }).bucket!.key).toBe("casual|words|25");
    expect(overview(f).buckets.map((b) => b.key)).toEqual(["casual|words|25"]);
    const small = overview(f, { bucket: "casual|words|50" });
    expect(small.bucket!.key).toBe("casual|words|50");
    expect(small.buckets.map((b) => b.key)).toContain("casual|words|50");
    expect(small.headline!.range).toBeNull();
    expect(small.time).toMatchObject({ status: "learning", gate: { have: 2, need: 5 } });
  });
  it("keeps perfect 30-word Adapt runs whose digests aren't loaded (a stored digest means not sudden death)", () => {
    const perfect = fixtureData({ tests: 50, mode: "training", length: 30, accuracy: 100, accSd: 0, idPrefix: "a", seed: 3 });
    const f = mergeFixtures([perfect, fixtureData({ tests: 8, idPrefix: "b", seed: 2, startMs: FIXTURE_T0 - 40 * 86_400_000 })]);
    const nowMs = nowAfter(f.rows.map((r) => ({ startedAtMs: r.startedAt.getTime() })));
    // As load.ts: the bucket is chosen before any digest is loaded, then only
    // its newest 40 digests are read.
    const chosen = chooseBucket(bucketOptions(toPooled(f.rows, f.index, new Map()), nowMs), nowMs, "training|words|30");
    expect(chosen).toBe("training|words|30");
    const newest40 = new Map(perfect.rows.slice(0, 40).map((r) => [r.id, perfect.digests.get(r.id)!]));
    const o = assembleOverview({ rows: f.rows, index: f.index, digests: newest40, patterns: PATTERNS, nowMs, bucket: chosen! });
    expect(o.bucket).toMatchObject({ key: "training|words|30", tests: 50, analysed: 50 });
    expect(o.buckets.find((b) => b.key === "training|words|30")).toMatchObject({ tests: 50, analysed: 50 });
    expect(o.series!.points).toHaveLength(50);
  });
  it("adjusts an Adapt bucket", () => {
    const o = overview({ tests: 40, mode: "training", diff: 1 });
    expect(o.headline!.adjusted).toBe(true);
    expect(o.series!.adjusted).toBe(true);
  });
  it("caps the series at 500 tests", () => {
    const o = overview({ tests: 520, perDay: [3, 3], sessions: Array(200).fill(3) });
    expect(o.series!.points.length).toBeLessThanOrEqual(500);
    expect(o.progress.tests).toBe(520);
  });
});
