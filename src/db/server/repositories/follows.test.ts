import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

describe("followsRepo", () => {
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

  it("follow creates a directed edge; isFollowing reflects direction", async () => {
    const { created } = await ctx.db.follows.follow("a", "b");
    expect(created).toBe(true);
    expect(await ctx.db.follows.isFollowing("a", "b")).toBe(true);
    // Direction matters — b does not follow a.
    expect(await ctx.db.follows.isFollowing("b", "a")).toBe(false);
  });

  it("block(A,B) atomically refuses follow(A,B) — forward block", async () => {
    await ctx.db.blocks.block("a", "b");
    const { created } = await ctx.db.follows.follow("a", "b");
    expect(created).toBe(false);
    expect(await ctx.db.follows.isFollowing("a", "b")).toBe(false);
  });

  it("block(A,B) atomically refuses follow(B,A) — reverse (either-direction) block", async () => {
    await ctx.db.blocks.block("a", "b");
    const { created } = await ctx.db.follows.follow("b", "a");
    expect(created).toBe(false);
    expect(await ctx.db.follows.isFollowing("b", "a")).toBe(false);
  });

  it("no block — follow still creates the edge", async () => {
    const { created } = await ctx.db.follows.follow("a", "b");
    expect(created).toBe(true);
    expect(await ctx.db.follows.isFollowing("a", "b")).toBe(true);
  });

  it("the block guard lifts once the block is removed", async () => {
    await ctx.db.blocks.block("a", "b");
    expect((await ctx.db.follows.follow("a", "b")).created).toBe(false);
    await ctx.db.blocks.unblock("a", "b");
    const { created } = await ctx.db.follows.follow("a", "b");
    expect(created).toBe(true);
    expect(await ctx.db.follows.isFollowing("a", "b")).toBe(true);
  });

  it("after a mutual pair is severed by a block, neither side can re-follow", async () => {
    // Friends, then A blocks B the way the route does: record the block,
    // then sever both follow edges. The atomic guard must then refuse a
    // re-follow from EITHER side while the block stands.
    await ctx.db.follows.follow("a", "b");
    await ctx.db.follows.follow("b", "a");
    expect(await ctx.db.follows.isMutual("a", "b")).toBe(true);

    await ctx.db.blocks.block("a", "b");
    await ctx.db.follows.unfollow("a", "b");
    await ctx.db.follows.unfollow("b", "a");

    expect((await ctx.db.follows.follow("a", "b")).created).toBe(false);
    expect((await ctx.db.follows.follow("b", "a")).created).toBe(false);
    expect(await ctx.db.follows.isMutual("a", "b")).toBe(false);
  });

  it("follow is idempotent — second call reports created:false", async () => {
    expect((await ctx.db.follows.follow("a", "b")).created).toBe(true);
    expect((await ctx.db.follows.follow("a", "b")).created).toBe(false);
    expect(await ctx.db.follows.followingCount("a")).toBe(1);
  });

  it("self-follow is refused and writes nothing", async () => {
    const { created } = await ctx.db.follows.follow("a", "a");
    expect(created).toBe(false);
    expect(await ctx.db.follows.isFollowing("a", "a")).toBe(false);
    expect(await ctx.db.follows.followingCount("a")).toBe(0);
  });

  it("unfollow removes only the one direction", async () => {
    await ctx.db.follows.follow("a", "b");
    await ctx.db.follows.follow("b", "a");
    await ctx.db.follows.unfollow("a", "b");
    expect(await ctx.db.follows.isFollowing("a", "b")).toBe(false);
    // The reciprocal edge survives.
    expect(await ctx.db.follows.isFollowing("b", "a")).toBe(true);
  });

  it("isMutual is true only when both directions exist", async () => {
    await ctx.db.follows.follow("a", "b");
    expect(await ctx.db.follows.isMutual("a", "b")).toBe(false);
    await ctx.db.follows.follow("b", "a");
    expect(await ctx.db.follows.isMutual("a", "b")).toBe(true);
    // Symmetric.
    expect(await ctx.db.follows.isMutual("b", "a")).toBe(true);
    // Self is never mutual.
    expect(await ctx.db.follows.isMutual("a", "a")).toBe(false);
  });

  it("listFollowing / listFollowers return the correct sides", async () => {
    await ctx.db.follows.follow("a", "b");
    await ctx.db.follows.follow("a", "c");
    await ctx.db.follows.follow("d", "a");

    const following = await ctx.db.follows.listFollowing("a");
    expect(following.map((e) => e.userId).sort()).toEqual(["b", "c"]);

    const followers = await ctx.db.follows.listFollowers("a");
    expect(followers.map((e) => e.userId)).toEqual(["d"]);
  });

  it("listFriends returns only mutual edges", async () => {
    // a<->b mutual, a->c one-way, d->a one-way.
    await ctx.db.follows.follow("a", "b");
    await ctx.db.follows.follow("b", "a");
    await ctx.db.follows.follow("a", "c");
    await ctx.db.follows.follow("d", "a");

    const friends = await ctx.db.follows.listFriends("a");
    expect(friends.map((e) => e.userId)).toEqual(["b"]);
  });

  it("listFollowing is newest-first by createdAt", async () => {
    await ctx.db.follows.follow("a", "old");
    // Force a distinct, later timestamp on the second edge so ordering
    // is deterministic (defaultNow() can collide within the same ms).
    await ctx.db.$drizzle.execute(
      sql`insert into follows (follower_id, followee_id, created_at) values ('a', 'new', now() + interval '1 second')`,
    );
    const following = await ctx.db.follows.listFollowing("a");
    expect(following[0]?.userId).toBe("new");
    expect(following[1]?.userId).toBe("old");
  });

  it("listFollowers is newest-first by createdAt", async () => {
    await ctx.db.follows.follow("old", "a");
    await ctx.db.$drizzle.execute(
      sql`insert into follows (follower_id, followee_id, created_at) values ('new', 'a', now() + interval '1 second')`,
    );
    const followers = await ctx.db.follows.listFollowers("a");
    expect(followers[0]?.userId).toBe("new");
    expect(followers[1]?.userId).toBe("old");
  });

  it("counts track both directions independently", async () => {
    await ctx.db.follows.follow("a", "b");
    await ctx.db.follows.follow("a", "c");
    await ctx.db.follows.follow("d", "a");
    expect(await ctx.db.follows.followingCount("a")).toBe(2);
    expect(await ctx.db.follows.followerCount("a")).toBe(1);
  });
});
