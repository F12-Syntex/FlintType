import { describe, expect, it } from "vitest";
import type { InsightsUsualInput } from "@/types/insights";
import type { TestDigestV1 } from "@/types/typing-analysis";
import { fixtureData, mergeFixtures, type FixtureOptions } from "./digest-fixtures";
import { assembleUsual, referenceDigestQuery } from "./usual-reference";

const MIN = 60_000;
type F = ReturnType<typeof fixtureData>;
function usual(f: F, input: Partial<InsightsUsualInput> & { beforeMs: number }, unavailable = false) {
  const rows = f.rows.filter((r) => r.startedAt.getTime() < input.beforeMs);
  return assembleUsual({ rows, index: f.index, digests: unavailable ? "unavailable" : f.digests,
    input: { bucket: "casual|words|25", fixMode: "fix", ...input }, nowMs: input.beforeMs + MIN });
}
const newest = (f: F) => f.rows[0]!.startedAt.getTime();
const sessionsOf = (o: FixtureOptions) => fixtureData({ perDay: [1, 1], gapMin: 3, ...o });

describe("assembleUsual", () => {
  it("uses up to 30 tests from before the current session", () => {
    // 10 sessions of 5; the comparison is made 3 minutes after the newest test.
    const f = sessionsOf({ tests: 50, sessions: Array(10).fill(5) });
    const r = usual(f, { beforeMs: newest(f) + 3 * MIN });
    expect(r.status).toBe("ready");
    expect(r.reference).toEqual({ kind: "usual", n: 30 });
    expect(r.speed).toMatchObject({ rule: "middle-80", n: 30 });
    expect(r.slices).not.toBeNull();
    // The newest 5 are the current session; the reference is the 30 before.
    const ref = f.rows.slice(5, 35).map((x) => x.wpm).sort((a, b) => a - b);
    expect(r.speed!.mid).toBeCloseTo((ref[14]! + ref[15]!) / 2, 9);
  });
  it("a test hours later counts every earlier test as before the session", () => {
    const f = sessionsOf({ tests: 50, sessions: Array(10).fill(5) });
    expect(usual(f, { beforeMs: newest(f) + 120 * MIN }).reference).toEqual({ kind: "usual", n: 30 });
  });
  it("falls back to the earlier tests of today's session", () => {
    const f = sessionsOf({ tests: 9, sessions: [2, 7] });
    expect(usual(f, { beforeMs: newest(f) + 3 * MIN }).reference).toEqual({ kind: "earlier-today", n: 7 });
  });
  it("is learning below 5, with the real count even for a bucket the picker wouldn't list", () => {
    const f = sessionsOf({ tests: 2, sessions: [2] });
    expect(usual(f, { beforeMs: newest(f) + 3 * MIN })).toEqual({
      status: "learning", reference: null, speed: null, accuracy: null, slices: null, gate: { have: 2, need: 5, unit: "tests" },
    });
  });
  it("never counts a test at or after beforeMs", () => {
    const f = sessionsOf({ tests: 6, sessions: [6] });
    const at = f.rows[0]!.startedAt.getTime();
    expect(usual(f, { beforeMs: at })).toMatchObject({ status: "ready", reference: { kind: "earlier-today", n: 5 } });
  });
  it("compares fixing only within the same fix mode", () => {
    const f = sessionsOf({ tests: 40, sessions: Array(8).fill(5), fixMode: "none" });
    expect(usual(f, { beforeMs: newest(f) + 120 * MIN, fixMode: "fix" }).slices).toBeNull();
    expect(usual(f, { beforeMs: newest(f) + 120 * MIN, fixMode: "none" }).slices).not.toBeNull();
  });
  it("speed is raw wpm, even for Adapt", () => {
    const f = fixtureData({ tests: 40, mode: "training", diff: 1, perDay: [1, 1], sessions: Array(8).fill(5) });
    const r = usual(f, { bucket: "training|words|25", beforeMs: newest(f) + 120 * MIN });
    const raw = f.rows.slice(0, 30).map((x) => x.wpm).sort((a, b) => a - b);
    expect(r.speed!.mid).toBeCloseTo((raw[14]! + raw[15]!) / 2, 9);
  });
  it("is not-ready without the analysis store, keeping speed and accuracy", () => {
    const f = sessionsOf({ tests: 20, sessions: Array(4).fill(5) });
    const r = usual(f, { beforeMs: newest(f) + 120 * MIN }, true);
    expect(r).toMatchObject({ status: "not-ready", slices: null, reference: { kind: "usual" } });
    expect(usual(sessionsOf({ tests: 2 }), { beforeMs: Date.UTC(2030, 0) }, true)).toMatchObject({ status: "not-ready", gate: null });
  });
});

