import { describe, expect, it } from "vitest";
import { signInHref } from "./sign-in-href";

describe("signInHref", () => {
  it("comes back to the page that asked", () => {
    expect(signInHref("/drills/weakness")).toBe(
      "/sign-in?redirect_url=%2Fdrills%2Fweakness",
    );
    expect(signInHref("/profile/ada?tab=runs")).toBe(
      "/sign-in?redirect_url=%2Fprofile%2Fada%3Ftab%3Druns",
    );
  });

  it("is the plain sign-in page for home and the auth pages", () => {
    expect(signInHref("/")).toBe("/sign-in");
    expect(signInHref("")).toBe("/sign-in");
    expect(signInHref("/sign-in")).toBe("/sign-in");
    expect(signInHref("/sign-up/verify")).toBe("/sign-in");
  });

  it("never points the round trip at another site", () => {
    expect(signInHref("https://evil.com/x")).toBe("/sign-in");
    expect(signInHref("//evil.com")).toBe("/sign-in");
  });
});
