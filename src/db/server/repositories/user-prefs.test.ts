import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing";

describe("userPrefsRepo", () => {
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

  it("returns an empty object for users with no row", async () => {
    const got = await ctx.db.userPrefs.get("user_does_not_exist");
    expect(got).toEqual({});
  });

  it("upserts on first set, replaces on second", async () => {
    await ctx.db.userPrefs.set("u1", { caret: { style: "block" } });
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      caret: { style: "block" },
    });

    await ctx.db.userPrefs.set("u1", { behaviour: { strictSpace: true } });
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      behaviour: { strictSpace: true },
    });
  });

  it("isolates rows by userId", async () => {
    await ctx.db.userPrefs.set("u1", { caret: { style: "block" } });
    await ctx.db.userPrefs.set("u2", { caret: { style: "underline" } });
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      caret: { style: "block" },
    });
    expect(await ctx.db.userPrefs.get("u2")).toEqual({
      caret: { style: "underline" },
    });
  });
});
