import { cn } from "@/lib/utils";
import type { DayCell } from "./derive-stats";
import { ProfileSection } from "./profile-section";

/** GitHub-style activity heatmap. Each column is a week (Mon → Sun);
 *  each cell is a day, painted by test count against the user's own
 *  busiest day so power users still see contrast.
 *
 *  Cells stretch to fill the available row width — the column count
 *  is fixed (52 weeks) so the cell width is `(100 / 52)%` minus the
 *  inter-cell gap. No horizontal scroll on standard widths; the
 *  whole year reads at a glance.
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
    <ProfileSection
      label="Activity · last 12 months"
      actions={
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-foreground tabular-nums">{total}</span>{" "}
          tests ·{" "}
          <span className="text-foreground tabular-nums">{activeDays}</span>{" "}
          active days
        </span>
      }
    >
      <div className="flex w-full flex-col gap-1.5">
        <MonthAxis columns={columns} />
        <div
          className="grid w-full gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((d, di) => (
                <Cell key={di} day={d} max={max} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
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
    </ProfileSection>
  );
}

/** Top axis showing which week column each new month begins in.
 *  Labels share the same grid as the cells so they auto-align as the
 *  cell width flexes with the container. We render a label only on
 *  the first week of each month. */
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
      className="grid w-full text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((_, idx) => (
        <span
          key={idx}
          className="overflow-hidden text-left whitespace-nowrap"
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
        "block aspect-square w-full rounded-[2px] border border-foreground/[0.04]",
      )}
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
