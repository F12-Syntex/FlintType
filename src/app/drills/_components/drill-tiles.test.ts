import { describe, expect, it } from "vitest";
import type { HistoryWeakness } from "@/types/history";
import { buildDrills, type DrillSpec } from "./drills-data";
import { drillSpecLine, drillUnit, effectiveReps } from "./drill-spec-line";
import {
  buildDrillTiles,
  countTiles,
  filterCount,
  isIsolationDrill,
  isolationPattern,
  pickRecommended,
  showRecommended,
  tileMatches,
  tileReady,
  tileTitle,
  visibleFilters,
  type DrillTile,
} from "./drill-tiles";

function weak(key: string): HistoryWeakness {
  return { key, meanMs: 200, weakness: 1.5, sampleCount: 40 };
}

const COLD = buildDrills({ weakestPairs: [], cold: true, seed: 1 });
const WARM = buildDrills({
  weakestPairs: [weak("qu"), weak("ck"), weak("ph"), weak("wh")],
  weakestTrigrams: [weak("ght"), weak("str")],
  weakestWords: ["their", "rhythm", "queue", "weird", "seize"].map((k) => ({
    key: k,
    meanMs: 900,
  })),
  cold: false,
  seed: 1,
});

function ids(tiles: DrillTile[]): string[] {
  return tiles.map((t) => (t.type === "drill" ? t.drill.id : t.key));
}

function byId(drills: readonly DrillSpec[], id: string): DrillSpec {
  const d = drills.find((x) => x.id === id);
  if (!d) throw new Error(`missing ${id}`);
  return d;
}

describe("isolation helpers", () => {
  it("recognises per-pattern drills and the locked placeholder", () => {
    expect(isIsolationDrill(byId(COLD, "isolation"))).toBe(true);
    expect(isIsolationDrill(byId(WARM, "isolation-qu"))).toBe(true);
    expect(isIsolationDrill(byId(WARM, "weakness"))).toBe(false);
  });

  it("extracts the pattern from the id", () => {
    expect(isolationPattern(byId(WARM, "isolation-ght"))).toBe("ght");
    expect(isolationPattern(byId(COLD, "isolation"))).toBeNull();
    expect(isolationPattern(byId(WARM, "tricky"))).toBeNull();
  });
});

describe("pickRecommended", () => {
  it("leads with the weakness gauntlet once the model is warm", () => {
    expect(pickRecommended(WARM)?.id).toBe("weakness");
  });

  it("falls back to the first ready tailored drill when cold", () => {
    expect(pickRecommended(COLD)?.id).toBe("trigram-burst");
  });

  it("never recommends an isolation drill", () => {
    const onlyIsolation = WARM.filter(
      (d) => isIsolationDrill(d) || d.category === "generic",
    );
    const pick = pickRecommended(onlyIsolation);
    expect(pick && isIsolationDrill(pick)).toBe(false);
    expect(pick?.category).toBe("generic");
  });

  it("returns null when nothing is ready", () => {
    expect(pickRecommended(COLD.filter((d) => !d.ready))).toBeNull();
  });
});

describe("buildDrillTiles", () => {
  it("folds every isolation drill into one tile", () => {
    const groups = buildDrillTiles(WARM);
    const folded = groups.tailored.filter((t) => t.type === "isolation");
    expect(folded).toHaveLength(1);
    const tile = folded[0]!;
    expect(tile.type === "isolation" && tile.drills.map(isolationPattern)).toEqual(
      ["qu", "ck", "ph", "ght", "str"],
    );
    expect(ids(groups.tailored).filter((id) => id.startsWith("isolation-"))).toEqual(
      [],
    );
  });

  it("keeps the locked placeholder when the model is cold", () => {
    const groups = buildDrillTiles(COLD);
    const tile = groups.tailored.find((t) => t.type === "isolation");
    expect(tile && tileReady(tile)).toBe(false);
    expect(tile?.type === "isolation" && tile.drills.map((d) => d.id)).toEqual([
      "isolation",
    ]);
  });

  it("sorts locked tiles after ready ones, otherwise keeping catalog order", () => {
    const groups = buildDrillTiles(COLD);
    expect(ids(groups.tailored)).toEqual([
      "trigram-burst",
      "weakness",
      "worst-words",
      "isolation",
    ]);
    const firstLocked = groups.tailored.findIndex((t) => !tileReady(t));
    expect(groups.tailored.slice(firstLocked).every((t) => !tileReady(t))).toBe(
      true,
    );
  });

  it("drops the excluded drill from the grid", () => {
    const groups = buildDrillTiles(WARM, "weakness");
    expect(ids(groups.tailored)).not.toContain("weakness");
    expect(ids(groups.tailored)[0]).toBe("worst-words");
  });

  it("puts generic drills in their own group", () => {
    const groups = buildDrillTiles(WARM);
    expect(ids(groups.generic)).toEqual([
      "burst-1000",
      "tricky",
      "pangrams",
      "numbers-symbols",
      "top-100-sprint",
      "english-burst",
    ]);
  });
});

