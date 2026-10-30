"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";
import { ROW_GRID } from "./shared-list";

/** How a row marks the viewer. `best` is the full treatment (tint, left
 *  bar, You pill, orange handle) and goes on one row only: your best on
 *  a per-run board, your row on a per-player board. `other` marks your
 *  remaining runs with just the orange handle, so holding several rows
 *  never turns the table into a wall of orange. */
export type YouMark = "best" | "other";

/** One ranked row, plus the cell helpers rows share. Lives beside the
 *  board in `shared-list.tsx`, which owns the grid template. */
export function LeaderboardRow({
  href,
  rank,
  username,
  name,
  tags,
  you,
  cells,
  headline,
  summary,
  ariaLabel,
}: {
  href: string;
  rank: number;
  /** Raw Clerk username (no `@`), rendered as `@username`. */
  username: string | null;
  /** Fallback display name, already `@`-prefixed by the backend. */
  name: string;
  tags: readonly UserTagId[];
  you?: YouMark;
  /** The three md+ detail cells, matching `BoardColumns.cells`. */
  cells: readonly [ReactNode, ReactNode, ReactNode];
  headline: ReactNode;
  /** One muted line under the name on phones, standing in for the
   *  hidden detail columns. */
  summary: ReactNode;
  ariaLabel: string;
}) {
  const handle = username ? `@${username}` : name;
  const best = you === "best";
  return (
    <li className="relative">
      <Link
        href={href}
        aria-label={ariaLabel}
        className={cn(
          ROW_GRID,
          "min-h-16 py-3 outline-none transition-colors md:min-h-14",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
          best ? "bg-primary/[0.07] hover:bg-primary/[0.11]" : "hover:bg-accent",
        )}
      >
        <RankMark rank={rank} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "min-w-0 max-w-full truncate text-sm sm:text-[15px]",
                you ? "font-semibold text-primary" : "font-medium text-foreground",
              )}
            >
              {handle}
            </span>
            {tags.map((t) => (
              <UserTag key={t} tag={t} size="sm" className="shrink-0" />
            ))}
            {best ? (
              <span className="brand-surface inline-flex h-5 shrink-0 items-center rounded-pill px-2 text-xs font-semibold text-primary-foreground">
                You
              </span>
            ) : null}
          </span>
          <span className="truncate text-xs text-muted-foreground md:hidden">
            {summary}
          </span>
        </span>
        <span className="hidden min-w-0 md:block">{cells[0]}</span>
        <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
          {cells[1]}
        </span>
        <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
          {cells[2]}
        </span>
        <span className="text-right text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
          {headline}
        </span>
      </Link>
      {best ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary"
        />
      ) : null}
    </li>
  );
}

/** Rank number; the podium (1–3) gets a small medallion. Only the
 *  leader's is filled orange; 2nd and 3rd stay neutral so the data
 *  area keeps one spark. Everything else is quiet ink. */
function RankMark({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="text-center text-sm tabular-nums text-muted-foreground">
        {rank}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "mx-auto inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        rank === 1
          ? "brand-surface text-primary-foreground"
          : "bg-muted text-foreground",
      )}
    >
      {rank}
    </span>
  );
}

/** The muted line under a name on phones: separate facts spaced apart,
 *  never joined with a glyph ("98% accuracy", "152 raw", "2d ago"). */
export function RowSummary({ parts }: { parts: readonly ReactNode[] }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
      {parts.map((part, i) => (
        <span key={i} className="min-w-0">
          {part}
        </span>
      ))}
    </span>
  );
}

/** Neutral pill for a categorical cell (mode, tier). */
export function CellPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block h-6 max-w-full truncate rounded-pill bg-muted px-2.5 align-middle text-xs leading-6 font-medium text-muted-foreground">
      {children}
    </span>
  );
}
