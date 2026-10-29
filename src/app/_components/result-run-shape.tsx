"use client";

import { useMemo } from "react";
import { secShort } from "@/lib/format-figure";
import { InsightCard } from "./insight-card";
import type { KeyEvent } from "./practice-state";

/* ─── Run details (streak / words / longest pause) ──────────────── */

type RunDetails = {
  longestStreak: number;
  wordsCorrect: number;
  longestPauseMs: number;
};

function runDetails(
  events: readonly KeyEvent[],
  words: readonly string[],
  typed: readonly string[],
  committed: number,
): RunDetails {
  let longest = 0;
  let streak = 0;
  let longestPause = 0;
  events.forEach((e, i) => {
    streak = e.correct ? streak + 1 : 0;
    if (streak > longest) longest = streak;
    // Gaps between keys only: the wait before the first key isn't a pause.
    if (i > 0) longestPause = Math.max(longestPause, e.t - events[i - 1]!.t);
  });
  let wordsCorrect = 0;
  for (let i = 0; i < committed; i++) if (typed[i] === words[i]) wordsCorrect += 1;
  return { longestStreak: longest, wordsCorrect, longestPauseMs: longestPause };
}

/** "Run details" (spec-50 §7.1): the longest run of correct keys, how
 *  many of the finished words were typed correctly, and the longest gap
 *  between two keys. `committed` is how many words were finished (a
 *  timed test ends partway through one). */
export function ExtraStats({
  events,
  words,
  typed,
  committed,
}: {
  events: readonly KeyEvent[];
  words: readonly string[];
  typed: readonly string[];
  committed: number;
}) {
  const stats = useMemo(
    () => runDetails(events, words, typed, committed),
    [events, words, typed, committed],
  );
  if (events.length < 4) return null;
  return (
    <InsightCard label="Run details">
      <div className="grid grid-cols-3 gap-x-4">
        <Cell
          label="Longest clean streak"
          value={`${stats.longestStreak}`}
          suffix={stats.longestStreak === 1 ? " key" : " keys"}
        />
        <Cell label="Words typed correctly" value={`${stats.wordsCorrect} of ${committed}`} />
        <Cell label="Longest pause" value={secShort(stats.longestPauseMs)} />
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
    // justify-between keeps the figures on one line when a label wraps.
    <div className="flex min-w-0 flex-col justify-between gap-1.5">
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
