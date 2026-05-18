import { describe, expect, it } from "vitest";
import { buildShareSlug, parseShareSlug } from "./share-slug";

describe("buildShareSlug", () => {
  it("packs handle, wpm and short id into one segment", () => {
    expect(
      buildShareSlug({
        handle: "@saif",
        wpm: 92,
        testId: "a3f9c0d1-2b4e-4f1a-9c8d-0123456789ab",
      }),
    ).toBe("saif-92wpm-a3f9c0d1");
  });

  it("rounds fractional wpm to the nearest int", () => {
    expect(
      buildShareSlug({ handle: "saif", wpm: 91.6, testId: "abcdef0123" }),
    ).toMatch(/-92wpm-/);
    expect(
      buildShareSlug({ handle: "saif", wpm: 91.4, testId: "abcdef0123" }),
    ).toMatch(/-91wpm-/);
  });

  it("slugifies handles with non-ascii and punctuation", () => {
    expect(
      buildShareSlug({
        handle: "@Sa.if O'Connor",
        wpm: 80,
        testId: "deadbeef0011",
      }),
    ).toBe("sa-if-o-connor-80wpm-deadbeef");
  });

  it("falls back to `run` for empty / pathological handles", () => {
    expect(
      buildShareSlug({ handle: "@@@", wpm: 50, testId: "1234567890ab" }),
    ).toMatch(/^run-50wpm-/);
  });
});

describe("parseShareSlug", () => {
  it("returns the trailing short id from a normal slug", () => {
    expect(parseShareSlug("saif-92wpm-a3f9c0d1")).toBe("a3f9c0d1");
  });

  it("returns the trailing UUID chunk for old full-UUID URLs (12 hex chars)", () => {
    expect(parseShareSlug("a3f9c0d1-2b4e-4f1a-9c8d-0123456789ab")).toBe(
      "0123456789ab",
    );
  });

  it("returns null when the slug tail isn't hex (guards against full-table LIKE scans)", () => {
    expect(parseShareSlug("saif-92wpm-not-a-hex-id")).toBeNull();
    expect(parseShareSlug("foo-bar-baz")).toBeNull();
  });

  it("returns the slug itself when there is no separator (bare prefix)", () => {
    expect(parseShareSlug("a3f9c0d1")).toBe("a3f9c0d1");
  });

  it("returns null for empty input", () => {
    expect(parseShareSlug("")).toBeNull();
  });
});
