import { FieldList } from "@/components/analysis/field-list";
import type { DayCell, StreakStats } from "./derive-activity";

/** The activity heatmap: one column per week, Monday at the top, an
 *  orange intensity ramp for busier days. Fills its parent's height
 *  (`justify-between`) so its legend lines up with the skill radar's
 *  legend in the split card. Cells stretch to the column width. */
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
    `${total} ${total === 1 ? "test" : "tests"}`,
    `${activeDays} active ${activeDays === 1 ? "day" : "days"}`,
    streak.longest > 0 ? `${streak.longest}-day best streak` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full flex-col justify-between gap-5">
      <header className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground">Activity</h3>
        <FieldList
          variant="inline"
          size="sm"
          items={[
            { value: total, label: total === 1 ? "test" : "tests" },
            { value: activeDays, label: activeDays === 1 ? "active day" : "active days" },
            ...(streak.longest > 0 ? [{ value: `${streak.longest}-day`, label: "best streak" }] : []),
          ]}
        />
      </header>

      <div className="flex w-full flex-col gap-1.5">
        <MonthAxis columns={columns} />
        {/* One image to assistive tech: the per-day cells keep a hover
         *  `title` for mouse users but are hidden from screen readers. */}
        <div
          role="img"
          aria-label={`Activity over the last 6 months: ${captionParts.join(", ")}`}
          className="grid w-full gap-0.5 sm:gap-1"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5 sm:gap-1">
              {week.map((d, di) => (
                <Cell key={di} day={d} max={max} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Last 6 months</span>
        <span className="flex items-center gap-1.5">
          <span>Less</span>
          {[0, 0.15, 0.35, 0.6, 1].map((v, i) => (
            <span
              key={i}
              aria-hidden
              className="size-3 rounded-[30%]"
              style={{ background: cellBg(v) }}
            />
          ))}
          <span>More</span>
        </span>
      </div>
    </div>
  );
}

/** Month labels above the grid. Labels overflow their (narrow) column
 *  instead of clipping, so a label is dropped when the next one starts
 *  within three weeks, and none is drawn in the last two columns where
 *  it would run past the grid's right edge. */
function MonthAxis({ columns }: { columns: (DayCell | null)[][] }) {
  const starts: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  columns.forEach((week, idx) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return;
    const m = firstDay.date.getMonth();
    if (m !== lastMonth) {
      starts.push({
        idx,
        label: firstDay.date.toLocaleDateString(undefined, { month: "short" }),
      });
      lastMonth = m;
    }
  });
  const labels = new Map<number, string>();
  starts.forEach((s, i) => {
    const next = starts[i + 1];
    if (next && next.idx - s.idx < 3) return;
    if (s.idx > columns.length - 3) return;
    labels.set(s.idx, s.label);
  });
  return (
    <div
      aria-hidden
      className="grid w-full text-[10px] text-muted-foreground"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((_, idx) => (
        <span key={idx} className="overflow-visible whitespace-nowrap">
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
  const dayLong = day.date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const label =
    day.tests === 0
      ? `No runs on ${dayLong}`
      : `${day.tests} ${day.tests === 1 ? "run" : "runs"} on ${dayLong}`;
  return (
    <span
      aria-hidden
      title={label}
      className="block aspect-square w-full rounded-[30%]"
      style={{ background: cellBg(ratio) }}
    />
  );
}

/** The orange intensity ramp. Empty days are a faint ink wash so the
 *  grid reads in both modes; any activity at all is clearly orange. */
function cellBg(ratio: number): string {
  if (ratio <= 0)
    return "color-mix(in oklch, var(--foreground) 7%, transparent)";
  if (ratio < 0.25)
    return "color-mix(in oklch, var(--primary) 30%, transparent)";
  if (ratio < 0.5)
    return "color-mix(in oklch, var(--primary) 50%, transparent)";
  if (ratio < 0.8)
    return "color-mix(in oklch, var(--primary) 75%, transparent)";
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
