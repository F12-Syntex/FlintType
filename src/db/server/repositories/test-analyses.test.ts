import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NewTestAnalysisRow } from "@/types/test-analysis";
import { createTestDatabase } from "../testing";

const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);

function row(over: Partial<NewTestAnalysisRow> & { testId: string }): NewTestAnalysisRow {
  return {
    userId: "u1",
    startedAt: new Date(T0),
    bucket: "casual|words|25",
    version: 1,
    digest: { v: 1, diff: null },
    ...over,
  };
}

describe("testAnalysesRepo", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("insert then listForUser round-trips the jsonb exactly", async () => {
    const digest = {
      v: 1,
      sl: [12000, 800, 450, 300, 0],
      pairs: [["th", 6, 28.123, 132.456]],
      fin: null,
      ctx: { input: "keyboard", layout: "qwerty", wordlist: "english" },
      diff: 1.042,
    };
    await ctx.db.testAnalyses.insert(row({ testId: "t1", digest }));
    const [got] = await ctx.db.testAnalyses.listForUser("u1", { limit: 10 });
    expect(got).toEqual({
      testId: "t1",
      startedAt: new Date(T0),
      bucket: "casual|words|25",
      version: 1,
      digest,
    });
  });

  it("inserting a duplicate testId is a no-op", async () => {
    await ctx.db.testAnalyses.insert(row({ testId: "t1", digest: { v: 1, first: true } }));
    await ctx.db.testAnalyses.insert(row({ testId: "t1", digest: { v: 1, first: false }, bucket: "training|time|60" }));
    const all = await ctx.db.testAnalyses.listForUser("u1", { limit: 10 });
    expect(all).toHaveLength(1);
    expect(all[0]!.digest).toEqual({ v: 1, first: true });
    expect(all[0]!.bucket).toBe("casual|words|25");
  });

  it("listForUser filters by bucket, returns newest first and respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await ctx.db.testAnalyses.insert(row({ testId: `w${i}`, startedAt: new Date(T0 + i * 60_000) }));
    }
    await ctx.db.testAnalyses.insert(row({ testId: "time", bucket: "casual|time|30", startedAt: new Date(T0 + 10 * 60_000) }));
    const words = await ctx.db.testAnalyses.listForUser("u1", { limit: 3, bucket: "casual|words|25" });
    expect(words.map((r) => r.testId)).toEqual(["w4", "w3", "w2"]);
    const any = await ctx.db.testAnalyses.listForUser("u1", { limit: 2 });
    expect(any.map((r) => r.testId)).toEqual(["time", "w4"]);
  });

  it("listForUser can read several buckets in one query, and none for an empty list", async () => {
    await ctx.db.testAnalyses.insert(row({ testId: "w", bucket: "training|words|25", startedAt: new Date(T0) }));
    await ctx.db.testAnalyses.insert(row({ testId: "t", bucket: "training|time|60", startedAt: new Date(T0 + 60_000) }));
    await ctx.db.testAnalyses.insert(row({ testId: "c", bucket: "casual|words|25", startedAt: new Date(T0 + 120_000) }));
    const both = await ctx.db.testAnalyses.listForUser("u1", {
      limit: 10, buckets: ["training|words|25", "training|time|60"],
    });
    expect(both.map((r) => r.testId)).toEqual(["t", "w"]);
    expect(await ctx.db.testAnalyses.listForUser("u1", { limit: 10, buckets: [] })).toEqual([]);
  });

  it("listForUser excludes rows at or after beforeMs", async () => {
    for (let i = 0; i < 4; i++) {
      await ctx.db.testAnalyses.insert(row({ testId: `w${i}`, startedAt: new Date(T0 + i * 60_000) }));
    }
    const before = await ctx.db.testAnalyses.listForUser("u1", { limit: 10, beforeMs: T0 + 2 * 60_000 });
    expect(before.map((r) => r.testId)).toEqual(["w1", "w0"]);
    const narrowed = await ctx.db.testAnalyses.listForUser("u1", {
      limit: 10,
      bucket: "casual|words|25",
      beforeMs: T0 + 2 * 60_000 + 1,
    });
    expect(narrowed.map((r) => r.testId)).toEqual(["w2", "w1", "w0"]);
  });

  it("indexForUser returns the user's rows newest first, with diff as a number or null", async () => {
    await ctx.db.testAnalyses.insert(row({ testId: "a", startedAt: new Date(T0), digest: { v: 1, diff: 0.875 } }));
    await ctx.db.testAnalyses.insert(row({ testId: "b", startedAt: new Date(T0 + 1000), digest: { v: 1, diff: null } }));
    await ctx.db.testAnalyses.insert(row({ testId: "c", startedAt: new Date(T0 + 2000), digest: { v: 1 } }));
    await ctx.db.testAnalyses.insert(
      row({ testId: "d", startedAt: new Date(T0 + 3000), bucket: "training|words|50", digest: { v: 1, diff: 1.25 } }),
    );
    await ctx.db.testAnalyses.insert(row({ testId: "e", startedAt: new Date(T0 + 4000), digest: { v: 1, diff: "1.1" } }));
    await ctx.db.testAnalyses.insert(row({ testId: "x", userId: "u2", digest: { v: 1, diff: 2 } }));
    const index = await ctx.db.testAnalyses.indexForUser("u1", 10);
    expect(index).toEqual([
      { testId: "e", bucket: "casual|words|25", diff: null },
      { testId: "d", bucket: "training|words|50", diff: 1.25 },
      { testId: "c", bucket: "casual|words|25", diff: null },
      { testId: "b", bucket: "casual|words|25", diff: null },
      { testId: "a", bucket: "casual|words|25", diff: 0.875 },
    ]);
    expect(typeof index[1]!.diff).toBe("number");
    expect(await ctx.db.testAnalyses.indexForUser("u1", 2)).toHaveLength(2);
  });

  it("another user's rows never appear", async () => {
    await ctx.db.testAnalyses.insert(row({ testId: "mine" }));
    await ctx.db.testAnalyses.insert(row({ testId: "theirs", userId: "u2" }));
    expect((await ctx.db.testAnalyses.listForUser("u1", { limit: 10 })).map((r) => r.testId)).toEqual(["mine"]);
    expect((await ctx.db.testAnalyses.indexForUser("u2", 10)).map((r) => r.testId)).toEqual(["theirs"]);
    expect(await ctx.db.testAnalyses.listForUser("u3", { limit: 10 })).toEqual([]);
  });

  it("deleteForUser returns the count and leaves other users' rows alone", async () => {
    await ctx.db.testAnalyses.insert(row({ testId: "a" }));
    await ctx.db.testAnalyses.insert(row({ testId: "b" }));
    await ctx.db.testAnalyses.insert(row({ testId: "c", userId: "u2" }));
    expect(await ctx.db.testAnalyses.deleteForUser("u1")).toBe(2);
    expect(await ctx.db.testAnalyses.listForUser("u1", { limit: 10 })).toEqual([]);
    expect((await ctx.db.testAnalyses.listForUser("u2", { limit: 10 })).map((r) => r.testId)).toEqual(["c"]);
    expect(await ctx.db.testAnalyses.deleteForUser("u1")).toBe(0);
  });
});
