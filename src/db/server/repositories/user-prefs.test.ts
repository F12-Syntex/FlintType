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

  it("merge deletes the listed keys while applying the patch", async () => {
    await ctx.db.userPrefs.set("u1", {
      caret: { style: "block" },
      theme: { "--primary": "#fff" },
      monkeytypeStats: { completedTests: 5 },
    });
    await ctx.db.userPrefs.merge(
      "u1",
      { caret: { style: "line" } },
      ["theme", "monkeytypeStats"],
    );
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      caret: { style: "line" },
    });
  });

  it("merge remove is a no-op for keys that don't exist", async () => {
    await ctx.db.userPrefs.set("u1", { caret: { style: "block" } });
    await ctx.db.userPrefs.merge("u1", {}, ["nonexistent"]);
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      caret: { style: "block" },
    });
  });

  it("replacePreserving replaces the blob but keeps the preserved keys' stored values", async () => {
    await ctx.db.userPrefs.set("u1", {
      caret: { style: "block" },
      selectedTags: ["og"],
      adaptRecency: { th: 2 },
    });
    await ctx.db.userPrefs.replacePreserving(
      "u1",
      // Even if the caller's payload tries to smuggle a preserved key,
      // the stored value wins (it's concatenated after the input).
      { behaviour: { strictSpace: true }, selectedTags: ["owner"] },
      ["selectedTags", "adaptRecency", "monkeytypeStats"],
    );
    expect(await ctx.db.userPrefs.get("u1")).toEqual({
      behaviour: { strictSpace: true },
      selectedTags: ["og"],
      adaptRecency: { th: 2 },
    });
  });

  it("replacePreserving creates the row when none exists", async () => {
    await ctx.db.userPrefs.replacePreserving(
      "u_new",
      { caret: { style: "line" } },
      ["selectedTags"],
    );
    expect(await ctx.db.userPrefs.get("u_new")).toEqual({
      caret: { style: "line" },
    });
  });
});
