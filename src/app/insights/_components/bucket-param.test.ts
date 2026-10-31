import { describe, expect, it } from "vitest";
import { BUCKET_PARAM, bucketQuery, parseBucketParam, toBucketParam } from "./bucket-param";

describe("bucket URL parameter", () => {
  it("round-trips a bucket key", () => {
    expect(toBucketParam("training|words|25")).toBe("training~words~25");
    expect(parseBucketParam("training~words~25")).toBe("training|words|25");
    expect(parseBucketParam("casual~time~60~t")).toBe("casual|time|60|t");
    expect(parseBucketParam("training~all")).toBe("training|all");
    expect(parseBucketParam("casual~all")).toBeNull();
  });
  it("ignores a missing or malformed value", () => {
    expect(parseBucketParam(null)).toBeNull();
    expect(parseBucketParam("")).toBeNull();
    expect(parseBucketParam("training~words")).toBeNull();
    expect(parseBucketParam("admin~words~25")).toBeNull();
    expect(parseBucketParam("training~words~25~x")).toBeNull();
  });
  it("leaves the default out and keeps other parameters", () => {
    expect(bucketQuery("", "race|words|25", "training|words|25")).toBe(`${BUCKET_PARAM}=race~words~25`);
    expect(bucketQuery("tests=race~words~25&x=1", "training|words|25", "training|words|25")).toBe("x=1");
    expect(bucketQuery("x=1", "casual|time|60", null)).toBe("x=1&tests=casual~time~60");
    expect(bucketQuery("tests=race~words~25&x=1", null, null)).toBe("x=1");
    expect(bucketQuery("", null, "training|words|25")).toBe("");
  });
});
