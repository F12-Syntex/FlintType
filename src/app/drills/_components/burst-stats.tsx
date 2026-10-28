"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AttemptOutcome } from "./burst-reducer";

/** The burst runner's readouts: a row of stat cards above the word, the
 *  streak pips and the status line under it. Static: no looping motion
 *  (ui-law §13.1); outcome colour carries the feedback. */

/** Centred row of stat cards. */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-stretch justify-center gap-2 sm:gap-3">
      {children}
    </div>
  );
}

export function StatCard({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="flex min-w-17 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-center shadow-card sm:min-w-20 sm:py-2.5">
      <span
        className="font-mono text-[13px] leading-none font-bold text-foreground tabular-nums sm:text-[15px]"
        style={{ fontFamily: "var(--ft-font-family, inherit)" }}
      >
        {value}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
        {caption}
      </span>
    </div>
  );
}

/** One pip per rep the current item needs; filled pips are the streak. */
export function StreakPips({
  total,
  done,
  failed,
}: {
  total: number;
  done: number;
  failed: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Streak"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "h-1.5 w-7 rounded-full transition-colors",
            i < done
              ? failed
                ? "bg-destructive/70"
                : "bg-primary"
              : "bg-foreground/15",
          )}
        />
      ))}
    </div>
  );
}

const OUTCOME_LABEL: Record<AttemptOutcome, string> = {
  win: "Hit",
  slow: "Too slow",
  wrong: "Miss",
};

/** "Hit / Too slow / Miss" right after a commit, "Space to commit" once
 *  the item is typed, otherwise `idleLabel`. The second line keeps the
 *  last burst's speed, reserved so the layout doesn't jump. */
export function StatusBlock({
  ready,
  outcome,
  lastWpm,
  thresholdWpm,
  idleLabel,
}: {
  ready: boolean;
  outcome: AttemptOutcome | null;
  lastWpm: number | null;
  thresholdWpm: number;
  idleLabel: string;
}) {
  const label = outcome
    ? OUTCOME_LABEL[outcome]
    : ready
      ? "Space to commit"
      : idleLabel;
  return (
    <div className="flex flex-col items-center gap-1.5" aria-live="polite">
      <span
        className={cn(
          "font-mono text-base font-bold tracking-tight sm:text-lg",
          outcome === "win" || (ready && !outcome)
            ? "text-primary"
            : outcome === "wrong"
              ? "text-destructive"
              : outcome === "slow"
                ? "text-muted-foreground"
                : "text-foreground",
        )}
        style={{ fontFamily: "var(--ft-font-family, inherit)" }}
      >
        {label}
      </span>
      <span className="h-4 text-xs text-muted-foreground tabular-nums">
        {lastWpm != null ? (
          <>
            Last burst{" "}
            <span
              className={cn(
                "font-semibold",
                lastWpm >= thresholdWpm ? "text-primary" : "text-foreground",
              )}
            >
              {lastWpm} wpm
            </span>
          </>
        ) : (
          <span aria-hidden>&nbsp;</span>
        )}
      </span>
    </div>
  );
}
