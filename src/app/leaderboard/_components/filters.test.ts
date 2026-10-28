import { describe, expect, it } from "vitest";
import {
  filtersToQuery,
  type LeaderboardFilters,
  parseFilters,
  parsePreset,
  parseScope,
  parseView,
  parseWindow,
  VIEW_DESCRIPTIONS,
  withAuth,
} from "./filters";

const DEFAULTS: LeaderboardFilters = {
  view: "table",
  scope: "casual",
  window: "all_time",
  preset: "t60",
  audience: "global",
};

function parse(qs: string): LeaderboardFilters {
  const sp = new URLSearchParams(qs);
  return parseFilters((k) => sp.get(k));
}

describe("parse helpers", () => {
  it("fall back to defaults on missing or unknown values", () => {
    expect(parse("")).toEqual(DEFAULTS);
    expect(parse("view=nope&scope=race&window=year&preset=w7&audience=x")).toEqual(
      DEFAULTS,
    );
  });

  it("read every known value", () => {
    expect(parseView("players")).toBe("players");
    expect(parseView("levels")).toBe("levels");
    expect(parseScope("training")).toBe("training");
    expect(parseWindow("day")).toBe("day");
    expect(parsePreset("w25")).toBe("w25");
    expect(parse("audience=friends").audience).toBe("friends");
  });

  it("keeps an explicit 'any' preset instead of reverting to 60s", () => {
    expect(parsePreset("any")).toBe("any");
    expect(parsePreset(null)).toBe("t60");
  });
});

describe("filtersToQuery", () => {
  it("omits defaults", () => {
    expect(filtersToQuery(DEFAULTS)).toBe("");
  });

  it("writes non-default values, including preset=any", () => {
    const qs = filtersToQuery({
      view: "table",
      scope: "training",
      window: "week",
      preset: "any",
      audience: "friends",
    });
    expect(parse(qs)).toEqual({
      view: "table",
      scope: "training",
      window: "week",
      preset: "any",
      audience: "friends",
    });
    expect(new URLSearchParams(qs).get("preset")).toBe("any");
  });

  it("round-trips every view", () => {
    for (const view of ["table", "players", "levels"] as const) {
      expect(parse(filtersToQuery({ ...DEFAULTS, view })).view).toBe(view);
    }
  });

  it("keeps unrelated params and drops ones reset to default", () => {
    const base = new URLSearchParams("ref=discord&window=day");
    const qs = filtersToQuery(DEFAULTS, base);
    expect(qs).toBe("ref=discord");
  });
});

describe("withAuth", () => {
  const friends: LeaderboardFilters = { ...DEFAULTS, audience: "friends" };

  it("shows a friends link as global once auth says signed out", () => {
    expect(withAuth(friends, { isLoaded: true, isSignedIn: false }).audience).toBe(
      "global",
    );
  });

  it("keeps friends while auth loads and when signed in", () => {
    expect(withAuth(friends, { isLoaded: false, isSignedIn: false })).toBe(friends);
    expect(withAuth(friends, { isLoaded: true, isSignedIn: true })).toBe(friends);
  });

  it("leaves a global board alone", () => {
    expect(withAuth(DEFAULTS, { isLoaded: true, isSignedIn: false })).toBe(DEFAULTS);
  });
});

describe("VIEW_DESCRIPTIONS", () => {
  it("doesn't tie levels to a test count (XP also comes from drills and races)", () => {
    expect(VIEW_DESCRIPTIONS.levels).not.toMatch(/\d|tests earn a level/i);
    expect(VIEW_DESCRIPTIONS.levels).toMatch(/XP/);
  });
});
