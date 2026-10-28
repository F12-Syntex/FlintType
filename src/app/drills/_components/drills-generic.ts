import {
  DEFAULT_BURST_REPS,
  DEFAULT_BURST_THRESHOLD_WPM,
  DRILL_COPY,
  type FixedDrillId,
  PANGRAM_REPS,
  SPRINT_BURST_LENGTH,
  SPRINT_BURST_THRESHOLD_WPM,
  TRICKY_DRILL_LENGTH,
} from "./drill-catalog";
import {
  generateTrickyPassage,
  numbersAndSymbolsAsWords,
  pickBurstWords,
  pickEnglishBurstWords,
} from "./drill-generators";
import { PANGRAM_LIST } from "./drill-lists";
import type { DrillSpec } from "./drills-data";

/** id, category, title, kind label and summary for a generic drill,
 *  all from the shared catalog so the index, runner and page metadata
 *  say the same thing. */
function head(id: FixedDrillId) {
  const copy = DRILL_COPY[id];
  return {
    id,
    category: "generic",
    title: copy.title,
    contextLabel: copy.contextLabel,
    summary: copy.about,
    ready: true,
  } as const;
}

/** Curated drills that work for everyone, with or without a model. */
export function buildGenericDrills(seed: number): DrillSpec[] {
  return [
    {
      ...head("burst-1000"),
      kind: "burst",
      description: `Drill the thousand most common English words. Each word you clear at ${DEFAULT_BURST_THRESHOLD_WPM} WPM is logged against your account, so over time you fill the whole 1000-cell grid. ${DEFAULT_BURST_REPS} clean bursts to discover a word.`,
      payoff: "The longest-running burst drill. It slowly turns the core English vocabulary into reflex, and progress saves to your account.",
      // The burst-1000 surface computes the real items at mount from
      // the user's persisted discovery state; `tracker` tells the
      // runner to mount that wrapper instead of the plain BurstSurface.
      items: [],
      thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
      repsPerItem: DEFAULT_BURST_REPS,
      repsConfigurable: true,
      tracker: "common-1000",
    },
    {
      ...head("tricky"),
      kind: "sudden-death",
      description:
        "A curated set of awkward words: silent letters, cross-hand jumps, doubled clusters. Clean run or back to the start.",
      payoff: "Universal, no model required. Useful as a warm-up or whenever the personal drill is unavailable.",
      words: generateTrickyPassage(TRICKY_DRILL_LENGTH, seed + 1),
    },
    {
      ...head("pangrams"),
      kind: "burst",
      description: `Hit ${SPRINT_BURST_THRESHOLD_WPM} WPM on a full pangram, ${PANGRAM_REPS} clean run per sentence. Eight sentences in all, every letter of the alphabet across the set.`,
      payoff: "Whole-sentence threshold practice is the closest drill to a real test: flow, punctuation and every letter row in one pass.",
      items: PANGRAM_LIST,
      thresholdWpm: SPRINT_BURST_THRESHOLD_WPM,
      repsPerItem: PANGRAM_REPS,
      // Pangram reps stay locked at 1: a whole sentence is a big enough
      // commit, and more reps would turn the drill into a marathon.
      repsConfigurable: false,
    },
    {
      ...head("numbers-symbols"),
      kind: "sudden-death",
      description:
        "A passage of short sentences threaded with numbers, dashes, colons and dollar signs. The keys you skim past in normal practice, drilled clean.",
      payoff: "Almost every typist's accuracy collapses on the number row and the punctuation cluster. Honest reps under sudden death plug the gap fast.",
      words: numbersAndSymbolsAsWords(seed + 2),
    },
    {
      ...head("top-100-sprint"),
      kind: "burst",
      description: `Forty short, common English words at a friendlier ${SPRINT_BURST_THRESHOLD_WPM} WPM threshold, ${DEFAULT_BURST_REPS} reps each. The warm-up before harder bursts.`,
      payoff: "Re-anchors the muscle memory on words you type every day. Hit threshold here and the harder drills feel achievable.",
      items: pickBurstWords(SPRINT_BURST_LENGTH, seed + 3),
      thresholdWpm: SPRINT_BURST_THRESHOLD_WPM,
      repsPerItem: DEFAULT_BURST_REPS,
      repsConfigurable: true,
    },
    {
      ...head("english-burst"),
      kind: "burst",
      description: `Forty random words from the English pool single-player and multiplayer both draw from. ${DEFAULT_BURST_REPS} clean bursts above ${DEFAULT_BURST_THRESHOLD_WPM} WPM advance to the next.`,
      payoff:
        "Practises the same vocabulary you'll see in everyday tests and races, at burst pace rather than long-form, so the cadence stays sharp.",
      items: pickEnglishBurstWords(SPRINT_BURST_LENGTH, seed + 4),
      thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
      repsPerItem: DEFAULT_BURST_REPS,
      repsConfigurable: true,
    },
  ];
}
