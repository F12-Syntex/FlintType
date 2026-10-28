import { describe, expect, it } from "vitest";
import { buildDrills } from "./drills-data";
import { DRILL_COPY, drillCopyFor, quoted } from "./drill-catalog";

describe("drillCopyFor", () => {
  it("returns the catalog copy for a fixed id", () => {
    expect(drillCopyFor("tricky")).toEqual(DRILL_COPY.tricky);
    expect(drillCopyFor("tricky")?.contextLabel).toBe("Sudden death");
  });

  it("builds copy for a generated isolation drill", () => {
    const copy = drillCopyFor("isolation-qu");
    expect(copy?.title).toBe('Isolate "qu"');
    expect(copy?.contextLabel).toBe("Isolation");
  });

  it("returns null for unknown ids and a bare prefix", () => {
    expect(drillCopyFor("nope")).toBeNull();
    expect(drillCopyFor("isolation-")).toBeNull();
    expect(drillCopyFor("toString")).toBeNull();
  });

  it("matches the title and kind of every built drill", () => {
    const drills = buildDrills({ weakestPairs: [], cold: true, seed: 3 });
    for (const d of drills) {
      if (d.id === "isolation") continue; // locked placeholder, never routed
      const copy = drillCopyFor(d.id);
      expect(copy?.title, d.id).toBe(d.title);
      expect(copy?.contextLabel, d.id).toBe(d.contextLabel);
    }
  });

  it("uses the catalog line as every generic drill's summary", () => {
    const drills = buildDrills({ weakestPairs: [], cold: true, seed: 3 });
    for (const d of drills.filter((x) => x.category === "generic")) {
      expect(d.summary).toBe(drillCopyFor(d.id)?.about);
    }
  });
});

describe("quoted", () => {
  it("quotes and joins", () => {
    expect(quoted(["a", "bc"])).toBe('"a", "bc"');
    expect(quoted([])).toBe("");
  });
});
