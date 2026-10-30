import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANKS, type RankId } from "@/types/rank";

const SIZE = {
  sm: "h-5 gap-1 px-1.5 text-[10px]",
  md: "h-7 gap-1.5 px-2.5 text-[11px]",
} as const;

const ICON = { sm: 11, md: 13 } as const;

/** The self-selected WPM rank flair — an ember flame glyph + the rank
 *  label in a hairline chip. The flame carries the brand spark; the
 *  label stays ink so the chip reads as identity, not a second CTA
 *  (ui-law §14). Fixed ember tint across every tier — no rank is louder
 *  than another. */
export function RankBadge({
  rank,
  size = "sm",
  className,
}: {
  rank: RankId;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const def = RANKS[rank];
  return (
    <span
      title={`${def.label}. For typists at ${rangePhrase(def.range)}.`}
      className={cn(
        "inline-flex items-center rounded-pill border border-primary/25 bg-primary/[0.06] font-semibold uppercase tracking-[0.12em] text-foreground",
        SIZE[size],
        className,
      )}
    >
      <Flame
        size={ICON[size]}
        strokeWidth={2.25}
        aria-hidden
        className="shrink-0 text-primary"
      />
      {def.label}
    </span>
  );
}

/** A rank's wpm range in words: "80–99" reads "80 to 99 wpm", and an
 *  open-ended "250+" reads "250 wpm and up". */
export function rangePhrase(range: string): string {
  if (range.endsWith("+")) return `${range.slice(0, -1)} wpm and up`;
  const [lo, hi] = range.split("–");
  return hi ? `${lo} to ${hi} wpm` : `${range} wpm`;
}
