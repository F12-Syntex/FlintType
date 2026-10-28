import Link from "next/link";
import { Surface } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";
import { buildFocusTips } from "./focus-tips";

/** "Focus next": the page's answer, first. One to three concrete tips
 *  derived from the model, each with the drill that acts on it. The
 *  top tip carries the page's one filled primary button; the rest are
 *  outline so the priority reads at a glance. */
export function FocusNext({ snap }: { snap: HistorySummaryOutput }) {
  const tips = buildFocusTips(snap);
  const primary = tips.findIndex((t) => t.action != null);
  return (
    <Surface as="ol" className="divide-y divide-border/70">
      {tips.map((tip, i) => (
        <li key={tip.id} className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
          <span
            aria-hidden
            className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground"
          >
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">
                {tip.title}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {tip.detail}
              </p>
            </div>
            {tip.action ? (
              <Link
                href={tip.action.href}
                className={cn(
                  buttonVariants({ variant: i === primary ? "default" : "outline" }),
                  "h-11 w-full sm:h-9 sm:w-auto",
                )}
              >
                {tip.action.label}
              </Link>
            ) : tip.lockedNote ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {tip.lockedNote}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </Surface>
  );
}
