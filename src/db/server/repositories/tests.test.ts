import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { NewTestRow } from "@/types/adapt";
import { createTestDatabase } from "../testing";

function row(over: Partial<NewTestRow> = {}): NewTestRow {
  return {
    id: `t_${Math.random().toString(36).slice(2, 10)}`,
    userId: "u1",
    startedAt: new Date(),
    completedAt: new Date(),
    mode: "training",
    durationOrWordCount: 25,
    wpm: 100,
    accuracy: 98,
    errorCount: 1,
    resetCount: 0,
    wasCompleted: true,
    ...over,
  };
}

describe("testsRepo", () => {
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

  it("insert returns the persisted row", async () => {
    const inserted = await ctx.db.tests.insert(row({ id: "t_1" }));
    expect(inserted.id).toBe("t_1");
    expect(inserted.wpm).toBe(100);
  });

  it("recentForUser returns rows newest-first", async () => {
    const t1 = new Date(2026, 0, 1);
    const t2 = new Date(2026, 0, 2);
    const t3 = new Date(2026, 0, 3);
    await ctx.db.tests.insert(row({ id: "t_1", startedAt: t1 }));
    await ctx.db.tests.insert(row({ id: "t_3", startedAt: t3 }));
    await ctx.db.tests.insert(row({ id: "t_2", startedAt: t2 }));

    const rows = await ctx.db.tests.recentForUser("u1", 10);
    expect(rows.map((r) => r.id)).toEqual(["t_3", "t_2", "t_1"]);
  });

  it("recentForUser respects the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await ctx.db.tests.insert(
        row({ id: `t_${i}`, startedAt: new Date(2026, 0, i + 1) }),
      );
    }
    const rows = await ctx.db.tests.recentForUser("u1", 2);
    expect(rows.length).toBe(2);
  });

  it("recentForUser scopes by userId", async () => {
    await ctx.db.tests.insert(row({ id: "t_a", userId: "u1" }));
    await ctx.db.tests.insert(row({ id: "t_b", userId: "u2" }));
    const u1 = await ctx.db.tests.recentForUser("u1", 10);
    expect(u1.map((r) => r.id)).toEqual(["t_a"]);
  });

  it("topLeaderboard ranks by net WPM (wpm × accuracy / 100)", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_fast_sloppy", userId: "u1", wpm: 120, accuracy: 80 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_steady", userId: "u2", wpm: 100, accuracy: 100 }),
    );
    const rows = await ctx.db.tests.topLeaderboard({});
    expect(rows[0]?.testId).toBe("t_steady");
    expect(rows[1]?.testId).toBe("t_fast_sloppy");
    expect(rows[0]?.netWpm).toBeCloseTo(100, 1);
    expect(rows[1]?.netWpm).toBeCloseTo(96, 1);
  });

  it("topLeaderboard surfaces each user's best run per bucket", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_u1_a", userId: "u1", wpm: 80, accuracy: 100 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_u1_b", userId: "u1", wpm: 90, accuracy: 100 }),
    );
    const rows = await ctx.db.tests.topLeaderboard({});
    expect(rows.length).toBe(1);
    expect(rows[0]?.testId).toBe("t_u1_b");
  });

  it("topLeaderboard filters out incomplete runs", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_partial", wpm: 150, accuracy: 100, wasCompleted: false }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_done", wpm: 80, accuracy: 100, wasCompleted: true }),
    );
    const rows = await ctx.db.tests.topLeaderboard({});
    expect(rows.map((r) => r.testId)).toEqual(["t_done"]);
  });

  it("topLeaderboard can filter by mode", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_race", userId: "u1", mode: "race", wpm: 90 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_casual", userId: "u2", mode: "casual", wpm: 95 }),
    );
    const race = await ctx.db.tests.topLeaderboard({ mode: "race" });
    expect(race.map((r) => r.testId)).toEqual(["t_race"]);
  });

  it("topLeaderboard sinceMs filters older runs", async () => {
    await ctx.db.tests.insert(
      row({
        id: "t_old",
        userId: "u1",
        wpm: 100,
        completedAt: new Date(2025, 0, 1),
      }),
    );
    await ctx.db.tests.insert(
      row({
        id: "t_new",
        userId: "u2",
        wpm: 80,
        completedAt: new Date(2026, 0, 1),
      }),
    );
    const rows = await ctx.db.tests.topLeaderboard({
      sinceMs: new Date(2025, 6, 1).getTime(),
    });
    expect(rows.map((r) => r.testId)).toEqual(["t_new"]);
  });
});
