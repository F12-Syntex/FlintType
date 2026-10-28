import { describe, expect, it } from "vitest";
import { matchesViewer } from "./matches-viewer";

const user = {
  id: "user_2abcdefghijklmnop",
  username: "Ada",
  emailAddresses: [{ emailAddress: "ada.lovelace+ft@example.com" }],
};

describe("matchesViewer", () => {
  it("is false for a signed-out viewer", () => {
    expect(matchesViewer("ada", null)).toBe(false);
    expect(matchesViewer(undefined, undefined)).toBe(false);
  });

  it("treats the bare /profile route as the viewer's own", () => {
    expect(matchesViewer(undefined, user)).toBe(true);
  });

  it("matches the username case-insensitively", () => {
    expect(matchesViewer("ADA", user)).toBe(true);
  });

  it("matches the Clerk id and its u_ fallback slug", () => {
    expect(matchesViewer("user_2abcdefghijklmnop", user)).toBe(true);
    expect(matchesViewer("u_2abcdefghijk", user)).toBe(true);
  });

  it("matches the email local-part, raw and sanitised", () => {
    expect(matchesViewer("ada.lovelace+ft", user)).toBe(true);
    expect(matchesViewer("ada_lovelace_ft", user)).toBe(true);
  });

  it("does not match someone else", () => {
    expect(matchesViewer("grace", user)).toBe(false);
  });
});
