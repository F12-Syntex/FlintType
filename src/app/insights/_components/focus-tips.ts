import type { HistorySummaryOutput, HistoryTest } from "@/types/history";

/** One "Focus next" row: a short headline, one plain sentence, and the
 *  drill (or page) that acts on it. Pure so it can be unit-tested
 *  (ui-law §1.3 exception). */
export type FocusTip = {
  id: "cold" | "pair" | "word" | "accuracy" | "ceiling";
  title: string;
  detail: string;
  /** Where the row's button goes. Null when the drill is still locked;
   *  `lockedNote` explains what unlocks it. */
  action: { href: string; label: string } | null;
  lockedNote?: string;
};

/** Mirrors `worstWordsReady` in `drills/_components/drills-data.ts`:
 *  the Worst-words burst unlocks once five slow words are timed. */
export const WORST_WORDS_MIN = 5;
/** Average accuracy below this over the recent window earns a tip. */
export const ACCURACY_FLOOR = 95;
/** How many recent completed runs the accuracy tip averages. */
export const ACCURACY_WINDOW = 10;
/** Fewer runs than this and an accuracy average is just noise. */
const ACCURACY_MIN_RUNS = 3;
const MAX_TIPS = 3;

const START_DRILL = "Start drill";

function slowerPct(meanMs: number, baselineMs: number): number | null {
  if (!(baselineMs > 0)) return null;
  const pct = Math.round(((meanMs - baselineMs) / baselineMs) * 100);
  return pct > 0 ? pct : null;
}

/** Mean accuracy over the newest completed runs, or null when there
 *  aren't enough runs to say anything. `tests` is newest-first. */
export function recentAccuracy(
  tests: readonly HistoryTest[],
): { mean: number; runs: number } | null {
  const window = tests.filter((t) => t.wasCompleted).slice(0, ACCURACY_WINDOW);
  if (window.length < ACCURACY_MIN_RUNS) return null;
  const mean = window.reduce((s, t) => s + t.accuracy, 0) / window.length;
  return { mean, runs: window.length };
}

export function buildFocusTips(snap: HistorySummaryOutput): FocusTip[] {
  if (snap.cold) {
    return [
      {
        id: "cold",
        title: "Warm up your model",
        detail:
          "Finish a few more tests. After about 200 letter-pair samples, drills start tailoring to you.",
        action: { href: "/", label: "Take a test" },
      },
    ];
  }

  const tips: FocusTip[] = [];

  const pair = snap.weakestPairs[0];
  if (pair && pair.weakness > 0) {
    const pct = slowerPct(pair.meanMs, snap.bigramBaselineMs);
    tips.push({
      id: "pair",
      title: `Slowest pair: “${pair.key}”`,
      detail: `${pct != null ? `${pct}% slower than your average pair. ` : ""}The Weakness gauntlet builds a passage around it.`,
      action: { href: "/drills/weakness", label: START_DRILL },
    });
  }

  const word = snap.weakestWords[0];
  if (word && word.weakness > 0) {
    const pct = slowerPct(word.meanMs, snap.wordBaselineMs);
    const ready = snap.weakestWords.length >= WORST_WORDS_MIN;
    tips.push({
      id: "word",
      title: `Slowest word: “${word.key}”`,
      detail: `${pct != null ? `${pct}% slower than your average word. ` : ""}The Worst-words burst drills your slowest 20.`,
      action: ready ? { href: "/drills/worst-words", label: START_DRILL } : null,
      lockedNote: ready ? undefined : `Unlocks at ${WORST_WORDS_MIN} slow words`,
    });
  }

  const acc = recentAccuracy(snap.recentTests);
  if (acc && acc.mean < ACCURACY_FLOOR) {
    tips.push({
      id: "accuracy",
      title: `Accuracy: ${acc.mean.toFixed(1)}%`,
      detail: `Average of your last ${acc.runs} runs. The Tongue-twister gauntlet only rewards clean runs.`,
      action: { href: "/drills/tricky", label: START_DRILL },
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "ceiling",
      title: "No single weak spot",
      detail:
        "Your model is balanced. The Tongue-twister gauntlet keeps pushing your ceiling.",
      action: { href: "/drills/tricky", label: START_DRILL },
    });
  }

  return tips.slice(0, MAX_TIPS);
}
