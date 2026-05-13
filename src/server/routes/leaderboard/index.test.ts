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
    // Default Clerk roster — `u1` and `u2` resolve to display names so
    // tests that don't care about the Clerk lookup itself can insert
    // rows under those ids and see them surface in the result. Tests
    // that exercise the "unknown user" filter override this mock.
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(async () => ({
          data: [
            {
              id: "u1",
              firstName: "alice",
              username: "alice",
              emailAddresses: [],
            },
            {
              id: "u2",
              firstName: "bob",
              username: "bob",
              emailAddresses: [],
            },
          ],
        })),
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

  it("filters out entries whose userId Clerk doesn't recognise", async () => {
    await ctx.db.tests.insert(row({ id: "t_a", userId: "deleted_user" }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries).toEqual([]);
  });

  it("returns no entries when the Clerk lookup itself throws", async () => {
    mockClerkClient.mockRejectedValue(new Error("clerk-down"));
    await ctx.db.tests.insert(row({ id: "t_a", userId: "u1" }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries).toEqual([]);
  });

  it("re-ranks contiguously after filtering out unknown users", async () => {
    mockClerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn(async () => ({
          data: [
            {
              id: "u2",
              firstName: "alice",
              username: "alice",
              emailAddresses: [],
            },
          ],
        })),
      },
    } as unknown as Awaited<ReturnType<typeof clerkClient>>);
    await ctx.db.tests.insert(row({ id: "t_unknown", userId: "u1", wpm: 200 }));
    await ctx.db.tests.insert(row({ id: "t_known", userId: "u2", wpm: 100 }));
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries.map((e) => e.testId)).toEqual(["t_known"]);
    expect(res.entries[0]?.rank).toBe(1);
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

  it("preset=w25 filters to runs whose amount is 25", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_25", userId: "u1", durationOrWordCount: 25 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_50", userId: "u2", durationOrWordCount: 50 }),
    );
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: { preset: "w25" },
      db: ctx.db,
    });
    expect(res.entries.map((e) => e.testId)).toEqual(["t_25"]);
    expect(res.preset).toBe("w25");
  });

  it("preset=any (default) is unfiltered on amount", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_25", userId: "u1", durationOrWordCount: 25 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_50", userId: "u2", durationOrWordCount: 50 }),
    );
    const res = await callRoute<LeaderboardOutput>(["leaderboard", "list"], {
      input: {},
      db: ctx.db,
    });
    expect(res.entries.length).toBe(2);
    expect(res.preset).toBe("any");
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
