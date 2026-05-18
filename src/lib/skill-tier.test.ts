import { describe, expect, it } from "vitest";

import { levelForXp, skillTierForNetWpm, xpForLevel } from "./skill-tier";

describe("skillTierForNetWpm", () => {
  it("rounds boundaries inclusively at the lower bound", () => {
    expect(skillTierForNetWpm(180).id).toBe("grandmaster");
    expect(skillTierForNetWpm(150).id).toBe("elite");
    expect(skillTierForNetWpm(120).id).toBe("expert");
    expect(skillTierForNetWpm(90).id).toBe("adept");
    expect(skillTierForNetWpm(60).id).toBe("steady");
    expect(skillTierForNetWpm(0).id).toBe("rookie");
  });

  it("classifies just below a tier as the lower tier", () => {
    expect(skillTierForNetWpm(179.9).id).toBe("elite");
    expect(skillTierForNetWpm(59).id).toBe("rookie");
  });

  it("treats negative numbers as rookie (defensive)", () => {
    expect(skillTierForNetWpm(-1).id).toBe("rookie");
  });
});

describe("levelForXp", () => {
  it("floors at level 1 for zero or negative xp", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-100)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
  });

  it("grows ~sqrt(xp/50) with floor", () => {
    // xpForLevel(L) = (L-1)^2 * 50; levelForXp at that exact point is L
    expect(levelForXp(xpForLevel(2))).toBe(2);
    expect(levelForXp(xpForLevel(5))).toBe(5);
    expect(levelForXp(xpForLevel(10))).toBe(10);
  });

  it("rounds down between level breakpoints", () => {
    expect(levelForXp(xpForLevel(5) - 1)).toBe(4);
    expect(levelForXp(xpForLevel(10) - 1)).toBe(9);
  });
});

describe("xpForLevel", () => {
  it("is monotonic non-decreasing and 0 at level 1", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(5));
  });
});
