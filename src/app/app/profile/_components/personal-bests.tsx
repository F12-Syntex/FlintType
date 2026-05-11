import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { PersonalBest } from "./derive-stats";

/** Personal-best WPM grouped by mode + amount. Each cell shows the
 *  best WPM and the matching accuracy + sample count. Empty cells
 *  render as a dim "—" so the user sees which modes they haven't
 *  attempted yet — incentive to fill the matrix. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  // Static expected matrix so empty modes still show a placeholder
  // cell — invites the user to attempt the missing combinations.
  const ROWS: { mode: string; amounts: number[] }[] = [
    { mode: "training", amounts: [25, 50, 100, 200] },
    { mode: "casual", amounts: [25, 50, 100, 200] },
  ];

  const lookup = new Map<string, PersonalBest>();
  for (const b of bests) lookup.set(`${b.mode}|${b.amount}`, b);

  return (
    <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
      <div className="mb-7 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <Tag>Personal bests · WPM</Tag>
      </div>

      <div className="flex flex-col gap-8">
        {ROWS.map((row) => (
          <ModeRow
            key={row.mode}
            mode={row.mode}
            amounts={row.amounts}
            lookup={lookup}
          />
        ))}
      </div>
    </section>
  );
}

function ModeRow({
  mode,
  amounts,
  lookup,
}: {
  mode: string;
  amounts: number[];
  lookup: Map<string, PersonalBest>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {mode === "training" ? "Training" : "Casual"}
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          words mode
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {amounts.map((amt) => {
          const b = lookup.get(`${mode}|${amt}`);
          return <BestCell key={amt} amount={amt} best={b ?? null} />;
        })}
      </div>
    </div>
  );
}

function BestCell({
  amount,
  best,
}: {
  amount: number;
  best: PersonalBest | null;
}) {
  const empty = best == null;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-card px-4 py-4",
        empty ? "border-dashed border-border" : "border-border",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {amount} words
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-3xl font-bold tabular-nums leading-none",
            empty ? "text-foreground/30" : "text-primary",
          )}
        >
          {empty ? "—" : Math.round(best.bestWpm)}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          wpm
        </span>
      </div>
      <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
        {empty
          ? "no runs yet"
          : `${best.bestAccuracy.toFixed(1)}% acc · ${best.testsCount} run${best.testsCount === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}
