import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

describe("presenceRepo", () => {
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

  it("heartbeat upserts a row; getForUsers returns it", async () => {
    await ctx.db.presence.heartbeat("u1", "online");
    const rows = await ctx.db.presence.getForUsers(["u1", "u2"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe("u1");
    expect(rows[0]?.status).toBe("online");
    expect(rows[0]?.lastSeenAt).toBeInstanceOf(Date);
  });

  it("a second heartbeat updates status without duplicating the row", async () => {
    await ctx.db.presence.heartbeat("u1", "online");
    await ctx.db.presence.heartbeat("u1", "racing");
    const rows = await ctx.db.presence.getForUsers(["u1"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("racing");
  });

  it("getForUsers returns nothing for an empty list", async () => {
    await ctx.db.presence.heartbeat("u1", "online");
    expect(await ctx.db.presence.getForUsers([])).toEqual([]);
  });
});
