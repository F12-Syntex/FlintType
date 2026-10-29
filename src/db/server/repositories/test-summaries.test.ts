import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NewTestRow } from "@/types/adapt";
import { createTestDatabase } from "../testing";

const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);

function row(over: Partial<NewTestRow> & { id: string }): NewTestRow {
  return {
    userId: "u1",
    startedAt: new Date(T0),
    completedAt: new Date(T0 + 20_000),
    mode: "casual",
    durationOrWordCount: 25,
    lengthMode: "words",
    wpm: 80,
    accuracy: 97.5,
    errorCount: 3,
    resetCount: 1,
    wasCompleted: true,
    wpmHistory: [{ t: 1, wpm: 80, raw: 82 }],
    rawWpm: 82,
    peakWpm: 95,
    avgWpm: 80,
    stallWpm: 60,
    consistency: 77,
    ...over,
  };
}

describe("testSummariesRepo", () => {
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

  it("projects only the summary columns: no wpmHistory or roll-ups", async () => {
    await ctx.db.tests.insert(row({ id: "t1" }));
    const [got] = await ctx.db.testSummaries.recentForUser("u1", 10);
    expect(got).toEqual({
      id: "t1",
      startedAt: new Date(T0),
      mode: "casual",
      lengthMode: "words",
      durationOrWordCount: 25,
      wpm: 80,
      accuracy: 97.5,
      errorCount: 3,
      wasCompleted: true,
    });
    expect(Object.keys(got!)).not.toContain("wpmHistory");
    expect(Object.keys(got!)).not.toContain("rawWpm");
    expect(Object.keys(got!)).not.toContain("userId");
  });

  it("returns rows newest first, limited, and only the user's own", async () => {
    for (let i = 0; i < 4; i++) {
      await ctx.db.tests.insert(row({ id: `t${i}`, startedAt: new Date(T0 + i * 60_000) }));
    }
    await ctx.db.tests.insert(row({ id: "other", userId: "u2", startedAt: new Date(T0 + 10 * 60_000) }));
    const got = await ctx.db.testSummaries.recentForUser("u1", 3);
    expect(got.map((r) => r.id)).toEqual(["t3", "t2", "t1"]);
  });

  it("excludes tests that started at or after beforeMs", async () => {
    for (let i = 0; i < 4; i++) {
      await ctx.db.tests.insert(row({ id: `t${i}`, startedAt: new Date(T0 + i * 60_000) }));
    }
    const got = await ctx.db.testSummaries.recentForUser("u1", 10, T0 + 2 * 60_000);
    expect(got.map((r) => r.id)).toEqual(["t1", "t0"]);
    const all = await ctx.db.testSummaries.recentForUser("u1", 10, undefined);
    expect(all).toHaveLength(4);
  });

  it("round-trips a null lengthMode", async () => {
    await ctx.db.tests.insert(row({ id: "legacy", lengthMode: null }));
    const [got] = await ctx.db.testSummaries.recentForUser("u1", 1);
    expect(got!.lengthMode).toBeNull();
  });
});
