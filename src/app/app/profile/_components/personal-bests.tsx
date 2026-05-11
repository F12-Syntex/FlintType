import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { PersonalBest } from "./derive-stats";

/** MonkeyType-style personal-bests grid. Two mode rows (training,
 *  casual). Each row is a horizontal strip of cells — one per length
 *  the user has actually attempted, sorted ascending. Each cell shows
 *  the best WPM (big, primary) and the matching accuracy (small,
 *  muted). No run count, no padding — dense, scannable.
 *
 *  Data note: the test schema records the *algorithmic* mode
 *  (training / casual / reverse_adaptive). The player intent
 *  (TIME / WORDS / QUOTE) isn't stored, so cells are labelled by
 *  raw length with a generic unit. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const grouped = new Map<string, PersonalBest[]>();
  for (const b of bests) {
    const list = grouped.get(b.mode) ?? [];
    list.push(b);
    grouped.set(b.mode, list);
  }
  // Stable display order: training first, then casual, then anything
  // else alphabetical.
  const order = (m: string) =>
    m === "training" ? 0 : m === "casual" ? 1 : 2;
  const rows = [...grouped.entries()].sort(
    ([a], [b]) => order(a) - order(b) || a.localeCompare(b),
  );

  if (bests.length === 0) {
    return (
      <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
        <div className="mb-3 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>Personal bests</Tag>
        </div>
        <p className="text-sm text-muted-foreground">
          Finish a few tests and your bests will land here, organised
          by mode and length.
        </p>
      </section>
    );
  }

  return (
    <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
      <div className="mb-7 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <Tag>Personal bests</Tag>
      </div>

      <div className="grid gap-7 lg:grid-cols-2 lg:gap-6">
        {rows.map(([mode, modeBests]) => (
          <ModeStrip key={mode} mode={mode} bests={modeBests} />
        ))}
      </div>
    </section>
  );
}

function ModeStrip({
  mode,
  bests,
}: {
  mode: string;
  bests: PersonalBest[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
        {prettyMode(mode)}
      </span>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {bests.slice(0, 4).map((b, i) => (
            <BestCell key={`${b.mode}-${b.amount}-${i}`} best={b} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BestCell({ best }: { best: PersonalBest }) {
  return (
    <div className={cn("flex flex-col gap-2 bg-card px-4 py-5 sm:px-5 sm:py-6")}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground tabular-nums">{best.amount}</span>
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[44px] font-bold tabular-nums leading-[0.95] text-primary sm:text-[56px]">
          {Math.round(best.bestWpm)}
        </span>
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {best.bestAccuracy.toFixed(1)}%{" "}
        <span className="text-muted-foreground/60">acc</span>
      </span>
    </div>
  );
}

function prettyMode(mode: string): string {
  if (mode === "training") return "Training";
  if (mode === "casual") return "Casual";
  return mode;
}
