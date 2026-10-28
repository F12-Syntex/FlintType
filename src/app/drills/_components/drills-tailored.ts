import type { HistoryWeakness } from "@/types/history";
import {
  DEFAULT_BURST_REPS,
  DEFAULT_BURST_THRESHOLD_WPM,
  DRILL_COPY,
  quoted,
  SUDDEN_DEATH_LENGTH,
} from "./drill-catalog";
import { generateWeaknessPassage, pickWeaknessTrigrams } from "./drill-generators";
import type { DrillInput, DrillSpec } from "./drills-data";
import { buildIsolationDrills } from "./drills-isolation";

/** Drills built from the user's typing model. Each one degrades to a
 *  locked card (with what unlocks it) while the model is too cold. */
export function buildTailoredDrills({
  weakestPairs,
  weakestTrigrams,
  weakestWords,
  cold,
  seed,
}: DrillInput): DrillSpec[] {
  const personalReady = !cold && weakestPairs.length > 0;
  return [
    weaknessDrill(weakestPairs, personalReady, seed),
    worstWordsDrill(weakestWords),
    trigramDrill(weakestTrigrams),
    ...buildIsolationDrills(weakestPairs, weakestTrigrams, personalReady, seed),
  ];
}

function weaknessDrill(
  weakestPairs: readonly HistoryWeakness[],
  ready: boolean,
  seed: number,
): DrillSpec {
  const copy = DRILL_COPY.weakness;
  const base = {
    id: "weakness",
    kind: "sudden-death",
    category: "tailored",
    title: copy.title,
    contextLabel: copy.contextLabel,
  } as const;
  if (!ready) {
    return {
      ...base,
      summary:
        "Unlocks once we've seen enough of your typing to find your weakest pairs.",
      description:
        "Once we've seen enough of your typing to identify weak bigrams, this drill will build a passage around them and demand a clean run.",
      payoff: "Drilling your weakest pairs under sudden-death pressure is the highest-leverage path to a higher overall WPM.",
      ready: false,
      words: [],
    };
  }
  const keys = weakestPairs.map((w) => w.key);
  return {
    ...base,
    summary: `A passage built from your weakest pairs (${keys.slice(0, 3).join(", ")}). One mistake restarts it.`,
    description: `A passage built from your weakest bigrams: ${quoted(keys.slice(0, 4))}. Clear it without a single mistake. One wrong key sends you back to word one.`,
    payoff: "Sudden-death enforces accuracy where you're already slow. Your brain locks in the cleaner motion when error is non-negotiable.",
    ready: true,
    words: generateWeaknessPassage(weakestPairs, SUDDEN_DEATH_LENGTH, seed),
  };
}

function worstWordsDrill(
  weakestWords: DrillInput["weakestWords"],
): DrillSpec {
  const copy = DRILL_COPY["worst-words"];
  const words = (weakestWords ?? []).slice(0, 20).map((w) => w.key);
  const ready = words.length >= 5;
  const base = {
    id: "worst-words",
    kind: "burst",
    category: "tailored",
    title: copy.title,
    contextLabel: copy.contextLabel,
    thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
    repsPerItem: DEFAULT_BURST_REPS,
    repsConfigurable: true,
  } as const;
  if (!ready) {
    return {
      ...base,
      summary:
        "Unlocks once we've timed enough words to find the ones you stall on.",
      description:
        "Once we've timed enough whole-word completions to spot the words your hands keep stalling on, this drill bursts the slowest 20 of them.",
      payoff: "Word-level slowness is a different signal than bigram weakness. It catches words whose individual pairs are fine but whose sequence still trips you.",
      ready: false,
      items: [],
    };
  }
  return {
    ...base,
    summary: `Your ${words.length} weakest words, one at a time, until each clears ${DEFAULT_BURST_THRESHOLD_WPM} wpm.`,
    description: `Burst your weakest ${words.length} words: ${quoted(words.slice(0, 4))}${words.length > 4 ? ", …" : ""}. Each one drilled at ${DEFAULT_BURST_THRESHOLD_WPM} WPM until it stops dragging your average.`,
    payoff:
      "These are the exact words your hands keep hesitating on, usually a different shape than the bigram drill picks up. Clear the list and your overall WPM moves with it.",
    ready: true,
    items: words,
  };
}

function trigramDrill(
  weakestTrigrams: DrillInput["weakestTrigrams"],
): DrillSpec {
  const copy = DRILL_COPY["trigram-burst"];
  const trigrams = pickWeaknessTrigrams(weakestTrigrams, 6);
  const personal = (weakestTrigrams ?? []).length > 0;
  return {
    id: "trigram-burst",
    kind: "burst",
    category: "tailored",
    title: copy.title,
    contextLabel: copy.contextLabel,
    summary: personal
      ? `Your weakest three-letter clusters: ${trigrams.join(", ")}.`
      : `The most useful three-letter clusters in English: ${trigrams.join(", ")}.`,
    description: personal
      ? `Drill 3-letter clusters from your weakest trigrams: ${quoted(trigrams)}. ${DEFAULT_BURST_REPS} clean bursts above ${DEFAULT_BURST_THRESHOLD_WPM} WPM advance to the next.`
      : `Drill the highest-value English trigrams: ${quoted(trigrams)}. Once we've seen more of your typing this list will swap for your weakest trigrams.`,
    payoff: "Trigram cadence scales straight into word-level speed: three letters at threshold becomes a whole word at threshold once joined up.",
    ready: trigrams.length > 0,
    items: trigrams,
    thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
    repsPerItem: DEFAULT_BURST_REPS,
    repsConfigurable: true,
  };
}
