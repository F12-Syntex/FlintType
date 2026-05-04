import { describe, expect, it } from "vitest";
import { convertSpeed, formatSpeed } from "./speed-unit";

describe("convertSpeed", () => {
  it("returns wpm unchanged", () => {
    expect(convertSpeed(60, "wpm")).toBe(60);
  });
  it("converts to cpm by multiplying by 5", () => {
    expect(convertSpeed(60, "cpm")).toBe(300);
  });
  it("converts to wps by dividing by 60", () => {
    expect(convertSpeed(60, "wps")).toBe(1);
  });
  it("converts to cps", () => {
    expect(convertSpeed(60, "cps")).toBe(5);
  });
  it("converts to wph", () => {
    expect(convertSpeed(60, "wph")).toBe(3600);
  });
});

describe("formatSpeed", () => {
  it("rounds wpm by default", () => {
    expect(formatSpeed(58.7, "wpm")).toBe("59");
  });
  it("forces 1 decimal when alwaysDecimal", () => {
    expect(formatSpeed(58.7, "wpm", true)).toBe("58.7");
  });
  it("uses 2 decimals for per-second units", () => {
    expect(formatSpeed(60, "wps")).toBe("1.00");
  });
});
