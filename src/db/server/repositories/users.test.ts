import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "@/db/server/testing";

describe("users repo", () => {
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

  it("ensureForUser inserts a fresh row with monotonic seq", async () => {
    const a = await ctx.db.users.ensureForUser("user_a");
    const b = await ctx.db.users.ensureForUser("user_b");
    expect(a.created).toBe(true);
    expect(b.created).toBe(true);
    expect(a.row.seq).toBe(1);
    expect(b.row.seq).toBe(2);
    expect(b.row.seq - a.row.seq).toBe(1);
  });

  it("is idempotent — second call for the same id returns the existing row, created=false", async () => {
    const first = await ctx.db.users.ensureForUser("user_a");
    const second = await ctx.db.users.ensureForUser("user_a");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.row.id).toBe(first.row.id);
    expect(second.row.seq).toBe(first.row.seq);
  });

  it("findById returns null for a never-seen user", async () => {
    expect(await ctx.db.users.findById("user_zzz")).toBeNull();
  });

  it("findById returns the row after ensure", async () => {
    await ctx.db.users.ensureForUser("user_a");
    const row = await ctx.db.users.findById("user_a");
    expect(row).not.toBeNull();
    expect(row?.id).toBe("user_a");
  });

  it("count tracks materialised users", async () => {
    expect(await ctx.db.users.count()).toBe(0);
    await ctx.db.users.ensureForUser("user_a");
    await ctx.db.users.ensureForUser("user_b");
    await ctx.db.users.ensureForUser("user_a");
    expect(await ctx.db.users.count()).toBe(2);
  });
});
