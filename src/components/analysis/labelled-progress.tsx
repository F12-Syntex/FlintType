import { Progress, ProgressLabel } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type LabelledProgressProps = {
  value: number;
  max: number;
  /** The left end's label; also the bar's accessible name. */
  startLabel: string;
  /** The right end's label ("12 of 30 words", "Level 5"). */
  endLabel: string;
  caption?: string;
  /** What a screen reader hears for the value ("340 of 1,000 XP"). */
  valueText: string;
  /** The page's one focus item: the fill wears the brand sweep. */
  focus?: boolean;
  className?: string;
};

/** Real progress as a bar with labelled ends, never "N% to X" or "N / M"
 *  (ui-law §0). Ink fill unless it is the view's one focus item. */
export function LabelledProgress({
  value,
  max,
  startLabel,
  endLabel,
  caption,
  valueText,
  focus = false,
  className,
}: LabelledProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Progress
        value={safeValue}
        max={safeMax}
        aria-valuetext={valueText}
        className="flex-col-reverse gap-1.5"
        trackClassName="h-2"
        indicatorClassName={focus ? "brand-surface" : "bg-foreground/60"}
      >
        <span className="flex items-baseline justify-between gap-3 text-xs">
          <ProgressLabel>{startLabel}</ProgressLabel>
          <span className="text-right tabular-nums text-muted-foreground">{endLabel}</span>
        </span>
      </Progress>
      {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
