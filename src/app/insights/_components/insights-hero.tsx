import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";

/** Compact hero — page label + a one-line summary of the algorithm
 *  state (cold/warm, sample volume, last test). The whole point is
 *  that the user can read the 'what does the algorithm think of me
 *  right now' answer in one glance. */
export function InsightsHero({
  snap,
  loading,
}: {
  snap: HistorySummaryOutput | null;
  loading: boolean;
}) {
  return (
    <header className="border-b border-border px-5 pt-12 pb-9 sm:px-12 sm:pt-14 sm:pb-10 lg:px-16">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-7 bg-primary" />
        <Tag>Insights · your typing model</Tag>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="font-bold tracking-[-0.02em] text-foreground text-[28px] leading-[1.05] sm:text-[44px] lg:text-[52px]">
            What the algorithm
            <br />
            <span className="text-foreground/60">knows about you.</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Trends, slow words, weak letter pairs, plus a confidence
            playground to ask &quot;what does the algorithm say about{" "}
            <span className="text-foreground">this</span> text?&quot;
            All derived from your real keystroke history.
          </p>
        </div>

        <StatusPill snap={snap} loading={loading} />
      </div>
    </header>
  );
}

function StatusPill({
  snap,
  loading,
}: {
  snap: HistorySummaryOutput | null;
  loading: boolean;
}) {
  if (loading || !snap) {
    return (
      <span className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span aria-hidden className="size-1.5 rounded-full bg-foreground/30" />
        Reading model…
      </span>
    );
  }
  const cold = snap.cold;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em]",
        cold
          ? "border-border text-muted-foreground"
          : "border-primary/40 text-primary",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          cold ? "bg-foreground/30" : "bg-primary",
        )}
      />
      {cold ? "Cold start" : "Warm"}
      <span className="text-foreground/40">·</span>
      <span className="tabular-nums text-foreground">
        {snap.recentTests.length}
      </span>{" "}
      tests
    </span>
  );
}
