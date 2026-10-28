import { describe, expect, it } from "vitest";
import {
  countCustomised,
  countOverriddenVars,
  DEFAULT_GROUP,
  defaultsFor,
  findGroup,
  getGroup,
  GROUP_APPEARANCE_KEYS,
  groupForPath,
  groupForSection,
  legacyAppearanceHref,
  sectionTitle,
  SETTINGS_GROUPS,
} from "./groups";

describe("settings catalog", () => {
  it("has unique group ids and unique section anchors across groups", () => {
    const groupIds = SETTINGS_GROUPS.map((g) => g.id);
    expect(new Set(groupIds).size).toBe(groupIds.length);
    const anchors = SETTINGS_GROUPS.flatMap((g) => [
      ...g.sections.map((s) => s.id),
      ...(g.rowAnchors ?? []),
    ]);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("gives each group an href under /customise", () => {
    for (const g of SETTINGS_GROUPS) {
      expect(g.href).toBe(`/customise/${g.id}`);
    }
  });

  it("puts the Style knobs on the Interface page so its Reset covers them", () => {
    const keys = GROUP_APPEARANCE_KEYS.interface ?? [];
    for (const k of [
      "controlShape",
      "depth",
      "buttonGlow",
      "pageAura",
      "uiFont",
      "uiScale",
    ] as const) {
      expect(keys).toContain(k);
    }
  });

  it("never assigns one appearance key to two groups", () => {
    const keys = Object.values(GROUP_APPEARANCE_KEYS).flat();
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("findGroup / groupForSection / groupForPath", () => {
  it("finds a group by id", () => {
    expect(findGroup("keyboard")?.name).toBe("Keyboard");
    expect(findGroup("nope")).toBeNull();
  });

  it("gets a group by id and names its sections", () => {
    const theme = getGroup("theme");
    expect(theme.href).toBe("/customise/theme");
    expect(sectionTitle(theme, "colors")).toBe("Colours");
    expect(() => sectionTitle(theme, "keymap")).toThrow();
  });

  it("maps sections and row anchors to their group", () => {
    expect(groupForSection("colors")?.id).toBe("theme");
    expect(groupForSection("keymap")?.id).toBe("keyboard");
    expect(groupForSection("spectate")?.id).toBe("social");
    expect(groupForSection("style")?.id).toBe("interface");
    // Rows that used to be sections of their own.
    expect(groupForSection("tape")?.id).toBe("typing");
    expect(groupForSection("mistakes")?.id).toBe("typing");
    expect(groupForSection("missing")).toBeNull();
  });

  it("resolves the group from a pathname, including the palette explorer", () => {
    expect(groupForPath("/customise/stats")?.id).toBe("stats");
    expect(groupForPath("/customise/appearance/themes")?.id).toBe("theme");
    expect(groupForPath("/customise/appearance/ai")).toBeNull();
    expect(groupForPath("/customise")).toBeNull();
  });
});

describe("legacyAppearanceHref", () => {
  it("maps an old appearance anchor to its new page", () => {
    expect(legacyAppearanceHref("#colors")).toBe("/customise/theme#colors");
    expect(legacyAppearanceHref("#tape")).toBe("/customise/typing#tape");
    expect(legacyAppearanceHref("multiplayer")).toBe(
      "/customise/social#multiplayer",
    );
  });

  it("falls back to the first group for empty or unknown hashes", () => {
    expect(legacyAppearanceHref("")).toBe(DEFAULT_GROUP.href);
    expect(legacyAppearanceHref("#")).toBe(DEFAULT_GROUP.href);
    expect(legacyAppearanceHref("#gone")).toBe(DEFAULT_GROUP.href);
  });
});

describe("countCustomised / defaultsFor", () => {
  const defaults = { a: 1, b: "x", c: true };

  it("counts only the listed keys that differ from the default", () => {
    const prefs = { a: 2, b: "x", c: false };
    expect(countCustomised(prefs, defaults, ["a", "b"])).toBe(1);
    expect(countCustomised(prefs, defaults, ["a", "b", "c"])).toBe(2);
    expect(countCustomised(defaults, defaults, ["a", "b", "c"])).toBe(0);
  });

  it("builds a partial that restores just the listed keys", () => {
    expect(defaultsFor(defaults, ["a", "c"])).toEqual({ a: 1, c: true });
    expect(defaultsFor(defaults, [])).toEqual({});
  });
});

describe("countOverriddenVars", () => {
  it("counts non-empty overrides among the listed vars", () => {
    expect(
      countOverriddenVars(
        { "--primary": "#ff0000", "--radius": "1rem", "--card": "" },
        ["--primary", "--card", "--background"],
      ),
    ).toBe(1);
  });
});
