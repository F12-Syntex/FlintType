import { describe, expect, it } from "vitest";
import { OWNER_EMAILS } from "./owner-config";
import { resolveTagsFromClerkUser } from "./resolve-tags";

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
});
