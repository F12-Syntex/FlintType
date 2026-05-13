"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProfileTotals, StreakStats } from "./derive-stats";

/** Headline stats grid. Four cells at sm+ (`tests · time · best wpm
 *  · streak`), 2×2 at mobile. No borders, no dividers, no card
 *  surround — just labels stacked over values, separated by `gap`.
 *
 *  An optional "Show more" disclosure reveals the secondary metrics
 *  (tests started, completion rate, mean wpm, mean accuracy) so
 *  density stays low by default and the user can dig in if they
 *  want. The disclosure remembers its state inside the section
 *  only — closes on remount. */
export function ProfileStats({
  totals,
  streak,
  rank,
}: {
  totals: ProfileTotals;
  streak: StreakStats;
  rank: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="mt-12 border-t border-border/60 pt-10 sm:mt-14 sm:pt-12">
      <SectionLabel>Lifetime totals</SectionLabel>

      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 sm:gap-x-8">
        <Cell
          label="Tests"
          value={totals.testsCompleted.toLocaleString()}
          accent
        />
        <Cell label="Time typing" value={formatDuration(totals.totalSeconds)} />
        <Cell
          label="Best WPM"
          value={Math.round(totals.bestWpm).toString()}
          accent
        />
        <Cell
          label="Streak"
          value={streak.current.toString()}
          suffix="d"
          accent={streak.current > 0}
        />
      </div>

      {expanded ? (
        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 sm:gap-x-8">
          <Cell
            label="Tests started"
            value={totals.testsStarted.toLocaleString()}
            subline={
              totals.testsStarted > 0
                ? `${Math.round(totals.completionRate * 100)}% finish`
                : undefined
            }
          />
          <Cell
            label="Mean WPM"
            value={Math.round(totals.meanWpm).toString()}
            subline={
              totals.meanAccuracy > 0
                ? `${totals.meanAccuracy.toFixed(1)}% acc`
                : undefined
            }
          />
          <Cell
            label="Best acc"
            value={
              totals.bestWpm > 0 ? `${totals.bestWpmAccuracy.toFixed(1)}%` : "—"
            }
            subline={totals.bestWpm > 0 ? "on best run" : undefined}
          />
          {rank != null ? (
            <Cell label="Leaderboard" value={`#${rank}`} subline="global" />
          ) : (
            <Cell label="Longest streak" value={`${streak.longest}d`} />
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "mt-6 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
          "transition-colors hover:text-foreground",
        )}
      >
        {expanded ? "Show less ↑" : "Show more ↓"}
      </button>
    </section>
  );
}

function Cell({
  label,
  value,
  suffix,
  subline,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  subline?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tracking-[-0.02em] leading-none tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      {subline ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          {subline}
        </span>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-4 bg-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
