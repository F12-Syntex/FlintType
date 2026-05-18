import { describe, expect, it } from "vitest";

import {
  XP_PER_LEVEL,
  XP_PER_TEST,
  levelFromTestsCompleted,
} from "./level";

describe("levelFromTestsCompleted", () => {
  it("zero tests → level 1, zero xp", () => {
    const s = levelFromTestsCompleted(0);
    expect(s.level).toBe(1);
    expect(s.totalXp).toBe(0);
    expect(s.xpIntoLevel).toBe(0);
    expect(s.progress).toBe(0);
  });

  it("10 tests = exactly one level", () => {
    expect(levelFromTestsCompleted(10).level).toBe(2);
    expect(levelFromTestsCompleted(20).level).toBe(3);
    expect(levelFromTestsCompleted(100).level).toBe(11);
  });

  it("totalXp = testsCompleted × XP_PER_TEST", () => {
    expect(levelFromTestsCompleted(7).totalXp).toBe(7 * XP_PER_TEST);
    expect(levelFromTestsCompleted(250).totalXp).toBe(250 * XP_PER_TEST);
  });

  it("progress is the fraction into the current level", () => {
    // 13 tests = 1300 xp = level 2 with 300 / 1000 progress
    const s = levelFromTestsCompleted(13);
    expect(s.level).toBe(2);
    expect(s.xpIntoLevel).toBe(300);
    expect(s.progress).toBe(0.3);
  });

  it("treats negative + fractional inputs defensively", () => {
    expect(levelFromTestsCompleted(-5).level).toBe(1);
    expect(levelFromTestsCompleted(7.9).totalXp).toBe(7 * XP_PER_TEST);
  });

  it("XP_PER_LEVEL stays 1000 (10× XP_PER_TEST = one level)", () => {
    expect(XP_PER_LEVEL).toBe(10 * XP_PER_TEST);
  });
});
