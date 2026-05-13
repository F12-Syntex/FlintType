import { describe, expect, it } from "vitest";
import { OWNER_EMAILS } from "./owner-config";
import {
  applyTagSelection,
  readTagSelection,
  resolveEligibleTags,
  resolveTagsFromClerkUser,
} from "./resolve-tags";

describe("resolveTagsFromClerkUser", () => {
  it("returns [] when no inputs match", () => {
    expect(
      resolveTagsFromClerkUser({
        email: "stranger@example.com",
        publicMetadataTags: null,
      }),
    ).toEqual([]);
  });

  it("returns ['og'] when publicMetadata says so", () => {
    expect(
      resolveTagsFromClerkUser({
        email: "stranger@example.com",
        publicMetadataTags: ["og"],
      }),
    ).toEqual(["og"]);
  });

  it("returns ['owner'] when email is in the allowlist", () => {
    expect(
      resolveTagsFromClerkUser({
        email: OWNER_EMAILS[0]!,
        publicMetadataTags: null,
      }),
    ).toEqual(["owner"]);
  });

  it("merges OWNER + OG with owner first", () => {
    expect(
      resolveTagsFromClerkUser({
        email: OWNER_EMAILS[0]!,
        publicMetadataTags: ["og"],
      }),
    ).toEqual(["owner", "og"]);
  });

  it("drops unknown tags from publicMetadata", () => {
    expect(
      resolveTagsFromClerkUser({
        email: "stranger@example.com",
        publicMetadataTags: ["og", "moderator", "vip"],
      }),
    ).toEqual(["og"]);
  });

  it("is case-insensitive on email and on tag strings", () => {
    expect(
      resolveTagsFromClerkUser({
        email: OWNER_EMAILS[0]!.toUpperCase(),
        publicMetadataTags: ["OG"],
      }),
    ).toEqual(["owner", "og"]);
  });

  it("the deprecated alias points at resolveEligibleTags", () => {
    expect(resolveTagsFromClerkUser).toBe(resolveEligibleTags);
  });
});

describe("applyTagSelection", () => {
  it("returns the full eligible set when selection is null/undefined", () => {
    expect(applyTagSelection(["owner", "og"], null)).toEqual(["owner", "og"]);
    expect(applyTagSelection(["owner", "og"], undefined)).toEqual([
      "owner",
      "og",
    ]);
  });

  it("returns [] when selection is the empty array (opt-out)", () => {
    expect(applyTagSelection(["owner", "og"], [])).toEqual([]);
  });

  it("intersects eligible × selection in canonical order", () => {
    expect(applyTagSelection(["owner", "og"], ["og"])).toEqual(["og"]);
    expect(applyTagSelection(["owner", "og"], ["og", "owner"])).toEqual([
      "owner",
      "og",
    ]);
  });

  it("drops selection entries the user isn't eligible for", () => {
    expect(applyTagSelection(["og"], ["og", "owner"])).toEqual(["og"]);
  });
});

describe("readTagSelection", () => {
  it("returns null when the slot is absent", () => {
    expect(readTagSelection(null)).toBeNull();
    expect(readTagSelection(undefined)).toBeNull();
    expect(readTagSelection({})).toBeNull();
    expect(readTagSelection({ otherKey: "value" })).toBeNull();
  });

  it("returns [] when the slot is an empty array (opt-out signal)", () => {
    expect(readTagSelection({ selectedTags: [] })).toEqual([]);
  });

  it("parses a populated array into canonical-order tag ids", () => {
    expect(readTagSelection({ selectedTags: ["og"] })).toEqual(["og"]);
    expect(readTagSelection({ selectedTags: ["og", "owner"] })).toEqual([
      "owner",
      "og",
    ]);
  });

  it("ignores invalid tag ids and non-array slot shapes", () => {
    expect(readTagSelection({ selectedTags: "og" })).toBeNull();
    expect(readTagSelection({ selectedTags: ["nonsense"] })).toEqual([]);
    expect(readTagSelection({ selectedTags: ["og", 42, null] })).toEqual(["og"]);
  });
});
