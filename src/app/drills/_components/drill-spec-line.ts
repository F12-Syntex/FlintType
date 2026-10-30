import type { DrillSpec } from "./drills-data";

/** Plain-language copy derived from a drill spec: what one item is,
 *  how many reps the runner will really ask for, and the short spec
 *  line under each tile. Pure, so it is unit-tested with the tiles. */

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

/** What one item of a drill is, singular and plural: the runner's
 *  progress card and the spec line both name it. */
export function drillUnit(drill: DrillSpec): readonly [string, string] {
  if (drill.id === "pangrams") return ["sentence", "sentences"];
  if (drill.id === "trigram-burst") return ["cluster", "clusters"];
  return ["word", "words"];
}

/** Short spec line under a tile, as a comma phrase: "30 words, no
 *  mistakes allowed", "20 words, 5 reps each, at 60 wpm". */
export function drillSpecLine(drill: DrillSpec, burstReps: number): string {
  if (drill.kind === "sudden-death") {
    return drill.words.length > 0
      ? `${plural(drill.words.length, "word", "words")}, no mistakes allowed`
      : "No mistakes allowed";
  }
  const count = drill.tracker === "common-1000" ? 1000 : drill.items.length;
  const unit = drillUnit(drill);
  const reps = effectiveReps(drill, burstReps);
  return [
    count > 0 ? plural(count, unit[0], unit[1]) : null,
    `${plural(reps, "rep", "reps")} each`,
    `at ${drill.thresholdWpm} wpm`,
  ]
    .filter(Boolean)
    .join(", ");
}
