"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SLICE_LABEL, secShort } from "@/lib/format-figure";
import { cn } from "@/lib/utils";
import { SLICE_ORDER, type SliceKey, type SliceSet } from "@/types/typing-analysis";
import { budgetSegments, sliceFill } from "./budget-segments";

type MinuteBarProps = {
  /** Seconds per slice: seconds a minute (total 60) or a test's seconds
   *  (total T/1000). */
  slices: SliceSet;
  total: number;
  /** The slice the page's primary action addresses: drawn orange. */
  focus?: SliceKey | null;
  /** A small caption above the bar ("Your recent minute"). */
  label?: string;
  /** Tick labels under the bar's two ends ("0 s", "60 s"). */
  ends?: [string, string];
  className?: string;
};

/** Where the time went, as one stacked bar. Decorative for assistive tech
 *  (`aria-hidden`): the `<BudgetTable>` beside it is the accessible
 *  version and always visible. From md each segment names itself on
 *  hover, through a transparent hit layer taller than the 12px bar. */
export function MinuteBar({ slices, total, focus = null, label, ends, className }: MinuteBarProps) {
  const pct = budgetSegments(slices, total);
  const parts = SLICE_ORDER.map((key, i) => ({ key, pct: pct[i] })).filter((p) => p.pct > 0);

  return (
    <div aria-hidden className={cn("flex flex-col gap-1.5", className)}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <div className="relative">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-card">
          {parts.map((p) => (
            <div
              key={p.key}
              className={cn("h-full min-w-0", sliceFill(p.key, focus))}
              style={{ flexGrow: p.pct, flexBasis: 0 }}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 -inset-y-2 hidden gap-0.5 md:flex">
          {parts.map((p) => (
            <Tooltip key={p.key}>
              <TooltipTrigger asChild>
                <div className="h-full min-w-0" style={{ flexGrow: p.pct, flexBasis: 0 }} />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {SLICE_LABEL[p.key]}, {secShort(slices[p.key] * 1000)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
      {ends ? (
        <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      ) : null}
    </div>
  );
}
