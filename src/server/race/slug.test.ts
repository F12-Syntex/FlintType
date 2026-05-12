import { describe, expect, it } from "vitest";
import { generateSlug, __testing } from "./slug";

describe("race/slug", () => {
  it("generates an adjective-noun-2digit string", () => {
    const s = generateSlug(new Set());
    expect(s).toMatch(/^[a-z]+-[a-z]+-\d{2,3}$/);
  });

  it("skips slugs already in the existing set", () => {
    // Force the rng into a tiny cycle so adjective × noun pairs collide
    // fast; the suffix saves us.
    let i = 0;
    const rng = () => {
      const v = (i++ % 3) / 3;
      return v;
    };
    const first = generateSlug(new Set(), 1, rng);
    const second = generateSlug(new Set([first]), 8, rng);
    expect(second).not.toBe(first);
  });

  it("never returns an empty slug", () => {
    for (let i = 0; i < 50; i += 1) {
      const s = generateSlug(new Set());
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it("word lists are non-empty and lowercase ascii", () => {
    expect(__testing.ADJECTIVES.length).toBeGreaterThan(50);
    expect(__testing.NOUNS.length).toBeGreaterThan(50);
    for (const w of [...__testing.ADJECTIVES, ...__testing.NOUNS]) {
      expect(w).toMatch(/^[a-z]+$/);
    }
  });
});
