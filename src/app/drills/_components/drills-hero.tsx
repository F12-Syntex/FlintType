import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

/** Compact hero — mirrors <InsightsHero> exactly so /drills reads as
 *  the same product surface as /insights and /races. Eyebrow tick +
 *  Tag, two-line headline lockup (foreground / foreground-60), one
 *  description line, status pill on the right. */
export function DrillsHero({
  ready,
  locked,
  loading,
}: {
  ready: number;
  locked: number;
  loading: boolean;
}) {
  return (
    <header className="mx-5 mt-8 rounded-md border border-border bg-card px-6 py-7 sm:mx-12 sm:mt-10 sm:px-10 sm:py-10 lg:mx-16">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-7 bg-primary" />
        <Tag>Drills · targeted practice</Tag>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px]">
            Drill your
            <br />
            <span className="text-foreground/60">weak spots.</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Short, focused sets on the letter pairs and words you're
            slowest at. Plus sudden-death gauntlets, pangrams, and a
            top-100 sprint you can run any time.
          </p>
        </div>

        <StatusPill ready={ready} locked={locked} loading={loading} />
      </div>
    </header>
  );
}

function StatusPill({
  ready,
  locked,
  loading,
}: {
  ready: number;
  locked: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span aria-hidden className="size-1.5 rounded-full bg-foreground/30" />
        Reading model…
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em]",
        ready > 0
          ? "border-primary/40 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          ready > 0 ? "bg-primary" : "bg-foreground/30",
        )}
      />
      <span className="tabular-nums text-foreground">{ready}</span>{" "}
      ready
      {locked > 0 ? (
        <>
          <span className="text-foreground/40">·</span>
          <span className="tabular-nums">{locked}</span> locked
        </>
      ) : null}
    </span>
  );
}
