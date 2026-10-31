"use client";

import { useMemo, useState } from "react";
import { FieldList } from "@/components/analysis/field-list";
import { MethodDisclosure } from "@/components/analysis/method-disclosure";
import { PageSection, Surface } from "@/components/page-shell";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { dateShort, speed } from "@/lib/format-figure";
import { cn } from "@/lib/utils";
import type { InsightsBucket, SpeedHeadline, TrendSeries } from "@/types/insights";
import { speedMethod, speedNote, TREND_TITLE } from "./insights-copy";
import { TrendChart } from "./trend-chart";
import {
  CHART_TOO_FEW,
  FIELD_FIRST,
  FIELD_TESTS,
  fieldBest,
  legendLabels,
  plateauLine,
  RANGE_EMPTY,
  RANGE_LABEL,
  rangeOne,
  type TrendView,
} from "./trend-copy";
import { defaultRange, drawnMarks, isDaily, seriesFacts, TREND_RANGES, type TrendRange, trendRows } from "./trend-data";
import { TrendTable } from "./trend-table";

/** ui-law §18.5's section-switch sizing, written inline: the profile's
 *  `SECTION_SWITCH` is another route's private file (ui-law §1.2). */
const SWITCH =
  "w-full flex-nowrap p-0.5 sm:h-10 sm:w-auto sm:p-1 [&>button]:min-h-11 [&>button]:flex-1 [&>button]:py-0 sm:[&>button]:h-full sm:[&>button]:min-h-0 sm:[&>button]:flex-none";

const OPTIONS = TREND_RANGES.map((r) => ({
  value: r.value,
  label: (
    <>
      <span aria-hidden>{r.short}</span>
      <span className="sr-only">{r.label}</span>
    </>
  ),
}));

/** "Your speed over time" (spec-40 §3.5). The view keys it by bucket,
 *  so the range's default follows each bucket's own test count. */
export function TrendSection({
  series,
  headline,
  bucket,
  tests,
  unit,
}: {
  series: TrendSeries | null;
  headline: SpeedHeadline | null;
  bucket: InsightsBucket | null;
  tests: number;
  unit: TypingSpeedUnit;
}) {
  // "Now" for the range cutoffs, fixed when the section mounts.
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState<TrendRange>(() => defaultRange(tests, series, now));
  const daily = series ? isDaily(series, tests) : false;
  const rows = useMemo(
    () => (series ? trendRows(series, range, now, unit, daily) : []),
    [series, range, now, unit, daily],
  );

  if (!series || series.points.length < 2) {
    return (
      <PageSection id="trend" title={TREND_TITLE}>
        <p className="text-sm text-muted-foreground">{CHART_TOO_FEW}</p>
      </PageSection>
    );
  }
  const facts = seriesFacts(series);
  const view: TrendView = {
    adjusted: series.adjusted || series.scaled,
    daily,
    allowing: series.scaled ? (series.adjusted ? "length and difficulty" : "length") : "difficulty",
  };
  const note = speedNote(series.adjusted, series.scaled ? bucket : null);
  const drawn = drawnMarks(rows);
  const levelled = headline?.trend.state === "levelled";
  return (
    <PageSection
      id="trend"
      title={TREND_TITLE}
      actions={
        <SegmentedControl ariaLabel={RANGE_LABEL} value={range} onValueChange={setRange} options={OPTIONS} className={SWITCH} />
      }
    >
      <Surface className="flex flex-col gap-4 p-3 sm:p-5">
        {rows.length >= 2 ? (
          <>
            <TrendChart rows={rows} unit={unit} view={view} />
            <Legend
              view={view}
              median={drawn.median}
              band={drawn.band}
              pb={!view.adjusted && rows.some((r) => r.pb)}
            />
          </>
        ) : (
          <p className="px-1 py-6 text-sm text-muted-foreground sm:px-0">
            {rows.length === 1 ? rangeOne(view) : RANGE_EMPTY}
          </p>
        )}
      </Surface>
      {note ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
          <MethodDisclosure>
            {speedMethod(series.adjusted, series.scaled ? bucket : null).map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </MethodDisclosure>
        </div>
      ) : null}
      <FieldList
        variant="stacked"
        items={[
          { label: FIELD_TESTS, value: tests.toLocaleString("en-GB") },
          { label: fieldBest(view), value: speed(facts.best, unit) },
          { label: FIELD_FIRST, value: dateShort(facts.firstMs) },
        ]}
      />
      {levelled && headline?.trend.weeks ? (
        <p className="text-sm text-foreground">{plateauLine(headline.usual, headline.trend.weeks, unit)}</p>
      ) : null}
      {rows.length > 0 ? <TrendTable rows={rows} unit={unit} view={view} /> : null}
    </PageSection>
  );
}

function Swatch({ kind }: { kind: "median" | "band" | "test" | "pb" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0",
        kind === "median" && "h-0.5 w-4 rounded-full bg-foreground",
        kind === "band" && "h-2.5 w-4 rounded-sm bg-foreground/10",
        kind === "test" && "size-2 rounded-full bg-foreground/35",
        kind === "pb" && "size-2 rounded-full bg-foreground",
      )}
    />
  );
}

function Legend({ view, median, band, pb }: { view: TrendView; median: boolean; band: boolean; pb: boolean }) {
  const labels = legendLabels(view);
  const items = [
    median ? ("median" as const) : null,
    band ? ("band" as const) : null,
    "test" as const,
    pb ? ("pb" as const) : null,
  ].filter((k) => k !== null);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-muted-foreground sm:px-0">
      {items.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <Swatch kind={k} />
          {labels[k]}
        </li>
      ))}
    </ul>
  );
}
