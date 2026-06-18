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

  it("round-trips a lengthMode discriminator", async () => {
    await ctx.db.tests.insert(row({ id: "t_time", lengthMode: "time" }));
    const found = await ctx.db.tests.findById("t_time");
    expect(found?.lengthMode).toBe("time");
  });

  it("persists null lengthMode for legacy-style rows", async () => {
    // A row submitted without the discriminator (older client) — the
    // column defaults to null, never guessed.
    await ctx.db.tests.insert(row({ id: "t_legacy" }));
    const found = await ctx.db.tests.findById("t_legacy");
    expect(found?.lengthMode).toBeNull();
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

  it("findById returns the row when present", async () => {
    await ctx.db.tests.insert(row({ id: "t_seek", userId: "u1", wpm: 137 }));
    const found = await ctx.db.tests.findById("t_seek");
    expect(found?.id).toBe("t_seek");
    expect(found?.wpm).toBe(137);
  });

  it("findById returns null for an unknown id", async () => {
    const found = await ctx.db.tests.findById("t_missing");
    expect(found).toBeNull();
  });

  it("findByIdPrefix returns the unique row when one matches", async () => {
    await ctx.db.tests.insert(row({ id: "a3f9c0d1-2b4e-4f1a-9c8d-0123456789ab", wpm: 92 }));
    const found = await ctx.db.tests.findByIdPrefix("a3f9c0d1");
    expect(found?.wpm).toBe(92);
  });

  it("findByIdPrefix returns null when nothing matches", async () => {
    expect(await ctx.db.tests.findByIdPrefix("deadbeef")).toBeNull();
  });

  it("findByIdPrefix returns null when the prefix is ambiguous (caller treats as NOT_FOUND)", async () => {
    await ctx.db.tests.insert(row({ id: "abc12345-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }));
    await ctx.db.tests.insert(row({ id: "abc12345-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }));
    expect(await ctx.db.tests.findByIdPrefix("abc12345")).toBeNull();
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

  it("topLeaderboard restricts to a userIds allowlist (friends board)", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_u1", userId: "u1", wpm: 120, accuracy: 100 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_u2", userId: "u2", wpm: 80, accuracy: 100 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t_u3", userId: "u3", wpm: 60, accuracy: 100 }),
    );
    // Only u2 + u3 are in scope; u1 (the fastest) is excluded.
    const rows = await ctx.db.tests.topLeaderboard({ userIds: ["u2", "u3"] });
    expect(rows.map((r) => r.userId).sort()).toEqual(["u2", "u3"]);
    expect(rows.some((r) => r.userId === "u1")).toBe(false);
  });

  it("topLeaderboard returns nothing for an empty userIds set", async () => {
    await ctx.db.tests.insert(
      row({ id: "t_u1", userId: "u1", wpm: 120, accuracy: 100 }),
    );
    const rows = await ctx.db.tests.topLeaderboard({ userIds: [] });
    expect(rows).toEqual([]);
  });

  it("userStats aggregates a user's completed runs (zeros when none)", async () => {
    expect(await ctx.db.tests.userStats("nobody")).toEqual({
      testsCompleted: 0,
      bestWpm: 0,
      bestNetWpm: 0,
      bestAccuracy: 0,
    });
    await ctx.db.tests.insert(
      row({ id: "t1", userId: "u1", wpm: 100, accuracy: 90 }),
    );
    await ctx.db.tests.insert(
      row({ id: "t2", userId: "u1", wpm: 120, accuracy: 80 }),
    );
    // Incomplete + other users don't count.
    await ctx.db.tests.insert(
      row({ id: "t3", userId: "u1", wpm: 200, accuracy: 100, wasCompleted: false }),
    );
    await ctx.db.tests.insert(
      row({ id: "t4", userId: "u2", wpm: 300, accuracy: 100 }),
    );
    const s = await ctx.db.tests.userStats("u1");
    expect(s.testsCompleted).toBe(2);
    expect(s.bestWpm).toBe(120);
    expect(s.bestAccuracy).toBe(90);
    // best net = max(100*0.9=90, 120*0.8=96) = 96
    expect(s.bestNetWpm).toBe(96);
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

  it("bestBefore buckets by lengthMode — a words run can't see a time PB", async () => {
    const t0 = new Date(2026, 0, 1).getTime();
    // A prior completed 60-second TIME run at 130 wpm.
    await ctx.db.tests.insert(
      row({
        id: "t_time60",
        userId: "u1",
        mode: "casual",
        durationOrWordCount: 60,
        lengthMode: "time",
        wpm: 130,
        startedAt: new Date(t0),
      }),
    );
    // A new 60-WORD run looking for its prior best must NOT see the
    // time run (different length unit, same amount) — closing the
    // cross-bucket PB collision (issue #71).
    const wordsPrev = await ctx.db.tests.bestBefore(
      "u1",
      "casual",
      60,
      "words",
      t0 + 1000,
    );
    expect(wordsPrev).toBeNull();
    // The time bucket still sees its own prior best.
    const timePrev = await ctx.db.tests.bestBefore(
      "u1",
      "casual",
      60,
      "time",
      t0 + 1000,
    );
    expect(timePrev).toBe(130);
  });

  it("bestBefore does not return legacy null rows for a typed run", async () => {
    const t0 = new Date(2026, 0, 1).getTime();
    // Legacy row with no length discriminator.
    await ctx.db.tests.insert(
      row({
        id: "t_legacy60",
        userId: "u1",
        mode: "casual",
        durationOrWordCount: 60,
        lengthMode: null,
        wpm: 140,
        startedAt: new Date(t0),
      }),
    );
    // A new typed run (lengthMode = "words") is not compared against
    // the legacy null row.
    const prev = await ctx.db.tests.bestBefore(
      "u1",
      "casual",
      60,
      "words",
      t0 + 1000,
    );
    expect(prev).toBeNull();
    // …but a legacy-style lookup (lengthMode null) still finds it.
    const legacyPrev = await ctx.db.tests.bestBefore(
      "u1",
      "casual",
      60,
      null,
      t0 + 1000,
    );
    expect(legacyPrev).toBe(140);
  });

  it("topLeaderboard lengthMode filter excludes a words run from a time board", async () => {
    // A genuine 60-second TIME run, a custom 60-WORD sprint (the
    // exploit), and a legacy null-mode 60 row. The time board (amount
    // 60, lengthMode "time") must keep the time + legacy rows and drop
    // the words sprint.
    await ctx.db.tests.insert(
      row({
        id: "t_time",
        userId: "u_time",
        durationOrWordCount: 60,
        lengthMode: "time",
        wpm: 90,
        accuracy: 100,
      }),
    );
    await ctx.db.tests.insert(
      row({
        id: "t_words",
        userId: "u_words",
        durationOrWordCount: 60,
        lengthMode: "words",
        wpm: 250,
        accuracy: 100,
      }),
    );
    await ctx.db.tests.insert(
      row({
        id: "t_legacy",
        userId: "u_legacy",
        durationOrWordCount: 60,
        lengthMode: null,
        wpm: 80,
        accuracy: 100,
      }),
    );
    const rows = await ctx.db.tests.topLeaderboard({
      amount: 60,
      lengthMode: "time",
    });
    const ids = rows.map((r) => r.testId).sort();
    expect(ids).toEqual(["t_legacy", "t_time"]);
    // The inflated words sprint never reaches the time board.
    expect(rows.some((r) => r.testId === "t_words")).toBe(false);
  });

  it("topLeaderboard gives a user one slot per board, even with a legacy row", async () => {
    // Length-mode separation is the BOARD FILTER's job, not the dedupe
    // key's: a user with both a typed `time/60` row and a legacy
    // `null/60` row (both admitted to the time board) must take ONE
    // slot — their best run — not two (FT-036 regression guard).
    await ctx.db.tests.insert(
      row({
        id: "t_t",
        userId: "u1",
        durationOrWordCount: 60,
        lengthMode: "time",
        wpm: 100,
        accuracy: 100,
      }),
    );
    await ctx.db.tests.insert(
      row({
        id: "t_legacy",
        userId: "u1",
        durationOrWordCount: 60,
        lengthMode: null,
        wpm: 140,
        accuracy: 100,
      }),
    );
    const rows = await ctx.db.tests.topLeaderboard({
      amount: 60,
      lengthMode: "time",
    });
    const u1 = rows.filter((r) => r.userId === "u1");
    expect(u1).toHaveLength(1); // one slot, not two
    expect(u1[0]?.testId).toBe("t_legacy"); // their best (140 net)
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

  // ── Regression: FT-004 — JS over-fetch window starved slow users ──

  it("topLeaderboard: a user with many high-wpm runs does not crowd out a slower user (friends board case)", async () => {
    // User A has 120 completed runs, all with net WPM ≈ 200 (200 wpm × 100%).
    // User B has 1 run with net WPM ≈ 50 (50 wpm × 100%).
    // With the old limit*4=100 over-fetch window, A's 120 rows swamp
    // the window and B's single run never appears in the output.
    // After the fix (DISTINCT ON in SQL), A appears exactly once and
    // B appears too.
    for (let i = 0; i < 120; i++) {
      await ctx.db.tests.insert(
        row({
          id: `t_a_${i}`,
          userId: "userA",
          wpm: 200,
          accuracy: 100,
        }),
      );
    }
    await ctx.db.tests.insert(
      row({ id: "t_b_best", userId: "userB", wpm: 50, accuracy: 100 }),
    );

    const results = await ctx.db.tests.topLeaderboard({ limit: 25, userIds: ["userA", "userB"] });

    // Both users must appear.
    const userIds = results.map((r) => r.userId);
    expect(userIds).toContain("userA");
    expect(userIds).toContain("userB");

    // A is first (higher net WPM).
    expect(results[0]?.userId).toBe("userA");

    // A appears exactly once per bucket (same mode + durationOrWordCount
    // for all 120 runs → only 1 deduped row).
    const aRows = results.filter((r) => r.userId === "userA");
    expect(aRows.length).toBe(1);
  });

  it("topLeaderboard: each user appears once per (mode, durationOrWordCount) bucket even with many runs", async () => {
    // Two buckets: (training, 25) and (casual, 50).
    // User A has 60 runs in each bucket; user B has 1 run in each.
    for (let i = 0; i < 60; i++) {
      await ctx.db.tests.insert(row({ id: `t_a_tr_${i}`, userId: "uA", mode: "training", durationOrWordCount: 25, wpm: 150, accuracy: 100 }));
      await ctx.db.tests.insert(row({ id: `t_a_ca_${i}`, userId: "uA", mode: "casual",   durationOrWordCount: 50, wpm: 140, accuracy: 100 }));
    }
    await ctx.db.tests.insert(row({ id: "t_b_tr", userId: "uB", mode: "training", durationOrWordCount: 25, wpm: 60, accuracy: 100 }));
    await ctx.db.tests.insert(row({ id: "t_b_ca", userId: "uB", mode: "casual",   durationOrWordCount: 50, wpm: 55, accuracy: 100 }));

    const results = await ctx.db.tests.topLeaderboard({ limit: 25 });

    // Exactly 4 rows: uA×training, uA×casual, uB×training, uB×casual.
    expect(results.length).toBe(4);

    const aRows = results.filter((r) => r.userId === "uA");
    const bRows = results.filter((r) => r.userId === "uB");
    expect(aRows.length).toBe(2);
    expect(bRows.length).toBe(2);

    // uB must be present despite uA having 60× more runs per bucket.
    expect(bRows.map((r) => r.testId).sort()).toEqual(["t_b_ca", "t_b_tr"]);
  });

  it("topPlayers: a user with many runs does not crowd out a slower user", async () => {
    // User X has 120 completed runs all at net WPM ≈ 180.
    // User Y has 1 run at net WPM ≈ 40.
    // Old limit*50 window (10*50=500) is large enough here, but the
    // DISTINCT ON fix eliminates the window entirely — verify both
    // appear and X appears exactly once.
    for (let i = 0; i < 120; i++) {
      await ctx.db.tests.insert(
        row({ id: `t_x_${i}`, userId: "userX", wpm: 180, accuracy: 100 }),
      );
    }
    await ctx.db.tests.insert(
      row({ id: "t_y_best", userId: "userY", wpm: 40, accuracy: 100 }),
    );

    const results = await ctx.db.tests.topPlayers({ limit: 10 });

    const userIds = results.map((r) => r.userId);
    expect(userIds).toContain("userX");
    expect(userIds).toContain("userY");

    // X leads on net WPM.
    expect(results[0]?.userId).toBe("userX");

    // X appears exactly once (all 120 runs collapse to 1 best).
    const xRows = results.filter((r) => r.userId === "userX");
    expect(xRows.length).toBe(1);

    // Verify the attached testsCompleted count is correct.
    expect(xRows[0]?.testsCompleted).toBe(120);
    expect(results.find((r) => r.userId === "userY")?.testsCompleted).toBe(1);
  });
});
