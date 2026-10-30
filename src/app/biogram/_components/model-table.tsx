"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { DeltaText } from "@/components/analysis/delta-text";
import { Surface } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import type { AdaptModelRow } from "@/types/adapt";
import { baselineDeltaMs } from "./baseline-delta";
import { SeverityBar } from "./severity-bar";

type Column = "key" | "weakness" | "meanMs" | "sampleCount";

const COLUMNS: { key: Column; label: string }[] = [
  { key: "weakness", label: "Weakness" },
  { key: "meanMs", label: "Mean time" },
  { key: "sampleCount", label: "Samples" },
  { key: "key", label: "Name" },
];

/** Tabular view of a Welford-state model. Shared surface for bigram,
 *  trigram and motor-feature rows — only the column header label
 *  changes. Sortable via the shared segmented switch above the table
 *  (pick the active column again to flip direction); the weakness
 *  column carries an inline severity bar so the magnitude reads at a
 *  glance instead of as a bare number. */
export function ModelTable({
  rows,
  emptyHint,
  patternHeader,
  baseline,
  initialLimit = 30,
}: {
  rows: readonly AdaptModelRow[];
  emptyHint: string;
  patternHeader: string;
  baseline: number;
  initialLimit?: number;
}) {
  const [sortBy, setSortBy] = useState<Column>("weakness");
  const [asc, setAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortBy as keyof AdaptModelRow] as number | string;
      const bv = b[sortBy as keyof AdaptModelRow] as number | string;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortBy, asc]);

  const visible = showAll ? sorted : sorted.slice(0, initialLimit);
  const maxWeakness = useMemo(
    () => sorted.reduce((m, r) => Math.max(m, r.weakness), 0),
    [sorted],
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyHint}
      </p>
    );
  }

  const Arrow = asc ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <SegmentedControl
            size="sm"
            value={sortBy}
            ariaLabel="Sort by"
            // Finger-sized segments on phones (§7), compact from sm.
            className="[&>button]:h-10 [&>button]:px-3 sm:[&>button]:h-auto sm:[&>button]:px-2.5"
            onValueChange={(next) => {
              // Picking the active column again flips the direction.
              if (next === sortBy) setAsc(!asc);
              else {
                setSortBy(next);
                setAsc(false);
              }
            }}
            options={COLUMNS.map((c) => ({
              value: c.key,
              label: (
                <span className="inline-flex items-center gap-1">
                  {c.key === "key" ? patternHeader : c.label}
                  {sortBy === c.key ? (
                    <Arrow size={12} aria-label={asc ? "ascending" : "descending"} />
                  ) : null}
                </span>
              ),
            }))}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{sorted.length}</span>{" "}
          tracked
        </span>
      </div>

      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="py-3 pl-5 pr-3 font-medium">{patternHeader}</th>
                <th className="py-3 pr-3 text-right font-medium">Weakness</th>
                <th className="py-3 pr-3 text-right font-medium">Mean time</th>
                <th className="whitespace-nowrap py-3 pr-3 text-right font-medium">Than usual</th>
                <th className="py-3 pr-5 text-right font-medium">Samples</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.key}
                  className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/50"
                >
                  <td className="py-2.5 pl-5 pr-3 font-mono text-foreground">{r.key}</td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center justify-end gap-2">
                      {r.weakness > 0 ? (
                        <SeverityBar
                          value={r.weakness}
                          max={maxWeakness}
                          width="w-12 sm:w-16"
                        />
                      ) : null}
                      <span
                        className={cn(
                          // Wide enough for "123.4", so every bar ends
                          // at the same x whatever the value's width.
                          "min-w-[5ch] text-right",
                          r.weakness > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {r.weakness > 0 ? r.weakness.toFixed(1) : "—"}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-right text-foreground">
                    {r.meanMs.toFixed(0)} ms
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-right text-muted-foreground">
                    <BaselineDelta meanMs={r.meanMs} baseline={baseline} />
                  </td>
                  <td className="py-2.5 pr-5 text-right text-muted-foreground">
                    {r.sampleCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      {sorted.length > initialLimit ? (
        <Button
          variant="outline"
          size="sm"
          className="h-11 self-start sm:h-8"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show fewer" : `Show all ${sorted.length}`}
        </Button>
      ) : null}
    </div>
  );
}

/** How far a mean sits from its category's usual time, taken from the
 *  figures on screen so it adds up with the Mean time cell and the usual
 *  pace tile. Led by an ink arrow and said in words ("81 ms slower"),
 *  since the arrow is hidden from screen readers. "—" without a baseline
 *  yet, and a plain "0 ms" when both print alike. */
function BaselineDelta({ meanMs, baseline }: { meanMs: number; baseline: number }) {
  const d = baselineDeltaMs(meanMs, baseline);
  if (d === null) return <>—</>;
  if (d === 0) return <>0 ms</>;
  return (
    <DeltaText direction={d > 0 ? "up" : "down"}>
      {Math.abs(d)} ms {d > 0 ? "slower" : "faster"}
    </DeltaText>
  );
}
