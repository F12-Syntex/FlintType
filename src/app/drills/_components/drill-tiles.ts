import type { DrillCategory, DrillSpec } from "./drills-data";

/** View model for the /drills index. `buildDrills` stays the single
 *  source of drill data; this module only decides how that list is
 *  shown: which drill is recommended, how the per-pattern isolation
 *  drills fold into one tile, the tile order inside each group, and
 *  which tiles a filter keeps. Pure, so it is unit-tested. */

// ─── filters ──────────────────────────────────────────────────────

export type DrillFilterId =
  | "all"
  | "tailored"
  | "generic"
  | "sudden-death"
  | "burst"
  | "ready";

export interface DrillFilter {
  id: DrillFilterId;
  label: string;
  /** Returns true when the drill belongs in the filtered set. */
  match: (drill: DrillSpec) => boolean;
}

/** To add a filter axis, append a row. The switch, the counts and
 *  `tileMatches` all read from this list. */
export const DRILL_FILTERS: readonly DrillFilter[] = [
  { id: "all", label: "All", match: () => true },
  { id: "tailored", label: "Tailored", match: (d) => d.category === "tailored" },
  { id: "generic", label: "Everyone", match: (d) => d.category === "generic" },
  {
    id: "sudden-death",
    label: "Sudden death",
    match: (d) => d.kind === "sudden-death",
  },
  { id: "burst", label: "Burst", match: (d) => d.kind === "burst" },
  { id: "ready", label: "Ready", match: (d) => d.ready },
];

export function matchesFilter(drill: DrillSpec, filter: DrillFilterId): boolean {
  const f = DRILL_FILTERS.find((x) => x.id === filter);
  return f ? f.match(drill) : true;
}

// ─── isolation folding ────────────────────────────────────────────

const ISOLATION_ID = "isolation";
const ISOLATION_PREFIX = `${ISOLATION_ID}-`;

/** `isolation-<pattern>` (one per weak pair) or the locked
 *  `isolation` placeholder a cold model gets. */
export function isIsolationDrill(drill: DrillSpec): boolean {
  return drill.id === ISOLATION_ID || drill.id.startsWith(ISOLATION_PREFIX);
}

/** The letter pattern an isolation drill targets ("qu"), or null for
 *  the locked placeholder and every other drill. */
export function isolationPattern(drill: DrillSpec): string | null {
  return drill.id.startsWith(ISOLATION_PREFIX)
    ? drill.id.slice(ISOLATION_PREFIX.length)
    : null;
}

// ─── tiles ────────────────────────────────────────────────────────

export type DrillTile =
  | { type: "drill"; key: string; drill: DrillSpec }
  /** Every isolation drill folded into one tile. `drills` holds the
   *  ready per-pattern drills, or just the locked placeholder. */
  | { type: "isolation"; key: string; drills: DrillSpec[] };

export function tileReady(tile: DrillTile): boolean {
  return tile.type === "drill"
    ? tile.drill.ready
    : tile.drills.some((d) => d.ready);
}

export function tileMatches(tile: DrillTile, filter: DrillFilterId): boolean {
  return tile.type === "drill"
    ? matchesFilter(tile.drill, filter)
    : tile.drills.some((d) => matchesFilter(d, filter));
}

/** The drill the page leads with: the first ready tailored drill, in
 *  catalog order (weakness, then worst words, then trigrams). Isolation
 *  drills live in their own folded tile, so they never lead. Falls back
 *  to the first ready drill of any kind. */
export function pickRecommended(drills: readonly DrillSpec[]): DrillSpec | null {
  return (
    drills.find(
      (d) => d.category === "tailored" && d.ready && !isIsolationDrill(d),
    ) ??
    drills.find((d) => d.ready && !isIsolationDrill(d)) ??
    null
  );
}

export type DrillTileGroups = Record<DrillCategory, DrillTile[]>;

/** Group drills into tiles per category, in catalog order with locked
 *  tiles last. `excludeId` drops a drill (the recommended one, which
 *  the page already shows on its own) from the grid. */
export function buildDrillTiles(
  drills: readonly DrillSpec[],
  excludeId: string | null = null,
): DrillTileGroups {
  const groups: DrillTileGroups = { tailored: [], generic: [] };
  const isolation = new Map<DrillCategory, DrillTile & { type: "isolation" }>();

  for (const drill of drills) {
    if (drill.id === excludeId) continue;
    if (isIsolationDrill(drill)) {
      let tile = isolation.get(drill.category);
      if (!tile) {
        tile = { type: "isolation", key: ISOLATION_ID, drills: [] };
        isolation.set(drill.category, tile);
        groups[drill.category].push(tile);
      }
      tile.drills.push(drill);
      continue;
    }
    groups[drill.category].push({ type: "drill", key: drill.id, drill });
  }

  // A folded tile with any ready pattern hides the locked placeholder.
  for (const tile of isolation.values()) {
    if (tile.drills.some((d) => d.ready)) {
      tile.drills = tile.drills.filter((d) => d.ready);
    }
  }

  return {
    tailored: lockedLast(groups.tailored),
    generic: lockedLast(groups.generic),
  };
}

/** Stable partition: ready tiles keep their order, locked ones follow. */
function lockedLast(tiles: DrillTile[]): DrillTile[] {
  return [...tiles.filter(tileReady), ...tiles.filter((t) => !tileReady(t))];
}

export function countTiles(
  groups: DrillTileGroups,
  filter: DrillFilterId,
): number {
  return [...groups.tailored, ...groups.generic].filter((t) =>
    tileMatches(t, filter),
  ).length;
}

/** The recommended tile sits above the grid; it follows the filter like
 *  any other drill, so a "Burst" filter never leads with a sudden-death
 *  drill. */
export function showRecommended(
  recommended: DrillSpec | null,
  filter: DrillFilterId,
): recommended is DrillSpec {
  return recommended !== null && matchesFilter(recommended, filter);
}

/** Drills a filter shows on the page: grid tiles plus the recommended
 *  tile when it matches. */
export function filterCount(
  groups: DrillTileGroups,
  recommended: DrillSpec | null,
  filter: DrillFilterId,
): number {
  return (
    countTiles(groups, filter) + (showRecommended(recommended, filter) ? 1 : 0)
  );
}

/** Filter options worth offering: All and the active one always; any
 *  other option only when it narrows the page (some drills, but not all
 *  of them). A filter that shows exactly what All shows is a dead end. */
export function visibleFilters(
  groups: DrillTileGroups,
  recommended: DrillSpec | null,
  active: DrillFilterId,
): readonly DrillFilter[] {
  const all = filterCount(groups, recommended, "all");
  return DRILL_FILTERS.filter((f) => {
    if (f.id === "all" || f.id === active) return true;
    const n = filterCount(groups, recommended, f.id);
    return n > 0 && n < all;
  });
}

/** Covers both kinds of isolation drill: weak letter pairs and triples. */
export const ISOLATION_TILE_TITLE = "Isolate weak spots";

export function tileTitle(tile: DrillTile): string {
  return tile.type === "drill" ? tile.drill.title : ISOLATION_TILE_TITLE;
}
