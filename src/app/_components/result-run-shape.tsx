"use client";

import { useMemo } from "react";
import { InsightCard } from "./insight-card";
import type { KeyEvent } from "./practice-state";

/* ─── Extra stats (streak / pauses / words) ─────────────────────── */

type ExtraStatsResult = {
  longestStreak: number;
  pauseCount: number;
  longestPauseMs: number;
  wordsFinished: number;
};

function extraStats(
  events: readonly KeyEvent[],
  totalWords: number,
  pauseThresholdMs: number,
): ExtraStatsResult {
  let longest = 0;
  let cur = 0;
  let prevT = 0;
  let pauseCount = 0;
  let longestPause = 0;
  let lastWord = -1;
  let wordsFinished = 0;
  for (const e of events) {
    if (e.correct) {
      cur += 1;
      if (cur > longest) longest = cur;
      if (e.wordIndex !== lastWord) {
        if (lastWord !== -1) wordsFinished += 1;
        lastWord = e.wordIndex;
      }
    } else {
      cur = 0;
    }
    if (prevT > 0) {
      const gap = e.t - prevT;
      if (gap > pauseThresholdMs) {
        pauseCount += 1;
        if (gap > longestPause) longestPause = gap;
      }
    }
    prevT = e.t;
  }
  if (events.length > 0 && lastWord !== -1) wordsFinished += 1;
  return {
    longestStreak: longest,
    pauseCount,
    longestPauseMs: longestPause,
    wordsFinished: Math.min(totalWords, wordsFinished),
  };
}

export function ExtraStats({
  events,
  totalWords,
  slowest,
  unitLabel,
}: {
  events: readonly KeyEvent[];
  totalWords: number;
  /** Lowest per-second speed in the run (the old "stall" number). */
  slowest: number;
  /** Speed unit caption for `slowest` (wpm, cpm, …). */
  unitLabel: string;
}) {
  const stats = useMemo(
    () => extraStats(events, totalWords, 800),
    [events, totalWords],
  );
  if (events.length < 4) return null;
  return (
    <InsightCard label="Run shape">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5 sm:gap-x-6">
        <Cell label="Slowest" value={`${slowest}`} suffix={` ${unitLabel}`} />
        <Cell
          label="Longest streak"
          value={`${stats.longestStreak}`}
          suffix=" chars"
        />
        <Cell
          label="Words finished"
          value={`${stats.wordsFinished}/${totalWords}`}
        />
        <Cell label="Pauses" value={`${stats.pauseCount}`} suffix=" over 0.8s" />
        <Cell
          label="Longest pause"
          value={
            stats.longestPauseMs > 0
              ? (stats.longestPauseMs / 1000).toFixed(1)
              : "0"
          }
          suffix="s"
        />
      </div>
    </InsightCard>
  );
}

function Cell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-2xl">
        {value}
        {suffix ? (
          <span className="text-xs font-normal tracking-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
  );
}
