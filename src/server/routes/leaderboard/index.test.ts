import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  currentUser: vi.fn(async () => null),
  clerkClient: vi.fn(async () => ({
    users: {
      getUserList: vi.fn(async () => ({ data: [] })),
    },
  })),
}));

import { clerkClient } from "@clerk/nextjs/server";
import { createTestDatabase } from "@/db/server/testing";
import { callRoute } from "@/server/testing";
import type { NewTestRow } from "@/types/adapt";
import type { LeaderboardOutput } from "@/types/leaderboard";

const mockClerkClient = vi.mocked(clerkClient);

function row(over: Partial<NewTestRow> = {}): NewTestRow {
  return {
    id: `t_${Math.random().toString(36).slice(2, 10)}`,
    userId: "u1",
    startedAt: new Date(),
    completedAt: new Date(),
    mode: "race",
    durationOrWordCount: 25,
    wpm: 100,
    accuracy: 95,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    ...over,
  };
}

describe("leaderboard.list", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });

  beforeEach(async () => {
    await ctx.reset();
    mockClerkClient.mockReset();
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(async () => ({ data: [] })),
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("returns ranked entries with net WPM = wpm × accuracy / 100", async () => {
    await ctx.db.tests.insert(row({ id: "t_slow_clean", userId: "u1", wpm: 80, accuracy: 100 }));
    await ctx.db.tests.insert(row({ id: "t_fast_sloppy", userId: "u2", wpm: 120, accuracy: 60 }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries[0]?.testId).toBe("t_slow_clean");
    expect(res.entries[0]?.netWpm).toBe(80);
    expect(res.entries[1]?.testId).toBe("t_fast_sloppy");
    expect(res.entries[1]?.netWpm).toBe(72);
  });

  it("falls back to Guest when Clerk lookup yields no user", async () => {
    await ctx.db.tests.insert(row({ id: "t_a", userId: "deleted_user" }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries[0]?.name).toBe("Guest");
    expect(res.entries[0]?.username).toBeNull();
  });

  it("survives a Clerk lookup failure (renders anonymised entries)", async () => {
    mockClerkClient.mockRejectedValue(new Error("clerk-down"));
    await ctx.db.tests.insert(row({ id: "t_a", userId: "u1" }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries.length).toBe(1);
    expect(res.entries[0]?.name).toBe("Guest");
  });

  it("scope=race filters out casual runs", async () => {
    await ctx.db.tests.insert(row({ id: "t_race", userId: "u1", mode: "race" }));
    await ctx.db.tests.insert(row({ id: "t_casual", userId: "u2", mode: "casual" }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: { scope: "race" },
      db: ctx.db,
    });
    expect(res.entries.map((e) => e.testId)).toEqual(["t_race"]);
  });

  it("window=day filters out older runs", async () => {
    await ctx.db.tests.insert(
      row({
        id: "t_old",
        userId: "u1",
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1_000),
      }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_new", userId: "u2", completedAt: new Date() }),
    );
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: { window: "day" },
      db: ctx.db,
    });
    expect(res.entries.map((e) => e.testId)).toEqual(["t_new"]);
  });
});
