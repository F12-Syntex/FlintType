import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { DayCell } from "./derive-stats";

/** GitHub-style activity heatmap. Each column is a week (Mon → Sun);
 *  each cell is a day, painted by test count against the user's own
 *  busiest day so power users still see contrast.
 *
 *  Static — no animation, no tooltips beyond `title=` so screen
 *  readers can read the count out per cell. */
export function ActivityHeatmap({ days }: { days: DayCell[] }) {
  if (days.length === 0) return null;
  const max = days.reduce((m, d) => (d.tests > m ? d.tests : m), 0);
  const total = days.reduce((s, d) => s + d.tests, 0);
  const activeDays = days.filter((d) => d.tests > 0).length;

  // Group days into week columns. A week column always has 7 cells —
  // pad the last column with placeholder nulls so the grid stays
  // aligned to Monday-start regardless of where today lands.
  const columns = chunkIntoWeeks(days);

  return (
    <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>Activity · last {columns.length} weeks</Tag>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-foreground tabular-nums">{total}</span>{" "}
          tests ·{" "}
          <span className="text-foreground tabular-nums">{activeDays}</span>{" "}
          active days
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-end gap-[3px]">
          {columns.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d, di) => (
                <Cell key={di} day={d} max={max} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <span
            key={i}
            aria-hidden
            className="size-3 rounded-[2px]"
            style={{ background: cellBg(v) }}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

function Cell({ day, max }: { day: DayCell | null; max: number }) {
  if (!day) {
    return <span aria-hidden className="block size-3 rounded-[2px]" />;
  }
  const ratio = max > 0 ? Math.max(0, Math.min(1, day.tests / max)) : 0;
  const label =
    day.tests === 0
      ? `${day.date.toDateString()} · no runs`
      : `${day.date.toDateString()} · ${day.tests} run${day.tests === 1 ? "" : "s"}`;
  return (
    <span
      title={label}
      aria-label={label}
      className={cn("block size-3 rounded-[2px] border border-foreground/[0.04]")}
      style={{ background: cellBg(ratio) }}
    />
  );
}

function cellBg(ratio: number): string {
  if (ratio <= 0)
    return "color-mix(in oklch, var(--foreground) 5%, transparent)";
  // Five steps from muted to primary so contrast carries even at
  // narrow viewports.
  if (ratio < 0.2)
    return "color-mix(in oklch, var(--primary) 20%, transparent)";
  if (ratio < 0.4)
    return "color-mix(in oklch, var(--primary) 40%, transparent)";
  if (ratio < 0.7)
    return "color-mix(in oklch, var(--primary) 65%, transparent)";
  if (ratio < 0.9)
    return "color-mix(in oklch, var(--primary) 85%, transparent)";
  return "var(--primary)";
}

function chunkIntoWeeks(days: DayCell[]): (DayCell | null)[][] {
  if (days.length === 0) return [];
  const out: (DayCell | null)[][] = [];
  let week: (DayCell | null)[] = [];
  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      out.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    out.push(week);
  }
  return out;
}
