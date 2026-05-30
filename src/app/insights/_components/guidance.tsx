import type { HistorySummaryOutput } from "@/types/history";

/** Practical-guidance panel, derives 1-3 short coaching lines from
 *  the snapshot. Realistic and concrete: 'drill this exact pair',
 *  'your accuracy slipped on long passages', etc. Skips the
 *  motivational fluff. */
export function Guidance({ snap }: { snap: HistorySummaryOutput }) {
  const tips = buildTips(snap);
  if (tips.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Once you&apos;ve typed a bit more, this section will surface
        the highest-leverage drill or change to make next.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {tips.map((tip, i) => (
        <li
          key={i}
          className="flex gap-3 text-sm leading-relaxed text-foreground"
        >
          <span
            aria-hidden
            className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-primary"
          />
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
}

function buildTips(snap: HistorySummaryOutput): string[] {
  const tips: string[] = [];

  if (snap.cold) {
    tips.push(
      "Run a handful of tests at /app to leave cold start. Once the algorithm has about 200 bigram samples it'll start tailoring drills.",
    );
    return tips;
  }

  // 1) Worst pair, concrete drill suggestion.
  const worstPair = snap.weakestPairs[0];
  if (worstPair && worstPair.weakness > 0) {
    const slowPct =
      snap.bigramBaselineMs > 0
        ? Math.round(
            ((worstPair.meanMs - snap.bigramBaselineMs) /
              snap.bigramBaselineMs) *
              100,
          )
        : null;
    tips.push(
      slowPct != null
        ? `Your slowest letter pair is "${worstPair.key}", typed ${slowPct}% slower than your overall baseline. The Weakness gauntlet drill at /drills bursts a passage built around it.`
        : `Your slowest letter pair is "${worstPair.key}". The Weakness gauntlet drill at /drills burst-trains it under sudden death.`,
    );
  }

  // 2) Worst word, concrete word-level focus.
  const worstWord = snap.weakestWords[0];
  if (worstWord && worstWord.weakness > 0) {
    tips.push(
      `One word, "${worstWord.key}", drags your overall WPM the most. The Worst-words burst drill targets the slowest 20.`,
    );
  }

  // 3) If neither, generic accuracy nudge from completion rate.
  if (tips.length === 0) {
    tips.push(
      "Your model is warm and balanced, with no single weak pair standing out. Mix in the Tongue-twister gauntlet drill to keep pushing the ceiling.",
    );
  }

  return tips;
}
