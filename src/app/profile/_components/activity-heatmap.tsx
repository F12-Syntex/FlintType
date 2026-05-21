import { cn } from "@/lib/utils";
import type { DayCell, StreakStats } from "./derive-stats";

/** Activity heatmap panel — wide 52-week strip inside a bordered
 *  card, with a single caption line in the header and the Less/More
 *  legend in the footer. Cells stretch to fill the available width
 *  on desktop; mobile overflows into a swipeable strip below ~440px. */
export function ActivityHeatmap({
  days,
  streak,
  bare = false,
}: {
  days: DayCell[];
  streak: StreakStats;
  /** Render without the bordered card wrapper, for embedding in a parent
   *  panel (e.g. the Activity + Skill split card). */
  bare?: boolean;
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

  const content = (
    <>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-4 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Activity · last 6 months
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-muted-foreground/80">
          {captionParts.join(" · ")}
        </span>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex min-w-[300px] flex-col gap-1.5 sm:w-full sm:min-w-0">
          <MonthAxis columns={columns} />
          <div
            className="grid w-full gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(8px, 1fr))`,
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
            className="size-3 rounded-[2px]"
            style={{ background: cellBg(v) }}
          />
        ))}
        <span>More</span>
      </div>
    </>
  );

  if (bare) return content;
  return (
    <section className="rounded-md border border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
      {content}
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
    return (
      <span
        aria-hidden
        className="block aspect-square w-full rounded-[2px]"
      />
    );
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
      className={cn(
        "block aspect-square w-full rounded-[2px] border border-foreground/[0.03]",
      )}
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
