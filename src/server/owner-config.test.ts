import { describe, expect, it } from "vitest";
import { isOwnerEmail, OWNER_EMAILS } from "./owner-config";

describe("isOwnerEmail", () => {
  it("matches the canonical owner email", () => {
    expect(isOwnerEmail(OWNER_EMAILS[0]!)).toBe(true);
  });

  it("is case-insensitive on the input side", () => {
    expect(isOwnerEmail(OWNER_EMAILS[0]!.toUpperCase())).toBe(true);
  });

  it("returns false for a random email", () => {
    expect(isOwnerEmail("someone-else@example.com")).toBe(false);
  });

  it("returns false on null / undefined / empty input", () => {
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
    expect(isOwnerEmail("")).toBe(false);
  });
});