describe("referenceDigestQuery", () => {
  const T = Date.UTC(2026, 5, 1);
  const BUCKET = "casual|words|25";
  /** 30 earlier tests, then a current session of `size` tests a minute apart. */
  const withSession = (size: number) => mergeFixtures([
    fixtureData({ tests: 30, idPrefix: "e", startMs: T - 10 * 86_400_000, seed: 1 }),
    fixtureData({ tests: size, idPrefix: "s", sessions: [size], perDay: [1, 1], gapMin: 1, startMs: T, seed: 2 }),
  ]);
  /** What the repo returns for a read: the bucket's newest digests before a time. */
  const read = (f: F, q: { beforeMs: number; limit: number }) => new Map(f.rows
    .filter((r) => r.startedAt.getTime() < q.beforeMs).slice(0, q.limit).map((r) => [r.id, f.digests.get(r.id)!]));
  const assemble = (f: F, digests: Map<string, TestDigestV1>, beforeMs: number) =>
    assembleUsual({ rows: f.rows, index: f.index, digests, input: { bucket: BUCKET, beforeMs, fixMode: "fix" }, nowMs: beforeMs });

  it("reads the reference window's own digests after a long current session", () => {
    for (const size of [5, 20, 36, 45]) {
      const f = withSession(size);
      const beforeMs = newest(f) + MIN;
      const q = referenceDigestQuery(f.rows, f.index, BUCKET, beforeMs)!;
      // Before the session's first test, never before the comparison time.
      expect(q).toEqual({ beforeMs: f.rows[size - 1]!.startedAt.getTime(), limit: 30 });
      const got = assemble(f, read(f, q), beforeMs);
      const all = assemble(f, f.digests, beforeMs);
      expect(got.reference).toEqual({ kind: "usual", n: 30 });
      expect(got.slices).not.toBeNull();
      expect(got.slices).toEqual(all.slices);
    }
    // The newest 40 before the comparison time miss the reference entirely.
    const f = withSession(36);
    expect(assemble(f, read(f, { beforeMs: newest(f) + MIN, limit: 40 }), newest(f) + MIN).slices).toBeNull();
  });
  it("reads before the comparison time when there is no current session", () => {
    const f = withSession(5);
    const later = newest(f) + 120 * MIN;
    expect(referenceDigestQuery(f.rows, f.index, BUCKET, later)).toEqual({ beforeMs: later, limit: 30 });
  });
  it("reads before the comparison time for the earlier-today fallback", () => {
    const f = sessionsOf({ tests: 9, sessions: [2, 7] });
    const at = newest(f) + 3 * MIN;
    expect(referenceDigestQuery(f.rows, f.index, BUCKET, at)).toEqual({ beforeMs: at, limit: 30 });
  });
  it("is null without a reference, and for another bucket", () => {
    const few = sessionsOf({ tests: 2, sessions: [2] });
    expect(referenceDigestQuery(few.rows, few.index, BUCKET, newest(few) + 3 * MIN)).toBeNull();
    const f = withSession(5);
    expect(referenceDigestQuery(f.rows, f.index, "casual|words|50", newest(f) + MIN)).toBeNull();
  });
});
