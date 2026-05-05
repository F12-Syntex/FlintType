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
});
