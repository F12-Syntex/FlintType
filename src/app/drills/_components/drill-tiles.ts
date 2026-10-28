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

// ─── copy ─────────────────────────────────────────────────────────

/** Reps the runner will actually ask for: the user's Burst reps pref
 *  wins on drills that allow it. */
export function effectiveReps(drill: DrillSpec, burstReps: number): number {
  if (drill.kind !== "burst") return 1;
  return drill.repsConfigurable ? burstReps : drill.repsPerItem;
}

const NUMBER = new Intl.NumberFormat("en");

function plural(n: number, one: string, many: string): string {
  return `${NUMBER.format(n)} ${n === 1 ? one : many}`;
}

/** Short spec line under a tile: "30 words · no mistakes",
 *  "20 words · 5 reps · 60 wpm". */
export function drillSpecLine(drill: DrillSpec, burstReps: number): string {
  if (drill.kind === "sudden-death") {
    return drill.words.length > 0
      ? `${plural(drill.words.length, "word", "words")} · no mistakes`
      : "No mistakes allowed";
  }
  const count = drill.tracker === "common-1000" ? 1000 : drill.items.length;
  const unit =
    drill.id === "pangrams"
      ? (["sentence", "sentences"] as const)
      : drill.id === "trigram-burst"
        ? (["cluster", "clusters"] as const)
        : (["word", "words"] as const);
  const reps = effectiveReps(drill, burstReps);
  const parts = [
    plural(reps, "rep", "reps"),
    `${drill.thresholdWpm} wpm`,
  ];
  if (count > 0) parts.unshift(plural(count, unit[0], unit[1]));
  return parts.join(" · ");
}
