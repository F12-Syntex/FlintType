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
    <header className="border-b border-border px-5 pt-12 pb-9 sm:px-12 sm:pt-14 sm:pb-10 lg:px-16">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-7 bg-primary" />
        <Tag>Drills · targeted practice</Tag>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px]">
            Targeted reps.
            <br />
            <span className="text-foreground/60">Built around your model.</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Short minigames against the bigrams and words your model
            says are slowest — plus curated sudden-death gauntlets,
            pangrams, and the top-100 sprint that always work without
            a model.
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
