import { Loader2 } from "lucide-react";
import type { PlaygroundSummary } from "./playground-math";

/** The playground's one-line readout: predicted WPM for the whole
 *  text, how many words are worth practising (with a swatch matching
 *  the orange chips) and scoring progress. Only rendered when there is
 *  text to score. */
export function SummaryRow({
  summary,
  total,
  bandActive,
  busy,
}: {
  summary: PlaygroundSummary;
  total: number;
  bandActive: boolean;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
      <span>
        Predicted{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {summary.predictedWpm != null ? Math.round(summary.predictedWpm) : "–"}
        </span>{" "}
        wpm
      </span>
      {bandActive ? (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="h-3 w-5 rounded-pill bg-primary/15 ring-1 ring-inset ring-primary/60"
          />
          <span>
            <span className="font-semibold tabular-nums text-foreground">
              {summary.challenge}
            </span>{" "}
            worth practising
          </span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        {busy ? (
          <Loader2 aria-hidden className="size-3.5 motion-safe:animate-spin" />
        ) : null}
        {summary.scored} of {total} scored
      </span>
    </div>
  );
}
