import { describe, expect, it } from "vitest";

import { skillTierForNetWpm } from "./skill-tier";

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
