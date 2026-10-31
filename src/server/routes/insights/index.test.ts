import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { sql } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { Database } from "@/db/server";
import { testAnalyses } from "@/db/schema/server/test-analyses";
import { tests as testsTable } from "@/db/schema/server/tests";
import { createTestDatabase } from "@/db/server/testing";
import { ZodError } from "zod";
import { BackendError } from "@/lib/errors";
import { fixtureData, mergeFixtures, type FixtureData, type FixtureOptions } from "@/lib/typing-analysis/pooled/digest-fixtures";
import { assembleUsual } from "@/lib/typing-analysis/pooled/usual-reference";
import { _resetRateLimitStore } from "@/server/middleware/rate-limit";
import { callRoute } from "@/server/testing";
import type { ClearAnalysesOutput, InsightsOverviewOutput, InsightsUsualOutput } from "@/types/insights";

const OWN_DB_TIMEOUT_MS = 30_000;
const DAY = 86_400_000;
const MIN = 60_000;
/** Fixtures dated just before now, so "the last 30 days" means something. */
const recentStart = (days: number) => Date.now() - days * DAY;
const data = (o: FixtureOptions) => fixtureData({ startMs: recentStart(20), ...o });

function signedInAs(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId, sessionClaims: userId ? {} : null } as unknown as Awaited<ReturnType<typeof auth>>);
}

async function seed(db: Database, userId: string, f: FixtureData, withDigests = true) {
  if (f.rows.length === 0) return;
  await db.$drizzle.insert(testsTable).values(f.rows.map((r) => ({
    ...r, userId, completedAt: new Date(r.startedAt.getTime() + 30_000), resetCount: 0,
  })));
  if (!withDigests) return;
  await db.$drizzle.insert(testAnalyses).values(f.rows.map((r) => ({
    testId: r.id, userId, startedAt: r.startedAt, bucket: f.index.get(r.id)!.bucket, version: 1, digest: f.digests.get(r.id)!,
  })));
}

/** A database without the analysis table (an unmigrated dev DB). */
async function withoutTable<T>(run: (db: Database) => Promise<T>): Promise<T> {
  const own = await createTestDatabase();
  try {
    await own.db.$drizzle.execute(sql.raw("DROP TABLE test_analyses"));
    return await run(own.db);
  } finally {
    await own.close();
  }
}

/** In process the pipeline throws the ZodError; the dispatcher sends it as
 *  400 VALIDATION (backend-rules R7). */
const expectInvalid = (p: Promise<unknown>) => expect(p).rejects.toBeInstanceOf(ZodError);
const expectError = async (p: Promise<unknown>, status: number, code: string) => {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(BackendError);
  expect(err).toMatchObject({ status, code });
};

