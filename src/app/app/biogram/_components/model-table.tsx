"use client";

import { useMemo, useState } from "react";
import type { AdaptModelRow } from "@/types/adapt";
import { cn } from "@/lib/utils";

type Column = "key" | "weakness" | "meanMs" | "sampleCount";

const HEADERS: Record<Column, string> = {
  key: "PATTERN",
  weakness: "WEAKNESS",
  meanMs: "MEAN MS",
  sampleCount: "SAMPLES",
};

/** Tabular view of a Welford-state model. Same surface for bigram,
 *  trigram and motor-feature rows — only the column header label
 *  changes. Sortable by clicking a column; defaults to weakness desc
 *  (the algorithm's selection priority). */
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

  if (rows.length === 0) {
    return (
      <p className="px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-ft-dim sm:px-14">
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs tabular-nums">
        <thead>
          <tr className="border-b border-ft-line-soft text-left text-[10px] font-medium uppercase tracking-[0.14em] text-ft-dim">
            <Th
              col="key"
              label={patternHeader}
              active={sortBy}
              asc={asc}
              onClick={(c) => toggle(c, sortBy, asc, setSortBy, setAsc)}
            />
            <Th
              col="weakness"
              label={HEADERS.weakness}
              active={sortBy}
              asc={asc}
              onClick={(c) => toggle(c, sortBy, asc, setSortBy, setAsc)}
              align="right"
            />
            <Th
              col="meanMs"
              label={HEADERS.meanMs}
              active={sortBy}
              asc={asc}
              onClick={(c) => toggle(c, sortBy, asc, setSortBy, setAsc)}
              align="right"
            />
            <Th
              col="sampleCount"
              label={HEADERS.sampleCount}
              active={sortBy}
              asc={asc}
              onClick={(c) => toggle(c, sortBy, asc, setSortBy, setAsc)}
              align="right"
            />
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr
              key={r.key}
              className="border-b border-ft-line-soft/60 last:border-b-0"
            >
              <td className="py-2 pr-3 text-ft-ink">{r.key}</td>
              <td
                className={cn(
                  "py-2 pr-3 text-right",
                  r.weakness > 0 ? "text-ft-ember" : "text-ft-dim",
                )}
              >
                {r.weakness > 0 ? r.weakness.toFixed(1) : "—"}
              </td>
              <td className="py-2 pr-3 text-right text-ft-ink">
                {r.meanMs.toFixed(0)}
                <span className="ml-1 text-ft-dim">
                  {baselineDelta(r.meanMs, baseline)}
                </span>
              </td>
              <td className="py-2 pr-3 text-right text-ft-dim-2">
                {r.sampleCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > initialLimit && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-[11px] uppercase tracking-[0.14em] text-ft-dim transition-colors hover:text-ft-ember"
        >
          {showAll
            ? `COLLAPSE (showing ${sorted.length})`
            : `SHOW ALL (${sorted.length})`}
        </button>
      )}
    </div>
  );
}

function Th({
  col,
  label,
  active,
  asc,
  onClick,
  align = "left",
}: {
  col: Column;
  label: string;
  active: Column;
  asc: boolean;
  onClick: (col: Column) => void;
  align?: "left" | "right";
}) {
  const isActive = active === col;
  return (
    <th
      className={cn(
        "py-2 pr-3 font-medium",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          "transition-colors",
          isActive ? "text-ft-ember" : "text-ft-dim hover:text-ft-ink",
        )}
      >
        {label}
        {isActive ? (asc ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

function toggle(
  next: Column,
  active: Column,
  asc: boolean,
  setSortBy: (c: Column) => void,
  setAsc: (a: boolean) => void,
) {
  if (active === next) {
    setAsc(!asc);
  } else {
    setSortBy(next);
    setAsc(false);
  }
}

function baselineDelta(value: number, baseline: number): string {
  if (baseline <= 0) return "";
  const pct = ((value - baseline) / baseline) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `(${sign}${pct.toFixed(0)}%)`;
}
