import { describe, expect, it } from "vitest";
import { redirectFromSearch, safeRedirectPath, withRedirect } from "./auth-redirect";

const ORIGIN = "https://flinttype.com";

describe("safeRedirectPath", () => {
  it("keeps an in-app path with its query and hash", () => {
    expect(safeRedirectPath("/profile/ada?tab=runs#bests", ORIGIN)).toBe(
      "/profile/ada?tab=runs#bests",
    );
  });

  it("accepts an absolute URL on the same origin", () => {
    expect(safeRedirectPath("https://flinttype.com/customise/appearance/ai", ORIGIN)).toBe(
      "/customise/appearance/ai",
    );
  });

  it("falls back to home when empty", () => {
    expect(safeRedirectPath(null, ORIGIN)).toBe("/");
    expect(safeRedirectPath(undefined, ORIGIN)).toBe("/");
    expect(safeRedirectPath("", ORIGIN)).toBe("/");
  });

  it("rejects other origins, including protocol-relative and backslash forms", () => {
    expect(safeRedirectPath("https://evil.com/x", ORIGIN)).toBe("/");
    expect(safeRedirectPath("//evil.com/x", ORIGIN)).toBe("/");
    expect(safeRedirectPath("/\\evil.com", ORIGIN)).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)", ORIGIN)).toBe("/");
  });

  it("never sends someone back into the auth pages", () => {
    expect(safeRedirectPath("/sign-in", ORIGIN)).toBe("/");
    expect(safeRedirectPath("/sign-up/verify", ORIGIN)).toBe("/");
    expect(safeRedirectPath("/sign-inside", ORIGIN)).toBe("/sign-inside");
  });
});

describe("redirectFromSearch", () => {
  it("reads redirect_url from a query string", () => {
    expect(redirectFromSearch("?redirect_url=%2Fprofile%2Fada", ORIGIN)).toBe("/profile/ada");
    expect(redirectFromSearch("", ORIGIN)).toBe("/");
  });
});

describe("withRedirect", () => {
  it("carries a destination across to the other auth page", () => {
    expect(withRedirect("/sign-up", "?redirect_url=%2Fprofile%2Fada", ORIGIN)).toBe(
      "/sign-up?redirect_url=%2Fprofile%2Fada",
    );
  });

  it("leaves the link alone when there is no destination", () => {
    expect(withRedirect("/sign-up", "", ORIGIN)).toBe("/sign-up");
    expect(withRedirect("/sign-up", "?redirect_url=https%3A%2F%2Fevil.com", ORIGIN)).toBe(
      "/sign-up",
    );
  });
});
