"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdaptModelRow } from "@/types/adapt";
import { SeverityBar } from "./severity-bar";

type Column = "key" | "weakness" | "meanMs" | "sampleCount";

const COLUMNS: { key: Column; label: string }[] = [
  { key: "weakness", label: "WEAKNESS" },
  { key: "meanMs", label: "MEAN MS" },
  { key: "sampleCount", label: "SAMPLES" },
  { key: "key", label: "PATTERN" },
];

/** Tabular view of a Welford-state model. Shared surface for bigram,
 *  trigram and motor-feature rows — only the column header label
 *  changes. Sortable via a segmented pill row above the table; the
 *  WEAKNESS column carries an inline severity bar so the magnitude
 *  reads at a glance instead of as a bare number. */
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
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Sort
          </span>
          {COLUMNS.map((c) => {
            const active = sortBy === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  if (active) setAsc(!asc);
                  else {
                    setSortBy(c.key);
                    setAsc(false);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1",
                  "font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]",
                  "transition-[color,background-color,border-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  active
                    ? "border-primary/40 bg-primary/[0.06] text-primary"
                    : "border-foreground/10 text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {c.key === "key" ? patternHeader : c.label}
                {active ? (
                  <span aria-hidden className="text-[9px]">
                    {asc ? "↑" : "↓"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="text-foreground tabular-nums">{sorted.length}</span>{" "}
          rows
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-foreground/10">
        <table className="w-full font-mono text-xs tabular-nums">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/[0.02] text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <th className="py-3 pr-3 pl-4">{patternHeader}</th>
              <th className="py-3 pr-3 text-right">WEAKNESS</th>
              <th className="py-3 pr-3 text-right">MEAN MS</th>
              <th className="py-3 pr-4 text-right">SAMPLES</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.key}
                className="border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-foreground/[0.02]"
              >
                <td className="py-2.5 pr-3 pl-4 text-foreground">{r.key}</td>
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
                        "min-w-[2.5ch] text-right",
                        r.weakness > 0 ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {r.weakness > 0 ? r.weakness.toFixed(1) : "—"}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-foreground">
                  {r.meanMs.toFixed(0)}
                  <span className="ml-1 text-muted-foreground">
                    {baselineDelta(r.meanMs, baseline)}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right text-muted-foreground">
                  {r.sampleCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > initialLimit ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start rounded-md border border-foreground/10 px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-[color,border-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/40 hover:text-primary"
        >
          {showAll
            ? `COLLAPSE · showing ${sorted.length}`
            : `SHOW ALL · ${sorted.length}`}
        </button>
      ) : null}
    </div>
  );
}

function baselineDelta(value: number, baseline: number): string {
  if (baseline <= 0) return "";
  const pct = ((value - baseline) / baseline) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `(${sign}${pct.toFixed(0)}%)`;
}
