import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { AdaptSnapshotOutput } from "@/types/adapt";

/** Editorial page hero. Stays compact at 375 px (eyebrow → headline →
 *  status row stacked) and broadens at sm: into a baseline-aligned
 *  band with the status pill + refresh on the right. */
export function BiogramHeader({
  snap,
  loading,
  onRefresh,
}: {
  snap: AdaptSnapshotOutput | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="border-b border-foreground/10 px-5 pt-10 pb-9 sm:px-14 sm:pt-14 sm:pb-12">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-block h-px w-7 bg-primary" aria-hidden />
        <Tag>BIOGRAM · ALGORITHM STATE</Tag>
      </div>

      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-12">
        <div className="flex flex-col gap-4">
          <h1 className="font-bold tracking-[-0.02em] text-foreground text-[28px] leading-[1.05] sm:text-[44px] lg:text-[56px]">
            What the adapt loop
            <br />
            <span className="text-foreground/60">knows about you.</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every keystroke you commit feeds three small models — bigram,
            trigram, motor-feature. This page is the X-ray: the patterns
            tracked, the words queued, and exactly how a candidate word
            gets scored on its way to you.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <StatusPill snap={snap} />
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              "group inline-flex items-center gap-2 rounded-md border border-foreground/15 px-3 py-2",
              "font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-foreground",
              "transition-[color,background-color,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "hover:border-primary hover:text-primary disabled:opacity-40",
            )}
            aria-label={loading ? "Refreshing snapshot" : "Refresh snapshot"}
          >
            <span
              aria-hidden
              className={cn(
                "inline-block size-1.5 rounded-full bg-primary transition-opacity",
                loading
                  ? "animate-pulse opacity-100 motion-reduce:animate-none"
                  : "opacity-50 group-hover:opacity-100",
              )}
            />
            {loading ? "REFRESHING…" : "REFRESH"}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusPill({ snap }: { snap: AdaptSnapshotOutput | null }) {
  if (!snap) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-foreground/30" aria-hidden />
        Awaiting snapshot
      </span>
    );
  }
  const cold = snap.cold;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em]",
        cold
          ? "border-foreground/15 text-muted-foreground"
          : "border-primary/40 text-primary",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          cold ? "bg-foreground/30" : "bg-primary",
        )}
        aria-hidden
      />
      {cold ? "Cold start" : "Warm"}
      <span className="text-foreground/40">·</span>
      <span className="tabular-nums">
        {snap.totalBigramSamples.toLocaleString()} samples
      </span>
    </span>
  );
}