describe("filters", () => {
  const groups = buildDrillTiles(WARM);

  it("counts tiles, not folded drills", () => {
    expect(countTiles(groups, "all")).toBe(
      groups.tailored.length + groups.generic.length,
    );
    expect(countTiles(groups, "tailored")).toBe(groups.tailored.length);
    expect(countTiles(groups, "generic")).toBe(6);
  });

  it("matches the folded isolation tile by its drills", () => {
    const tile = groups.tailored.find((t) => t.type === "isolation")!;
    expect(tileMatches(tile, "burst")).toBe(true);
    expect(tileMatches(tile, "sudden-death")).toBe(false);
    expect(tileMatches(tile, "ready")).toBe(true);
  });

  it("hides locked tiles under the Ready filter", () => {
    const cold = buildDrillTiles(COLD);
    expect(
      cold.tailored.filter((t) => tileMatches(t, "ready")).every(tileReady),
    ).toBe(true);
  });
});

describe("drillSpecLine", () => {
  it("describes sudden-death drills by length", () => {
    expect(drillSpecLine(byId(WARM, "weakness"), 5)).toBe(
      "30 words · no mistakes",
    );
    expect(drillSpecLine(byId(COLD, "weakness"), 5)).toBe(
      "No mistakes allowed",
    );
  });

  it("uses the user's Burst reps on configurable drills", () => {
    expect(drillSpecLine(byId(WARM, "worst-words"), 3)).toBe(
      "5 words · 3 reps · 60 wpm",
    );
  });

  it("keeps fixed reps and names the unit", () => {
    expect(drillSpecLine(byId(WARM, "pangrams"), 3)).toBe(
      "8 sentences · 1 rep · 50 wpm",
    );
    expect(drillSpecLine(byId(WARM, "trigram-burst"), 5)).toBe(
      "6 clusters · 5 reps · 60 wpm",
    );
    expect(drillSpecLine(byId(WARM, "burst-1000"), 5)).toBe(
      "1,000 words · 5 reps · 60 wpm",
    );
  });

  it("drops the count for an empty locked burst", () => {
    expect(drillSpecLine(byId(COLD, "worst-words"), 5)).toBe(
      "5 reps · 60 wpm",
    );
  });

  it("effectiveReps is 1 for sudden death", () => {
    expect(effectiveReps(byId(WARM, "tricky"), 9)).toBe(1);
  });
});

describe("recommended + visible filters", () => {
  const rec = pickRecommended(WARM);
  const groups = buildDrillTiles(WARM, rec?.id ?? null);

  it("hides the recommended drill when the filter excludes it", () => {
    expect(rec?.id).toBe("weakness");
    expect(showRecommended(rec, "all")).toBe(true);
    expect(showRecommended(rec, "sudden-death")).toBe(true);
    expect(showRecommended(rec, "burst")).toBe(false);
    expect(showRecommended(rec, "generic")).toBe(false);
    expect(showRecommended(null, "all")).toBe(false);
  });

  it("counts the recommended tile with the grid", () => {
    expect(filterCount(groups, rec, "all")).toBe(countTiles(groups, "all") + 1);
    expect(filterCount(groups, rec, "burst")).toBe(countTiles(groups, "burst"));
  });

  it("drops a filter that shows exactly what All shows", () => {
    // Warm model: nothing is locked, so Ready === All.
    const ids = visibleFilters(groups, rec, "all").map((f) => f.id);
    expect(ids).toEqual(["all", "tailored", "generic", "sudden-death", "burst"]);
  });

  it("keeps Ready when something is locked, and always keeps the active one", () => {
    const coldRec = pickRecommended(COLD);
    const cold = buildDrillTiles(COLD, coldRec?.id ?? null);
    expect(visibleFilters(cold, coldRec, "all").map((f) => f.id)).toContain(
      "ready",
    );
    expect(visibleFilters(groups, rec, "ready").map((f) => f.id)).toContain(
      "ready",
    );
  });
});

describe("tileTitle + drillUnit", () => {
  it("names the folded isolation tile", () => {
    const groups = buildDrillTiles(WARM);
    const iso = groups.tailored.find((t) => t.type === "isolation")!;
    expect(tileTitle(iso)).toBe("Isolate weak pairs");
    expect(tileTitle(groups.generic[0]!)).toBe("Burst 1000");
  });

  it("names each drill's unit", () => {
    expect(drillUnit(byId(WARM, "pangrams"))[0]).toBe("sentence");
    expect(drillUnit(byId(WARM, "trigram-burst"))[1]).toBe("clusters");
    expect(drillUnit(byId(WARM, "isolation-qu"))[0]).toBe("word");
  });
});
