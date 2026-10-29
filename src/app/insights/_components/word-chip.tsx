import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isChallengeWord, predictedWordWpm, type Scored } from "./playground-math";

/** One scored word in the playground: the word plus its predicted WPM.
 *  Words worth practising (the challenge band) carry the theme orange
 *  as a tint + ring, with the text in ink so it stays readable on the
 *  tint in light mode; everything else is a neutral chip, and unscored
 *  words stay muted until their score lands. Long words truncate; the
 *  shared tooltip names the full word (ui-law §27: no native `title`). */
export function WordChip({
  word,
  score,
  bandActive,
}: {
  word: string;
  score: Scored | undefined;
  bandActive: boolean;
}) {
  const chip =
    "inline-flex min-w-0 max-w-full items-baseline gap-1.5 rounded-pill px-3 py-1 font-mono text-sm transition-colors";
  if (!score) {
    return (
      <span className={cn(chip, "bg-muted/60 text-muted-foreground")}>
        <span className="truncate">{word}</span>
      </span>
    );
  }
  const wpm = predictedWordWpm(word, score.predictedMs);
  const challenge = isChallengeWord(word, score, bandActive);
  const tip = `${word}: ${wpm != null ? `about ${Math.round(wpm)} wpm` : "too short to predict"}${challenge ? ", worth practising" : ""}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            chip,
            challenge ? "bg-primary/15 text-foreground ring-1 ring-inset ring-primary/60" : "bg-muted text-foreground",
          )}
        >
          <span className="truncate">{word}</span>
          {wpm != null ? (
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums",
                challenge ? "text-foreground/75" : "text-muted-foreground",
              )}
            >
              {Math.round(wpm)}
            </span>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
