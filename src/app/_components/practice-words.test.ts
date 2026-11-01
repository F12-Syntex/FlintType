import { describe, expect, it } from "vitest";
import { adaptPool, MIN_FILTERED_POOL } from "./practice-words";

const cfg = (minWordLength: number, wordPool: string[]) => ({
  minWordLength,
  showSecondary: false,
  wordPool,
});

describe("adaptPool and the shortest-word setting (FT-057)", () => {
  it("keeps the filter when enough words pass it", () => {
    const pool = Array.from({ length: 30 }, (_, i) => `length${String(i).padStart(2, "0")}`);
    const out = adaptPool(cfg(8, [...pool, "a", "to"]));
    expect(out).toEqual(pool);
  });

  it("takes the longest words when too few pass, instead of looping a handful", () => {
    const short = Array.from({ length: 40 }, (_, i) => `s${String(i).padStart(2, "0")}`);
    const mid = Array.from({ length: 30 }, (_, i) => `mid${String(i).padStart(3, "0")}`);
    const long = ["mountains", "wonderful", "telephone"];
    const out = adaptPool(cfg(8, [...short, ...mid, ...long]));
    expect(out).toHaveLength(MIN_FILTERED_POOL);
    expect(out.slice(0, 3)).toEqual(long);
    // Every pick is at least as long as anything left out.
    expect(out.every((w) => w.length >= 6)).toBe(true);
  });

  it("uses the whole list when it is smaller than the floor", () => {
    expect(adaptPool(cfg(8, ["cat", "elephant", "dog"]))).toEqual(["elephant", "cat", "dog"]);
  });

  it("keeps every word when the setting excludes none", () => {
    expect(adaptPool(cfg(1, ["a", "bb"]))).toEqual(["a", "bb"]);
  });
});
