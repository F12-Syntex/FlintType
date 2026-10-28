import { EN_COMMON_1000 } from "@/data/en-common-1000";
import { findCarrierWords } from "@/lib/adapt-carriers";
import type { HistoryWeakness } from "@/types/history";
import {
  DEFAULT_BURST_REPS,
  DEFAULT_BURST_THRESHOLD_WPM,
  ISOLATION_PREFIX,
  isolationCopy,
  quoted,
} from "./drill-catalog";
import { COMMON_BIGRAMS } from "./drill-lists";
import type { DrillInput, DrillSpec } from "./drills-data";

const ISOLATION_MAX_BIGRAMS = 3;
const ISOLATION_MAX_TRIGRAMS = 2;
const ISOLATION_CARRIER_COUNT = 24;

/** keybr-style isolation drills: one weak pattern, drilled across many
 *  varied real carrier words from EN_COMMON_1000. The high-transfer
 *  counterpart to in-pool adaptive selection: it trains the *motion*
 *  across unlimited vocabulary. An isolation drill is a burst over
 *  those carriers, so it reuses the burst engine. One card per top weak
 *  bigram (minus the ultra-common pairs) and trigram; a single locked
 *  card while the model is cold. */
export function buildIsolationDrills(
  weakestPairs: readonly HistoryWeakness[],
  weakestTrigrams: DrillInput["weakestTrigrams"],
  personalReady: boolean,
  seed: number,
): DrillSpec[] {
  const patterns: { pattern: string; type: "bigram" | "trigram" }[] = [];
  if (personalReady) {
    for (const w of weakestPairs) {
      if (patterns.length >= ISOLATION_MAX_BIGRAMS) break;
      if (/^[a-z]{2}$/.test(w.key) && !COMMON_BIGRAMS.has(w.key)) {
        patterns.push({ pattern: w.key, type: "bigram" });
      }
    }
    let trigramCount = 0;
    for (const t of weakestTrigrams ?? []) {
      if (trigramCount >= ISOLATION_MAX_TRIGRAMS) break;
      if (/^[a-z]{3}$/.test(t.key)) {
        patterns.push({ pattern: t.key, type: "trigram" });
        trigramCount++;
      }
    }
  }

  const base = {
    kind: "burst",
    category: "tailored",
    contextLabel: "Isolation",
    thresholdWpm: DEFAULT_BURST_THRESHOLD_WPM,
    repsPerItem: DEFAULT_BURST_REPS,
    repsConfigurable: true,
  } as const;
  const cards: DrillSpec[] = [];
  patterns.forEach(({ pattern, type }, i) => {
    const items = findCarrierWords(
      pattern,
      EN_COMMON_1000,
      ISOLATION_CARRIER_COUNT,
      seed + 11 + i,
    );
    if (items.length === 0) return; // never hand BurstSurface an empty list
    cards.push({
      ...base,
      id: `${ISOLATION_PREFIX}${pattern}`,
      title: isolationCopy(pattern).title,
      summary: `Drill the ${type} "${pattern}" across ${items.length} everyday words.`,
      description: `Hammer the ${type} "${pattern}" across ${items.length} everyday words: ${quoted(items.slice(0, 4))}${items.length > 4 ? ", …" : ""}. Same motion, many words, so the speed transfers instead of sticking to one word.`,
      payoff:
        "Drilling one weak motion across varied real words is the keybr-style path to transfer: you train the hand movement, not a single word's shape.",
      ready: true,
      items,
    });
  });
  if (cards.length > 0) return cards;

  return [
    {
      ...base,
      id: "isolation",
      title: "Isolation drill",
      summary:
        "Unlocks once we know which letter pairs your hands are slowest on.",
      description:
        "Once we've spotted the letter pairs your hands are slowest on, this drill hammers one of them across dozens of varied everyday words, so the speed transfers instead of sticking to a single word.",
      payoff:
        "Isolating one weak motion across many real words is the highest-transfer drill: you train the movement, not the word.",
      ready: false,
      items: [],
    },
  ];
}
