import { cn } from "@/lib/utils";
import type { ScoreWordOutput } from "@/types/adapt";
import { isChallengeWord, predictedWordWpm } from "./playground-math";

/** One scored word in the playground: the word plus its predicted WPM.
 *  Only challenge-band words take the theme orange; everything else is
 *  a neutral chip, and unscored words stay muted until their score
 *  lands. */
export function WordChip({
  word,
  score,
  bandActive,
}: {
  word: string;
  score: ScoreWordOutput | undefined;
  bandActive: boolean;
}) {
  const chip =
    "inline-flex items-baseline gap-1.5 rounded-pill px-3 py-1 font-mono text-sm transition-colors";
  if (!score) {
    return (
      <span className={cn(chip, "bg-muted/60 text-muted-foreground")}>
        {word}
      </span>
    );
  }
  const wpm = predictedWordWpm(word, score.predictedMs);
  const challenge = isChallengeWord(word, score, bandActive);
  return (
    <span
      title={`${word}: ${wpm != null ? `about ${Math.round(wpm)} wpm` : "too short to predict"}${challenge ? ", challenge band" : ""}`}
      className={cn(
        chip,
        challenge ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
      )}
    >
      {word}
      {wpm != null ? (
        <span className="text-[11px] tabular-nums opacity-70">
          {Math.round(wpm)}
        </span>
      ) : null}
    </span>
  );
}
