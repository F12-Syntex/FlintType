import { describe, expect, it } from "vitest";
import { parseUserTags, withUserTag } from "./user-tags";

describe("parseUserTags", () => {
  it("returns [] for non-array input", () => {
    expect(parseUserTags(null)).toEqual([]);
    expect(parseUserTags(undefined)).toEqual([]);
    expect(parseUserTags("og")).toEqual([]);
    expect(parseUserTags({ og: true })).toEqual([]);
    expect(parseUserTags(42)).toEqual([]);
  });

  it("keeps known ids, drops unknowns, dedupes case-insensitively", () => {
    expect(parseUserTags(["og", "OWNER", "moderator", "og", "OG"])).toEqual([
      "owner",
      "og",
    ]);
  });

  it("returns ids in canonical display order regardless of input order", () => {
    expect(parseUserTags(["og", "owner"])).toEqual(["owner", "og"]);
    expect(parseUserTags(["owner", "og"])).toEqual(["owner", "og"]);
  });

  it("ignores non-string array entries", () => {
    expect(parseUserTags([1, true, null, "og", { id: "owner" }])).toEqual([
      "og",
    ]);
  });
});

describe("withUserTag", () => {
  it("adds a tag and yields canonical order", () => {
    expect(withUserTag([], "og")).toEqual(["og"]);
    expect(withUserTag(["og"], "owner")).toEqual(["owner", "og"]);
  });

  it("is idempotent", () => {
    expect(withUserTag(["og"], "og")).toEqual(["og"]);
    expect(withUserTag(["owner", "og"], "og")).toEqual(["owner", "og"]);
  });
});
