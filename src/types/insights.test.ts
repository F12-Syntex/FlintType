import { describe, expect, it } from "vitest";
import {
  ALL_ADAPT_BUCKET,
  bucketKeySchema,
  insightsOverviewInputSchema,
  insightsUsualInputSchema,
} from "./insights";

describe("bucketKeySchema", () => {
  it("accepts every runBucketKey shape an analysed test can have", () => {
    for (const key of [
      "casual|words|25",
      "training|time|60",
      "race|words|25",
      "reverse_adaptive|quote|2",
      "casual|time|600|t",
      "training|words|10000",
    ]) {
      expect(bucketKeySchema.safeParse(key).success, key).toBe(true);
    }
  });

  it("rejects legacy, malformed and oversized keys", () => {
    for (const key of [
      "casual||60", // legacy row with no length unit: never analysed
      "casual|words|",
      "casual|words|25|touch",
      "casual|words|123456",
      "casual|words|025", // leading zero: runBucketKey never writes one
      "casual|words|00",
      "mt_import|words|25",
      "Casual|words|25",
      "casual|words|25\n",
      `casual|words|25${"|t".repeat(40)}`,
      "",
    ]) {
      expect(bucketKeySchema.safeParse(key).success, key).toBe(false);
    }
  });
});

describe("insights inputs", () => {
  it("lets the overview take an optional bucket", () => {
    expect(insightsOverviewInputSchema.parse({})).toStrictEqual({});
    expect(insightsOverviewInputSchema.parse({ bucket: "casual|words|25" })).toStrictEqual({
      bucket: "casual|words|25",
    });
    expect(insightsOverviewInputSchema.safeParse({ bucket: "nope" }).success).toBe(false);
  });

  it("lets only the overview take the pooled Adapt view", () => {
    expect(insightsOverviewInputSchema.parse({ bucket: ALL_ADAPT_BUCKET })).toStrictEqual({ bucket: "training|all" });
    expect(insightsOverviewInputSchema.safeParse({ bucket: "casual|all" }).success).toBe(false);
    expect(bucketKeySchema.safeParse(ALL_ADAPT_BUCKET).success).toBe(false);
  });

  it("requires a bucket, a whole non-negative beforeMs and a fix mode for usual", () => {
    const ok = { bucket: "training|time|60", beforeMs: 1_700_000_000_000, fixMode: "fix" };
    expect(insightsUsualInputSchema.parse(ok)).toStrictEqual(ok);
    for (const bad of [
      { ...ok, bucket: undefined },
      { ...ok, beforeMs: -1 },
      { ...ok, beforeMs: 1.5 },
      { ...ok, fixMode: "strict" },
      { bucket: ok.bucket, beforeMs: ok.beforeMs },
    ]) {
      expect(insightsUsualInputSchema.safeParse(bad).success).toBe(false);
    }
  });
});
