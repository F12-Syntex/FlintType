import { describe, expect, it } from "vitest";
import { findCarrierWords } from "./adapt-carriers";

const POOL = [
  "art", "part", "start", "sort", "smart", "hurt", // contain "rt"
  "rt", // too short (< 3) — excluded
  "comfortable", // contains "rt" but too long (> 8) — excluded
  "book", "look", // no "rt"
  "art", // duplicate of "art"
];

describe("findCarrierWords", () => {
  it("returns only words containing the pattern, within the length window", () => {
    const out = findCarrierWords("rt", POOL, 10, 1);
    for (const w of out) {
      expect(w).toContain("rt");
      expect(w.length).toBeGreaterThanOrEqual(3);
      expect(w.length).toBeLessThanOrEqual(8);
    }
    expect(out).not.toContain("rt"); // too short
    expect(out).not.toContain("comfortable"); // too long
    expect(out).not.toContain("book"); // no match
    expect(out.length).toBe(6); // art, part, start, sort, smart, hurt
  });

  it("dedupes repeated carriers", () => {
    const out = findCarrierWords("art", POOL, 50, 1);
    expect(new Set(out).size).toBe(out.length);
    expect(out.filter((w) => w === "art").length).toBe(1);
  });

  it("caps the result at count", () => {
    expect(findCarrierWords("rt", POOL, 2, 1).length).toBe(2);
  });

  it("is case-insensitive in both pattern and pool", () => {
    expect(findCarrierWords("RT", POOL, 10, 1).length).toBe(6);
    expect(findCarrierWords("rt", ["PART", "SORT"], 10, 1).sort()).toEqual([
      "part",
      "sort",
    ]);
  });

  it("returns [] when no word contains the pattern", () => {
    expect(findCarrierWords("zzq", POOL, 10, 1)).toEqual([]);
  });

  it("returns [] for an empty pattern or non-positive count", () => {
    expect(findCarrierWords("", POOL, 10, 1)).toEqual([]);
    expect(findCarrierWords("rt", POOL, 0, 1)).toEqual([]);
  });

  it("is deterministic per (pattern, seed) and varies by seed", () => {
    expect(findCarrierWords("rt", POOL, 4, 42)).toEqual(
      findCarrierWords("rt", POOL, 4, 42),
    );
    // Different seeds should generally produce a different ordering of
    // the same six carriers (at least one of several seeds differs).
    const a = findCarrierWords("rt", POOL, 6, 1).join(",");
    const differs = [2, 3, 4, 5].some(
      (s) => findCarrierWords("rt", POOL, 6, s).join(",") !== a,
    );
    expect(differs).toBe(true);
  });
});
