import { describe, expect, it } from "vitest";
import { isApplePlatform } from "./platform";

describe("isApplePlatform", () => {
  it("matches macOS navigator.platform strings", () => {
    expect(isApplePlatform("MacIntel")).toBe(true);
    expect(isApplePlatform("MacARM")).toBe(true);
  });

  it("matches iOS devices", () => {
    expect(isApplePlatform("iPhone")).toBe(true);
    expect(isApplePlatform("iPad")).toBe(true);
    expect(isApplePlatform("iPod touch")).toBe(true);
  });

  it("matches a macOS userAgent fallback", () => {
    expect(
      isApplePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
    ).toBe(true);
  });

  it("is false for Windows, Linux, Android and empty input", () => {
    expect(isApplePlatform("Win32")).toBe(false);
    expect(isApplePlatform("Linux x86_64")).toBe(false);
    expect(isApplePlatform("Linux armv8l")).toBe(false);
    expect(isApplePlatform("")).toBe(false);
  });

  // navigator.platform is deprecated and trending toward "" — when it's empty
  // the React side falls back to navigator.userAgent, so guard that path: an
  // Android UA must not be mistaken for Apple.
  it("is false for an Android userAgent fallback", () => {
    expect(
      isApplePlatform(
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isApplePlatform("MACINTOSH")).toBe(true);
  });
});
