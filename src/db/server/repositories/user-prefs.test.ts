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

  it("bulkGet returns a Map of userId → blob for rows that exist", async () => {
    await ctx.db.userPrefs.set("u1", { selectedTags: ["og"] });
    await ctx.db.userPrefs.set("u2", { selectedTags: [] });
    const out = await ctx.db.userPrefs.bulkGet(["u1", "u2", "u3"]);
    expect(out.size).toBe(2);
    expect(out.get("u1")).toEqual({ selectedTags: ["og"] });
    expect(out.get("u2")).toEqual({ selectedTags: [] });
    expect(out.has("u3")).toBe(false);
  });

  it("bulkGet short-circuits an empty input", async () => {
    const out = await ctx.db.userPrefs.bulkGet([]);
    expect(out.size).toBe(0);
  });

  it("merge writes into the existing blob without clobbering unrelated keys", async () => {
    await ctx.db.userPrefs.set("u1", {
      caret: { style: "block" },
      behaviour: { strictSpace: true },
    });
    await ctx.db.userPrefs.merge("u1", { selectedTags: ["og"] });
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      caret: { style: "block" },
      behaviour: { strictSpace: true },
      selectedTags: ["og"],
    });
  });

  it("merge creates the row when none exists", async () => {
    await ctx.db.userPrefs.merge("u_new", { selectedTags: [] });
    expect(await ctx.db.userPrefs.get("u_new")).toEqual({
      selectedTags: [],
    });
  });

  it("merge overrides existing keys with the patch", async () => {
    await ctx.db.userPrefs.set("u1", { selectedTags: ["og"] });
    await ctx.db.userPrefs.merge("u1", { selectedTags: ["owner", "og"] });
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      selectedTags: ["owner", "og"],
    });
  });

  it("incrementDrillsCompleted bumps server-side from no row (FT-029)", async () => {
    await ctx.db.userPrefs.incrementDrillsCompleted("u_d");
    await ctx.db.userPrefs.incrementDrillsCompleted("u_d");
    const blob = await ctx.db.userPrefs.get("u_d");
    expect((blob.lifetimeStats as { drillsCompleted: number }).drillsCompleted).toBe(2);
  });

  it("incrementDrillsCompleted preserves other slices + lifetimeStats fields", async () => {
    await ctx.db.userPrefs.set("u_d2", {
      caret: { style: "block" },
      lifetimeStats: { drillsCompleted: 5, racesWon: 3 },
    });
    await ctx.db.userPrefs.incrementDrillsCompleted("u_d2");
    expect(await ctx.db.userPrefs.get("u_d2")).toEqual({
      caret: { style: "block" },
      lifetimeStats: { drillsCompleted: 6, racesWon: 3 },
    });
  });
});
