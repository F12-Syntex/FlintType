import type { HistoryWeakness } from "@/types/history";
import { buildGenericDrills } from "./drills-generic";
import { buildTailoredDrills } from "./drills-tailored";

/** Drills split into two groups by where their data comes from:
 *    tailored: built from the user's typing model (weakest pairs,
 *              trigrams, words). Locked until enough data exists.
 *    generic:  curated lists that work for everyone. Always ready.
 *  The index groups tiles by category so the user can see at a glance
 *  which drills are personal and which are universal.
 *
 *  Layout of this folder's data layer: `drill-catalog.ts` holds the
 *  shared numbers and copy, `drill-lists.ts` the curated lists,
 *  `drill-generators.ts` the seeded pickers, and `drills-tailored.ts` /
 *  `drills-generic.ts` build the specs. */
export type DrillCategory = "tailored" | "generic";

interface DrillBase {
  id: string;
  category: DrillCategory;
  title: string;
  /** The drill's kind as shown on badges and the runner header. */
  contextLabel: string;
  /** One plain sentence for the drills index tiles. */
  summary: string;
  description: string;
  payoff: string;
  ready: boolean;
}

/** A drill is one of two engine kinds. The runner reads `kind` and
 *  mounts the matching surface. */
export type DrillSpec =
  | (DrillBase & {
      kind: "sudden-death";
      words: readonly string[];
    })
  | (DrillBase & {
      kind: "burst";
      items: readonly string[];
      thresholdWpm: number;
      repsPerItem: number;
      /** A whole-discovery tracker rather than a fixed list: the runner
       *  pulls items from `EN_COMMON_1000`, persists each cleared word
       *  and shows a 1000-cell discovery grid. Burst 1000 is the only
       *  drill flagged today; the runtime ignores `items` for it. */
      tracker?: "common-1000";
      /** When true, the user's `appearance.burstReps` pref overrides
       *  `repsPerItem` at runtime. */
      repsConfigurable: boolean;
    });

export interface DrillInput {
  weakestPairs: readonly HistoryWeakness[];
  weakestTrigrams?: readonly { key: string }[];
  weakestWords?: readonly { key: string; meanMs: number }[];
  cold: boolean;
  seed: number;
}

/** Every drill the index offers, in display order: tailored first,
 *  then generic. Tailored drills degrade to locked cards while the
 *  model is cold. */
export function buildDrills(input: DrillInput): DrillSpec[] {
  return [...buildTailoredDrills(input), ...buildGenericDrills(input.seed)];
}
