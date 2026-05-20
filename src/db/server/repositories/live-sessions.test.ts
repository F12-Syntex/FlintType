import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";
import type { LiveSnapshot } from "@/types/live";

const SNAP: LiveSnapshot = {
  words: ["the", "fox"],
  progressChars: 3,
  totalChars: 7,
  wpm: 80,
  accuracy: 98,
};

describe("liveSessionsRepo", () => {
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

  it("set then get round-trips the snapshot + a timestamp", async () => {
    await ctx.db.liveSessions.set("u1", SNAP);
    const entry = await ctx.db.liveSessions.get("u1");
    expect(entry?.snapshot.wpm).toBe(80);
    expect(entry?.snapshot.words).toEqual(["the", "fox"]);
    expect(entry?.updatedAt).toBeInstanceOf(Date);
  });

  it("set upserts (no duplicate rows; latest snapshot wins)", async () => {
    await ctx.db.liveSessions.set("u1", SNAP);
    await ctx.db.liveSessions.set("u1", { ...SNAP, progressChars: 6, wpm: 100 });
    const entry = await ctx.db.liveSessions.get("u1");
    expect(entry?.snapshot.progressChars).toBe(6);
    expect(entry?.snapshot.wpm).toBe(100);
  });

  it("get returns null for a user with no session", async () => {
    expect(await ctx.db.liveSessions.get("nobody")).toBeNull();
  });

  it("clear removes the row", async () => {
    await ctx.db.liveSessions.set("u1", SNAP);
    await ctx.db.liveSessions.clear("u1");
    expect(await ctx.db.liveSessions.get("u1")).toBeNull();
  });

  it("getForUsers batches present rows and omits absent ones", async () => {
    await ctx.db.liveSessions.set("u1", SNAP);
    await ctx.db.liveSessions.set("u2", { ...SNAP, wpm: 120 });
    const map = await ctx.db.liveSessions.getForUsers(["u1", "u2", "ghost"]);
    expect(map.size).toBe(2);
    expect(map.get("u1")?.snapshot.wpm).toBe(80);
    expect(map.get("u2")?.snapshot.wpm).toBe(120);
    expect(map.get("u1")?.updatedAt).toBeInstanceOf(Date);
    expect(map.has("ghost")).toBe(false);
  });

  it("getForUsers returns an empty map for no ids", async () => {
    expect((await ctx.db.liveSessions.getForUsers([])).size).toBe(0);
  });
});
