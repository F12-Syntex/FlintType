import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing";

describe("adapt-models repos", () => {
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

  // ── bigram ────────────────────────────────────────────────────────

  it("bigramModels: empty list for users with no rows", async () => {
    const got = await ctx.db.bigramModels.listForUser("u_none");
    expect(got).toEqual([]);
  });

  it("bigramModels: bulkUpsert inserts new rows then updates in place", async () => {
    await ctx.db.bigramModels.bulkUpsert(
      "u1",
      new Map([
        ["th", { meanMs: 120, varianceMs: 400, sampleCount: 10 }],
        ["he", { meanMs: 140, varianceMs: 500, sampleCount: 8 }],
      ]),
    );
    let rows = await ctx.db.bigramModels.listForUser("u1");
    expect(rows.length).toBe(2);
    expect(rows.find((r) => r.bigram === "th")?.meanMs).toBe(120);

    // upsert overrides — same bigram, new stats.
    await ctx.db.bigramModels.bulkUpsert(
      "u1",
      new Map([["th", { meanMs: 110, varianceMs: 300, sampleCount: 12 }]]),
    );
    rows = await ctx.db.bigramModels.listForUser("u1");
    expect(rows.length).toBe(2);
    const th = rows.find((r) => r.bigram === "th");
    expect(th?.meanMs).toBe(110);
    expect(th?.sampleCount).toBe(12);
  });

  it("bigramModels: getMany filters by key", async () => {
    await ctx.db.bigramModels.bulkUpsert(
      "u1",
      new Map([
        ["th", { meanMs: 120, varianceMs: 400, sampleCount: 10 }],
        ["he", { meanMs: 140, varianceMs: 500, sampleCount: 8 }],
        ["er", { meanMs: 130, varianceMs: 450, sampleCount: 9 }],
      ]),
    );
    const rows = await ctx.db.bigramModels.getMany("u1", ["th", "er"]);
    expect(rows.map((r) => r.bigram).sort()).toEqual(["er", "th"]);
  });

  it("bigramModels: getMany returns [] for empty key list", async () => {
    await ctx.db.bigramModels.bulkUpsert(
      "u1",
      new Map([["th", { meanMs: 120, varianceMs: 400, sampleCount: 10 }]]),
    );
    expect(await ctx.db.bigramModels.getMany("u1", [])).toEqual([]);
  });

  it("bigramModels: clearForUser only deletes that user", async () => {
    await ctx.db.bigramModels.bulkUpsert(
      "u1",
      new Map([["th", { meanMs: 120, varianceMs: 400, sampleCount: 10 }]]),
    );
    await ctx.db.bigramModels.bulkUpsert(
      "u2",
      new Map([["he", { meanMs: 140, varianceMs: 500, sampleCount: 8 }]]),
    );
    await ctx.db.bigramModels.clearForUser("u1");
    expect(await ctx.db.bigramModels.listForUser("u1")).toEqual([]);
    const u2 = await ctx.db.bigramModels.listForUser("u2");
    expect(u2.length).toBe(1);
  });

  it("bigramModels: bulkUpsert with empty map is a no-op", async () => {
    await ctx.db.bigramModels.bulkUpsert("u1", new Map());
    expect(await ctx.db.bigramModels.listForUser("u1")).toEqual([]);
  });

  // ── trigram ───────────────────────────────────────────────────────
  // The shape mirrors bigram exactly; the test cases verify the keying
  // column is wired correctly and the upsert target is the right pair.

  it("trigramModels: bulkUpsert + listForUser round-trip", async () => {
    await ctx.db.trigramModels.bulkUpsert(
      "u1",
      new Map([
        ["the", { meanMs: 200, varianceMs: 1000, sampleCount: 5 }],
        ["and", { meanMs: 210, varianceMs: 1100, sampleCount: 6 }],
      ]),
    );
    const rows = await ctx.db.trigramModels.listForUser("u1");
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.trigram).sort()).toEqual(["and", "the"]);
  });

  it("trigramModels: clearForUser scoped per user", async () => {
    await ctx.db.trigramModels.bulkUpsert(
      "u1",
      new Map([["the", { meanMs: 200, varianceMs: 1000, sampleCount: 5 }]]),
    );
    await ctx.db.trigramModels.bulkUpsert(
      "u2",
      new Map([["and", { meanMs: 210, varianceMs: 1100, sampleCount: 6 }]]),
    );
    await ctx.db.trigramModels.clearForUser("u1");
    expect(await ctx.db.trigramModels.listForUser("u1")).toEqual([]);
    expect(
      (await ctx.db.trigramModels.listForUser("u2")).length,
    ).toBe(1);
  });

  // ── motor feature ─────────────────────────────────────────────────

  it("motorFeatureModels: bulkUpsert + listForUser round-trip", async () => {
    await ctx.db.motorFeatureModels.bulkUpsert(
      "u1",
      new Map([
        ["same_finger_left_pinky", { meanMs: 250, varianceMs: 2000, sampleCount: 3 }],
      ]),
    );
    const rows = await ctx.db.motorFeatureModels.listForUser("u1");
    expect(rows.length).toBe(1);
    expect(rows[0]?.featureKey).toBe("same_finger_left_pinky");
    expect(rows[0]?.meanMs).toBe(250);
  });

  it("motorFeatureModels: clearForUser is the finger-map-changed reset hook", async () => {
    await ctx.db.motorFeatureModels.bulkUpsert(
      "u1",
      new Map([
        ["same_finger_left_pinky", { meanMs: 250, varianceMs: 2000, sampleCount: 3 }],
      ]),
    );
    await ctx.db.motorFeatureModels.clearForUser("u1");
    expect(await ctx.db.motorFeatureModels.listForUser("u1")).toEqual([]);
  });
});
