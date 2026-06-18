import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { liveSpectators } from "@/db/schema/server/live-spectators";
import {
  _resetSweepThrottle,
  liveSpectatorsRepo,
  SPECTATOR_SWEEP_STALE_MS,
} from "@/db/server/repositories/live-spectators";
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

  /** Backdate a row's updated_at so it reads as stale. */
  async function backdate(
    broadcasterId: string,
    spectatorId: string,
    ageMs: number,
  ) {
    await ctx.db.$drizzle
      .update(liveSpectators)
      .set({ updatedAt: new Date(Date.now() - ageMs) })
      .where(
        and(
          eq(liveSpectators.broadcasterId, broadcasterId),
          eq(liveSpectators.spectatorId, spectatorId),
        ),
      );
  }

  async function allRows() {
    return ctx.db.$drizzle
      .select({ spectatorId: liveSpectators.spectatorId })
      .from(liveSpectators);
  }

  it("sweep deletes stale rows and keeps fresh ones", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    await ctx.db.liveSpectators.touch("caster", "bob");
    await ctx.db.liveSpectators.touch("other", "carol");
    await backdate("caster", "alice", SPECTATOR_SWEEP_STALE_MS + 5_000);
    await backdate("other", "carol", SPECTATOR_SWEEP_STALE_MS + 5_000);

    await ctx.db.liveSpectators._sweep();

    const left = (await allRows()).map((r) => r.spectatorId);
    expect(left).toEqual(["bob"]);
  });

  it("listFor lazily sweeps stale rows once the throttle window passes", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    await backdate("caster", "alice", SPECTATOR_SWEEP_STALE_MS + 5_000);

    // The throttle is per-process (module scope) — clear it so this read
    // behaves like the first one after the window elapsed.
    _resetSweepThrottle();
    const repo = liveSpectatorsRepo(ctx.db.$drizzle);
    expect(await repo.listFor("caster", 5_000)).toEqual([]);
    expect(await allRows()).toEqual([]);
  });

  it("sweep keeps a row exactly at the stale boundary's fresh side", async () => {
    await ctx.db.liveSpectators.touch("caster", "alice");
    await backdate("caster", "alice", SPECTATOR_SWEEP_STALE_MS - 10_000);
    await ctx.db.liveSpectators._sweep();
    expect((await allRows()).map((r) => r.spectatorId)).toEqual(["alice"]);
  });
});
