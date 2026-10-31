import { cn } from "@/lib/utils";

/** Segment classes for the practice mode bar's hand-built items (the
 *  length picker with its custom input, the wordlist trigger, the
 *  adaptive toggle). They mirror `<SegmentedControl size="md">` exactly
 *  (ui-law §17.2 / §21) so every pill in the bar reads as one switch:
 *  the selected item is the filled orange brand pill, the rest are
 *  muted text that lifts to ink on hover. */
export function segmentClass(active: boolean, className?: string): string {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1.5 text-[13px] font-medium outline-none",
    "transition-[color,background-color,box-shadow] duration-200",
    "focus-visible:ring-2 focus-visible:ring-ring/40",
    active
      ? "brand-surface text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
    className,
  );
}

/** The framed pill track a standalone switch sits in (mobile stacked
 *  controls). Same values as `<SegmentedControl framed>`. */
export const SEGMENT_TRACK =
  "inline-flex items-center gap-0.5 rounded-pill border border-border bg-muted/70 p-1";

/** Drop focus after a pointer click so the focus ring doesn't linger on
 *  a pill, while keyboard activation (detail === 0) keeps focus where
 *  the user is. Focus then falls back to the page, which the practice
 *  surface treats as "typing". */
export function blurAfterPointerClick(e: {
  detail: number;
  currentTarget: HTMLElement;
}): void {
  if (e.detail > 0) e.currentTarget.blur();
}
