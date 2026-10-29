import { Minus, MoveRight, Sprout, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendState } from "@/types/insights";

const TREND_ICON: Record<TrendState, LucideIcon> = {
  improving: TrendingUp,
  steady: MoveRight,
  levelled: Minus,
  slipping: TrendingDown,
  early: Sprout,
};

type TrendWordProps = {
  state: TrendState;
  /** "Improving.", "Holding steady.", … */
  word: string;
  /** One muted sentence after the word. */
  sentence: string;
  className?: string;
};

/** Which way speed is heading: an ink icon, the word in semibold, then a
 *  muted sentence, wrapping inline. Never a pill, never coloured. */
export function TrendWord({ state, word, sentence, className }: TrendWordProps) {
  const Icon = TREND_ICON[state];
  return (
    <p className={cn("text-sm leading-relaxed text-foreground", className)}>
      <Icon aria-hidden className="mr-1.5 inline-block size-4 -translate-y-px align-middle" />
      <span className="font-semibold">{word}</span>{" "}
      <span className="text-muted-foreground">{sentence}</span>
    </p>
  );
}
