import { describe, expect, it } from "vitest";
import { modeFor, sinceFor } from "@/server/leaderboard-window";

describe("leaderboard-window", () => {
  it("sinceFor all_time has no lower bound", () => {
    expect(sinceFor("all_time")).toBe(0);
  });

  it("sinceFor windows shrink toward now (day > week > month lower bound)", () => {
    const day = sinceFor("day");
    const week = sinceFor("week");
    const month = sinceFor("month");
    // More recent window ⇒ larger (later) lower bound.
    expect(day).toBeGreaterThan(week);
    expect(week).toBeGreaterThan(month);
    expect(day).toBeLessThanOrEqual(Date.now());
  });

  it("modeFor maps all → all and passes other scopes through", () => {
    expect(modeFor("all")).toBe("all");
    expect(modeFor("race")).toBe("race");
    expect(modeFor("casual")).toBe("casual");
    expect(modeFor("training")).toBe("training");
  });
});
