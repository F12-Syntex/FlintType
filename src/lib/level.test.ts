import { describe, expect, it } from "vitest";

import {
  XP_PER_LEVEL,
  XP_PER_TEST,
  levelFromTestsCompleted,
  levelFromXp,
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

describe("levelFromXp", () => {
  it("zero xp → level 1", () => {
    const s = levelFromXp(0);
    expect(s.level).toBe(1);
    expect(s.totalXp).toBe(0);
    expect(s.xpIntoLevel).toBe(0);
  });

  it("one level boundary lands cleanly", () => {
    expect(levelFromXp(1000).level).toBe(2);
    expect(levelFromXp(1500).level).toBe(2);
    expect(levelFromXp(1500).xpIntoLevel).toBe(500);
    expect(levelFromXp(1500).progress).toBe(0.5);
  });

  it("agrees with the test-only shim", () => {
    for (const n of [0, 1, 7, 13, 100, 999]) {
      expect(levelFromXp(n * XP_PER_TEST)).toEqual(
        levelFromTestsCompleted(n),
      );
    }
  });

  it("treats negative + fractional inputs defensively", () => {
    expect(levelFromXp(-100).level).toBe(1);
    expect(levelFromXp(150.7).totalXp).toBe(150);
  });
});
