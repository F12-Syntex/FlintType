import { cn } from "@/lib/utils";
import type { DayCell, StreakStats } from "./derive-stats";

/** Activity strip — last 52 weeks of completed tests per day. Halved
 *  in height from the prior bordered-card version so the section
 *  reads as a strip beneath the page rhythm, not a wall. No
 *  surrounding card; single quiet caption above + the legend below.
 *
 *  On mobile the columns can collapse under 6px squares, so we keep
 *  the existing `overflow-x-auto` wrapper with a fixed minimum width
 *  — the user swipes the year horizontally if their viewport is
 *  narrower than ~440px. */
export function ActivityHeatmap({
  days,
  streak,
}: {
  days: DayCell[];
  streak: StreakStats;
}) {
  if (days.length === 0) return null;
  const max = days.reduce((m, d) => (d.tests > m ? d.tests : m), 0);
  const total = days.reduce((s, d) => s + d.tests, 0);
  const activeDays = days.filter((d) => d.tests > 0).length;
  const columns = chunkIntoWeeks(days);

  const captionParts = [
    `${total} tests`,
    `${activeDays} active days`,
    streak.longest > 0 ? `${streak.longest}-day record` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <SectionLabel>Activity · last 12 months</SectionLabel>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80 tabular-nums">
          {captionParts.join(" · ")}
        </span>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex min-w-[440px] flex-col gap-1.5 sm:w-full sm:min-w-0">
          <MonthAxis columns={columns} />
          <div
            className="grid w-full gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(6px, 1fr))`,
            }}
          >
            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((d, di) => (
                  <Cell key={di} day={d} max={max} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <span
            key={i}
            aria-hidden
            className="size-2.5"
            style={{ background: cellBg(v) }}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

function MonthAxis({ columns }: { columns: (DayCell | null)[][] }) {
  const labels = new Map<number, string>();
  let lastMonth = -1;
  columns.forEach((week, idx) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return;
    const m = firstDay.date.getMonth();
    if (m !== lastMonth) {
      labels.set(
        idx,
        firstDay.date.toLocaleDateString(undefined, { month: "short" }),
      );
      lastMonth = m;
    }
  });
  return (
    <div
      className="grid w-full text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((_, idx) => (
        <span
          key={idx}
          className="overflow-hidden whitespace-nowrap text-left"
        >
          {labels.get(idx) ?? ""}
        </span>
      ))}
    </div>
  );
}

function Cell({ day, max }: { day: DayCell | null; max: number }) {
  if (!day) {
    return <span aria-hidden className="block aspect-square w-full" />;
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
      className={cn("block aspect-square w-full")}
      style={{ background: cellBg(ratio) }}
    />
  );
}

function cellBg(ratio: number): string {
  if (ratio <= 0)
    return "color-mix(in oklch, var(--foreground) 6%, transparent)";
  if (ratio < 0.2)
    return "color-mix(in oklch, var(--primary) 22%, transparent)";
  if (ratio < 0.4)
    return "color-mix(in oklch, var(--primary) 42%, transparent)";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-4 bg-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}
