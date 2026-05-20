import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

describe("blocksRepo", () => {
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

  it("block records a directed block; isBlocked reflects direction", async () => {
    const { created } = await ctx.db.blocks.block("a", "b");
    expect(created).toBe(true);
    expect(await ctx.db.blocks.isBlocked("a", "b")).toBe(true);
    expect(await ctx.db.blocks.isBlocked("b", "a")).toBe(false);
  });

  it("block is idempotent", async () => {
    expect((await ctx.db.blocks.block("a", "b")).created).toBe(true);
    expect((await ctx.db.blocks.block("a", "b")).created).toBe(false);
  });

  it("self-block is refused", async () => {
    const { created } = await ctx.db.blocks.block("a", "a");
    expect(created).toBe(false);
    expect(await ctx.db.blocks.isBlocked("a", "a")).toBe(false);
  });

  it("eitherBlocks is true when a block exists in either direction", async () => {
    expect(await ctx.db.blocks.eitherBlocks("a", "b")).toBe(false);
    await ctx.db.blocks.block("b", "a");
    // Only b→a exists, but eitherBlocks is symmetric.
    expect(await ctx.db.blocks.eitherBlocks("a", "b")).toBe(true);
    expect(await ctx.db.blocks.eitherBlocks("b", "a")).toBe(true);
  });

  it("unblock clears the block", async () => {
    await ctx.db.blocks.block("a", "b");
    await ctx.db.blocks.unblock("a", "b");
    expect(await ctx.db.blocks.isBlocked("a", "b")).toBe(false);
    expect(await ctx.db.blocks.eitherBlocks("a", "b")).toBe(false);
  });

  it("listBlocked returns the caller's blocked users", async () => {
    await ctx.db.blocks.block("a", "b");
    await ctx.db.blocks.block("a", "c");
    await ctx.db.blocks.block("x", "a");
    const blocked = await ctx.db.blocks.listBlocked("a");
    expect(blocked.map((e) => e.userId).sort()).toEqual(["b", "c"]);
  });

  it("listBlocked is newest-first by createdAt", async () => {
    await ctx.db.blocks.block("a", "old");
    await ctx.db.$drizzle.execute(
      sql`insert into blocks (blocker_id, blocked_id, created_at) values ('a', 'new', now() + interval '1 second')`,
    );
    const blocked = await ctx.db.blocks.listBlocked("a");
    expect(blocked[0]?.userId).toBe("new");
    expect(blocked[1]?.userId).toBe("old");
  });
});