describe("insights namespace", () => {
  let ctx: Awaited<ReturnType<typeof createTestDatabase>>;
  const overview = (input: unknown = {}, db = ctx.db) => callRoute<InsightsOverviewOutput>(["insights", "overview"], { db, input });
  const usual = (input: unknown, db = ctx.db) => callRoute<InsightsUsualOutput>(["insights", "usual"], { db, input });
  const clear = (db = ctx.db) => callRoute<ClearAnalysesOutput>(["insights", "clear"], { db });

  beforeAll(async () => {
    ctx = await createTestDatabase();
  });
  beforeEach(async () => {
    _resetRateLimitStore();
    vi.mocked(auth).mockReset();
    vi.mocked(clerkClient).mockReset();
    signedInAs("u1");
    await ctx.reset();
  });
  afterAll(async () => {
    expect(vi.mocked(clerkClient)).not.toHaveBeenCalled();
    await ctx.close();
  });

  describe("every route", () => {
    it("rejects signed-out callers with 401", async () => {
      signedInAs(null);
      await expectError(overview(), 401, "UNAUTHORIZED");
      await expectError(usual({ bucket: "casual|words|25", beforeMs: 1, fixMode: "fix" }), 401, "UNAUTHORIZED");
      await expectError(clear(), 401, "UNAUTHORIZED");
    });
    it("reads only the caller's rows, never Clerk, and ignores a user id in the input", async () => {
      await seed(ctx.db, "u1", data({ tests: 30 }));
      const before = await overview();
      await seed(ctx.db, "u2", data({ tests: 40, idPrefix: "x", wpm: 120, mode: "training" }));
      const after = await overview({ userId: "u2" });
      expect(after).toEqual(before);
      expect(after.buckets.map((b) => b.key)).toEqual(["casual|words|25"]);
      const u = await usual({ bucket: "casual|words|25", beforeMs: Date.now(), fixMode: "fix", userId: "u2" });
      expect(u.reference?.n).toBe(30);
      expect(vi.mocked(clerkClient)).not.toHaveBeenCalled();
    });
  });

  describe("overview", () => {
    it("returns the whole page for an established typist", async () => {
      await seed(ctx.db, "u1", data({ tests: 45 }));
      const o = await overview();
      expect(o).toMatchObject({ status: "ready", bucket: { key: "casual|words|25", tests: 45, analysed: 45 } });
      expect(o.time.status).toBe("ready");
      expect(o.headline!.range).not.toBeNull();
      expect(o.series!.points).toHaveLength(45);
      expect(o.practice).toEqual({ pairs: [], words: [], weaknessReady: false, worstWordsReady: false });
      expect(o.cold).toBe(true);
    });
    it("rejects a malformed bucket", async () => {
      await expectInvalid(overview({ bucket: "casual|words" }));
      await expectInvalid(overview({ bucket: "x".repeat(81) }));
    });
    it("is empty for a new user", async () => {
      expect((await overview()).status).toBe("empty");
    });
    it("defaults to all Adapt tests when there are some, and falls back to it", async () => {
      const old = fixtureData({ tests: 30, length: 50, idPrefix: "o", startMs: recentStart(200) });
      await seed(ctx.db, "u1", mergeFixtures([old, data({ tests: 6, mode: "training" })]));
      expect((await overview()).bucket!.key).toBe("training|all");
      expect((await overview({ bucket: "race|words|25" })).bucket!.key).toBe("training|all");
      expect((await overview({ bucket: "training|words|25" })).bucket!.key).toBe("training|words|25");
      expect((await overview({ bucket: "casual|words|50" })).bucket).toMatchObject({ key: "casual|words|50", tests: 30 });
    });
    it("without Adapt tests, defaults to the bucket with the most tests in the last 30 days", async () => {
      const old = fixtureData({ tests: 30, length: 50, idPrefix: "o", startMs: recentStart(200) });
      await seed(ctx.db, "u1", mergeFixtures([old, data({ tests: 6 })]));
      const o = await overview({ bucket: "training|all" });
      expect(o.bucket!.key).toBe("casual|words|25");
      expect(o.buckets.map((b) => b.key)).not.toContain("training|all");
    });
    it("pools every Adapt length, each scaled to the most played one", async () => {
      // 25 words is played most; 60 seconds runs slower; 10 words has too
      // few tests to be scaled yet.
      await seed(ctx.db, "u1", mergeFixtures([
        data({ tests: 20, mode: "training", wpm: 80, idPrefix: "a", seed: 2, startMs: recentStart(10) }),
        data({ tests: 12, mode: "training", wpm: 60, lengthMode: "time", length: 60, idPrefix: "b", seed: 3, startMs: recentStart(20) }),
        data({ tests: 3, mode: "training", length: 10, idPrefix: "c", seed: 4, startMs: recentStart(30) }),
      ]));
      const o = await overview();
      expect(o.bucket).toMatchObject({
        key: "training|all", lengthMode: "words", length: 25, tests: 32, analysed: 32,
        all: { kinds: 2, leftOut: 3 },
      });
      expect(o.buckets[0]!.key).toBe("training|all");
      expect(o.buckets.map((b) => b.key)).toEqual(expect.arrayContaining(["training|words|25", "training|time|60"]));
      // The slower 60-second tests are lifted to the 25-word footing, so
      // the usual speed sits near the 25-word usual, not between the two.
      const own = await overview({ bucket: "training|words|25" });
      expect(Math.abs(o.headline!.usual - own.headline!.usual)).toBeLessThanOrEqual(3);
      expect(o.series!.scaled).toBe(true);
      expect(o.series!.points.every((p) => !p.pb)).toBe(true);
      // Digests of both pooled lengths are read, so the minute is ready.
      expect(o.time.status).toBe("ready");
    });
    it("rejects other pooled names, and the pooled view where one run is compared", async () => {
      await expectInvalid(overview({ bucket: "casual|all" }));
      await expectInvalid(usual({ bucket: "training|all", beforeMs: 1, fixMode: "fix" }));
    });
    it("keeps perfect 30-word Adapt runs that have a stored digest, beyond the 40 it loads", async () => {
      const perfect = data({ tests: 50, mode: "training", length: 30, accuracy: 100, accSd: 0, idPrefix: "a", seed: 3 });
      await seed(ctx.db, "u1", mergeFixtures([perfect, fixtureData({ tests: 8, idPrefix: "b", startMs: recentStart(60) })]));
      const o = await overview({ bucket: "training|words|30" });
      expect(o.bucket).toMatchObject({ key: "training|words|30", tests: 50, analysed: 50 });
      expect(o.buckets.find((b) => b.key === "training|words|30")).toMatchObject({ tests: 50, analysed: 50 });
      expect(o.series!.points).toHaveLength(50);
      expect((await overview()).bucket).toMatchObject({ key: "training|all", tests: 50 });
    });
    it("excludes MonkeyType imports", async () => {
      await seed(ctx.db, "u1", data({ tests: 8, idPrefix: "mt_" }), false);
      expect((await overview()).status).toBe("empty");
    });
    it("adjusts an Adapt bucket when 80% of its tests carry a difficulty", async () => {
      await seed(ctx.db, "u1", data({ tests: 30, mode: "training", diff: 1 }));
      const o = await overview();
      expect(o.headline!.adjusted).toBe(true);
      expect(o.series!.adjusted).toBe(true);
    });
    it("is not-ready without the analysis table, with speed and the chart still there (I7)", async () => {
      const o = await withoutTable(async (db) => {
        await seed(db, "u1", data({ tests: 20 }), false);
        return overview({}, db);
      });
      expect(o.status).toBe("not-ready");
      expect(o.headline).not.toBeNull();
      expect(o.series).not.toBeNull();
      expect(o.time).toEqual({ status: "not-ready" });
    }, OWN_DB_TIMEOUT_MS);
    it("allows 20 calls a minute", async () => {
      for (let i = 0; i < 20; i++) await overview();
      await expectError(overview(), 429, "RATE_LIMITED");
    });
  });

  describe("usual", () => {
    const start = recentStart(10);
    const sessions = (n: number, size: number) => data({ tests: n * size, perDay: [1, 1], sessions: Array(n).fill(size), startMs: start });
    const newest = (f: FixtureData) => f.rows[0]!.startedAt.getTime();

    it("rejects a bad fix mode, a malformed bucket and a negative time", async () => {
      await expectInvalid(usual({ bucket: "casual|words|25", beforeMs: 1, fixMode: "maybe" }));
      await expectInvalid(usual({ bucket: "casual|25", beforeMs: 1, fixMode: "fix" }));
      await expectInvalid(usual({ bucket: "casual|words|25", beforeMs: -1, fixMode: "fix" }));
    });
    it("uses the tests before the current session", async () => {
      const f = sessions(8, 5);
      await seed(ctx.db, "u1", f);
      const r = await usual({ bucket: "casual|words|25", beforeMs: newest(f) + 3 * MIN, fixMode: "fix" });
      expect(r).toMatchObject({ status: "ready", reference: { kind: "usual", n: 30 } });
      expect(r.slices).not.toBeNull();
    });
    it("reads the reference's own digests after a long current session", async () => {
      const f = mergeFixtures([
        data({ tests: 30, idPrefix: "e" }),
        data({ tests: 36, idPrefix: "s", sessions: [36], perDay: [1, 1], gapMin: 1, startMs: recentStart(1) }),
      ]);
      await seed(ctx.db, "u1", f);
      const input = { bucket: "casual|words|25", beforeMs: newest(f) + MIN, fixMode: "fix" as const };
      const r = await usual(input);
      expect(r.reference).toEqual({ kind: "usual", n: 30 });
      expect(r.slices).not.toBeNull();
      // The medians over all 30 reference digests.
      expect(r.slices).toEqual(assembleUsual({ rows: f.rows, index: f.index, digests: f.digests, input, nowMs: Date.now() }).slices);
    });
    it("treats a beforeMs past year 9999 as after every test", async () => {
      const f = sessions(8, 5);
      await seed(ctx.db, "u1", f);
      const r = await usual({ bucket: "casual|words|25", beforeMs: Number.MAX_SAFE_INTEGER, fixMode: "fix" });
      expect(r).toMatchObject({ status: "ready", reference: { kind: "usual", n: 30 } });
      expect((await usual({ bucket: "casual|words|50", beforeMs: 8_640_000_000_000_000, fixMode: "fix" })).status).toBe("learning");
    });
    it("never counts a test that started at or after beforeMs", async () => {
      const f = sessions(1, 6);
      await seed(ctx.db, "u1", f);
      expect((await usual({ bucket: "casual|words|25", beforeMs: newest(f), fixMode: "fix" })).reference)
        .toEqual({ kind: "earlier-today", n: 5 });
    });
    it("falls back to earlier tests today", async () => {
      const f = sessions(1, 7);
      await seed(ctx.db, "u1", f);
      expect((await usual({ bucket: "casual|words|25", beforeMs: newest(f) + 3 * MIN, fixMode: "fix" })).reference)
        .toEqual({ kind: "earlier-today", n: 7 });
    });
    it("is learning below 5 tests, with the real count", async () => {
      const f = sessions(1, 2);
      await seed(ctx.db, "u1", f);
      expect(await usual({ bucket: "casual|words|25", beforeMs: newest(f) + 3 * MIN, fixMode: "fix" }))
        .toMatchObject({ status: "learning", gate: { have: 2, need: 5, unit: "tests" } });
    });
    it("compares fixing only within the same fix mode", async () => {
      const f = data({ tests: 30, fixMode: "none", startMs: start });
      await seed(ctx.db, "u1", f);
      const later = newest(f) + 300 * MIN;
      expect((await usual({ bucket: "casual|words|25", beforeMs: later, fixMode: "fix" })).slices).toBeNull();
      expect((await usual({ bucket: "casual|words|25", beforeMs: later, fixMode: "none" })).slices).not.toBeNull();
    });
    it("is not-ready without the analysis table", async () => {
      const r = await withoutTable(async (db) => {
        await seed(db, "u1", data({ tests: 10 }), false);
        return usual({ bucket: "casual|words|25", beforeMs: Date.now(), fixMode: "fix" }, db);
      });
      expect(r.status).toBe("not-ready");
      expect(r.slices).toBeNull();
    }, OWN_DB_TIMEOUT_MS);
  });

  describe("clear", () => {
    it("deletes only the caller's analyses and returns the count", async () => {
      await seed(ctx.db, "u1", data({ tests: 6 }));
      await seed(ctx.db, "u2", data({ tests: 4, idPrefix: "x" }));
      expect(await clear()).toEqual({ deleted: 6 });
      expect(await ctx.db.testAnalyses.listForUser("u2", { limit: 10 })).toHaveLength(4);
      expect(await ctx.db.testAnalyses.listForUser("u1", { limit: 10 })).toHaveLength(0);
      const o = await overview();
      expect(o.bucket!.analysed).toBe(0);
    });
    it("gives { deleted: 0 } without the analysis table", async () => {
      expect(await withoutTable((db) => clear(db))).toEqual({ deleted: 0 });
    }, OWN_DB_TIMEOUT_MS);
    it("allows 3 calls a minute", async () => {
      for (let i = 0; i < 3; i++) await clear();
      await expectError(clear(), 429, "RATE_LIMITED");
    });
  });
});
