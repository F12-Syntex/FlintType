import { Progress } from "@/components/ui/progress";
import { SCORING_LABEL, scoringValue } from "./labels-copy";
import type { PlaygroundSummary } from "./playground-math";

/** The playground's one-line readout: predicted WPM for the whole text
 *  and how many words are worth practising (with a swatch matching the
 *  orange chips). While words are being scored, a thin ink bar shows how
 *  far it has got, and it disappears when done. Nothing stands in for a
 *  figure that isn't there yet. Only rendered when there is text. */
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
        {summary.predictedWpm != null ? (
          <span>
            Predicted{" "}
            <span className="font-semibold tabular-nums text-foreground">{Math.round(summary.predictedWpm)}</span> wpm
          </span>
        ) : null}
        {bandActive ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="h-3 w-5 rounded-pill bg-primary/15 ring-1 ring-inset ring-primary/60" />
            <span>
              <span className="font-semibold tabular-nums text-foreground">{summary.challenge}</span> worth practising
            </span>
          </span>
        ) : null}
      </div>
      {busy ? (
        <Progress
          value={summary.scored}
          max={Math.max(1, total)}
          aria-label={SCORING_LABEL}
          aria-valuetext={scoringValue(summary.scored, total)}
          trackClassName="h-1 max-w-48"
        />
      ) : null}
    </div>
  );
}
