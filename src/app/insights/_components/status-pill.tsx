import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";

/** Header status: is the model warm, and how many runs feed it. A
 *  status, not a selection, so it stays neutral; the green dot is the
 *  sanctioned "ok" mark (ui-law §17.7). */
export function StatusPill({
  snap,
  loading,
}: {
  snap: HistorySummaryOutput | null;
  loading: boolean;
}) {
  if (loading && !snap) {
    return (
      <span
        role="status"
        aria-label="Reading your model"
        className="h-8 w-36 rounded-pill bg-muted motion-safe:animate-pulse"
      />
    );
  }
  if (!snap) return null;
  const runs = snap.recentTests.filter((t) => t.wasCompleted).length;
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-pill border border-border bg-card px-3 text-xs font-medium text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          snap.cold ? "bg-muted-foreground/50" : "bg-ft-ok",
        )}
      />
      <span className="text-foreground">
        {snap.cold ? "Cold start" : "Model warm"}
      </span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        {runs} {runs === 1 ? "test" : "tests"}
      </span>
    </span>
  );
}
