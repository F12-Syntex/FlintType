/** Static facts about the drill catalogue: the tuning numbers every
 *  builder shares, plus the title, kind label and a one-line `about`
 *  for each fixed drill id. The builders (`drills-tailored.ts`,
 *  `drills-generic.ts`) and the runner's page metadata
 *  (`[id]/layout.tsx`) both read from here, so a drill's name, kind and
 *  description can't drift between the index, the runner and the
 *  `<title>`. Per-user copy (tailored summaries that name your slowest
 *  pairs) stays in the builders. */

export const DEFAULT_BURST_THRESHOLD_WPM = 60;
export const SPRINT_BURST_THRESHOLD_WPM = 50;
export const SUDDEN_DEATH_LENGTH = 30;
export const TRICKY_DRILL_LENGTH = 35;
/** Five-in-a-row default for word and trigram bursts. The Appearance
 *  "Burst reps" pref overrides this per user on configurable drills. */
export const DEFAULT_BURST_REPS = 5;
export const SPRINT_BURST_LENGTH = 40;
/** A whole sentence is a big enough unit of work without insisting on
 *  multiple reps, so pangrams stay at one. */
export const PANGRAM_REPS = 1;

export type FixedDrillId =
  | "weakness"
  | "worst-words"
  | "trigram-burst"
  | "burst-1000"
  | "tricky"
  | "pangrams"
  | "numbers-symbols"
  | "top-100-sprint"
  | "english-burst";

export interface DrillCopy {
  title: string;
  /** The drill's kind, as the index badge and runner header show it. */
  contextLabel: "Sudden death" | "Burst" | "Isolation";
  /** One plain, user-independent sentence. Generic drills use it as
   *  their tile summary; every drill uses it for page metadata. */
  about: string;
}

export const DRILL_COPY: Record<FixedDrillId, DrillCopy> = {
  weakness: {
    title: "Weakness gauntlet",
    contextLabel: "Sudden death",
    about:
      "A passage built from your weakest letter pairs. One mistake restarts it.",
  },
  "worst-words": {
    title: "Worst-words burst",
    contextLabel: "Burst",
    about: `Your weakest words, one at a time, until each clears ${DEFAULT_BURST_THRESHOLD_WPM} wpm.`,
  },
  "trigram-burst": {
    title: "Trigram burst",
    contextLabel: "Burst",
    about: `Three-letter clusters, one at a time, until each clears ${DEFAULT_BURST_THRESHOLD_WPM} wpm.`,
  },
  "burst-1000": {
    title: "Burst 1000",
    contextLabel: "Burst",
    about:
      "Clear the 1,000 most common English words one by one. Progress saves to your account.",
  },
  tricky: {
    title: "Tongue-twister gauntlet",
    contextLabel: "Sudden death",
    about:
      "Awkward words with silent letters and cross-hand jumps. One mistake restarts it.",
  },
  pangrams: {
    title: "Pangram sprint",
    contextLabel: "Burst",
    about: `Eight classic pangrams that use every letter, each at ${SPRINT_BURST_THRESHOLD_WPM} wpm.`,
  },
  "numbers-symbols": {
    title: "Numbers & symbols",
    contextLabel: "Sudden death",
    about:
      "Short sentences full of numbers and punctuation. One mistake restarts it.",
  },
  "top-100-sprint": {
    title: "Top 100 sprint",
    contextLabel: "Burst",
    about: `Forty short everyday words at a friendly ${SPRINT_BURST_THRESHOLD_WPM} wpm. A good warm-up.`,
  },
  "english-burst": {
    title: "English burst",
    contextLabel: "Burst",
    about: "Forty random words from the same pool as tests and races.",
  },
};

/** `"a", "b", "c"`: how the drill descriptions list patterns and words. */
export function quoted(xs: readonly string[]): string {
  return xs.map((x) => `"${x}"`).join(", ");
}

export const ISOLATION_PREFIX = "isolation-";

/** Copy for a generated `isolation-<pattern>` drill. */
export function isolationCopy(pattern: string): DrillCopy {
  return {
    title: `Isolate "${pattern}"`,
    contextLabel: "Isolation",
    about: `Your weak pattern "${pattern}" drilled across many everyday words, so the speed carries over.`,
  };
}

/** Title + description for a drill id, or null for an unknown id. Used
 *  by the runner's page metadata. */
export function drillCopyFor(id: string): DrillCopy | null {
  if (Object.hasOwn(DRILL_COPY, id)) return DRILL_COPY[id as FixedDrillId];
  if (id.startsWith(ISOLATION_PREFIX) && id.length > ISOLATION_PREFIX.length) {
    return isolationCopy(id.slice(ISOLATION_PREFIX.length));
  }
  return null;
}
