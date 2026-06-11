import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

describe("liveSpectatorsRepo", () => {
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

  it("touch records a watcher; listFor returns fresh ones", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    await ctx.db.liveSpectators.touch("caster", "bob");
    const watchers = await ctx.db.liveSpectators.listFor("caster", 5_000);
    expect(watchers.sort()).toEqual(["alice", "bob"]);
  });

  it("touch upserts (no duplicate rows for the same pair)", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    await ctx.db.liveSpectators.touch("caster", "alice");
    expect(await ctx.db.liveSpectators.listFor("caster", 5_000)).toEqual([
      "alice",
    ]);
  });

  it("listFor excludes stale watchers (older than the ttl)", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    // A zero ttl makes every existing row count as stale.
    expect(await ctx.db.liveSpectators.listFor("caster", 0)).toEqual([]);
  });

  it("lazily reaps stale rows on listFor, not just filters them (#1)", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    // ttl 0 → the row is stale; listFor returns none AND reaps the row.
    expect(await ctx.db.liveSpectators.listFor("caster", 0)).toEqual([]);
    // Let the fire-and-forget delete land.
    await new Promise((r) => setTimeout(r, 50));
    // A generous ttl now returns nothing because the row was deleted,
    // not merely filtered out — proving the reaper ran.
    expect(await ctx.db.liveSpectators.listFor("caster", 60_000)).toEqual([]);
  });

  it("ignores a self-watch edge", async () => {
    await ctx.db.liveSpectators.touch("caster", "caster");
    expect(await ctx.db.liveSpectators.listFor("caster", 5_000)).toEqual([]);
  });

  it("remove drops a single watcher", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    await ctx.db.liveSpectators.touch("caster", "bob");
    await ctx.db.liveSpectators.remove("caster", "alice");
    expect(await ctx.db.liveSpectators.listFor("caster", 5_000)).toEqual([
      "bob",
    ]);
  });
});
