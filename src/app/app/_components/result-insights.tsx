"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { KeyEvent } from "./practice-state";

/** Extra result-screen visualisations — opt-in via appearance prefs.
 *  Every component derives its data from the run's keystroke stream
 *  + per-second wpm samples that the practice context already
 *  provides; nothing reaches outside the run. */

/* ─── Per-letter slowness ───────────────────────────────────────── */

type LetterStat = {
  ch: string;
  avgMs: number;
  samples: number;
};

function perLetter(events: readonly KeyEvent[]): LetterStat[] {
  const acc = new Map<string, { total: number; samples: number }>();
  let prevT = 0;
  let first = true;
  for (const e of events) {
    if (!e.correct || !e.expected) {
      prevT = e.t;
      first = false;
      continue;
    }
    if (first) {
      prevT = e.t;
      first = false;
      continue;
    }
    const dt = e.t - prevT;
    prevT = e.t;
    if (dt <= 0 || dt > 2000) continue;
    const key = e.expected.toLowerCase();
    const b = acc.get(key) ?? { total: 0, samples: 0 };
    b.total += dt;
    b.samples += 1;
    acc.set(key, b);
  }
  return [...acc.entries()]
    .filter(([, b]) => b.samples >= 2)
    .map(([ch, b]) => ({
      ch,
      avgMs: b.total / b.samples,
      samples: b.samples,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 8);
}

export function PerLetterSlowness({ events }: { events: readonly KeyEvent[] }) {
  const rows = useMemo(() => perLetter(events), [events]);
  if (rows.length < 2) return null;
  const max = Math.max(...rows.map((r) => r.avgMs));
  return (
    <Section
      label="slowest letters"
      meta={`top ${rows.length} · avg ms per keystroke`}
    >
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-6">
        {rows.map((r) => (
          <li
            key={r.ch}
            className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 font-mono text-xs tabular-nums"
          >
            <span className="font-semibold text-foreground">
              {r.ch === " " ? "␣" : r.ch}
            </span>
            <span
              aria-hidden
              className="relative h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]"
            >
              <span
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-primary"
                style={{
                  transform: `scaleX(${Math.max(0.04, r.avgMs / max)})`,
                  width: "100%",
                }}
              />
            </span>
            <span className="text-muted-foreground">
              {Math.round(r.avgMs)}
              <span className="ml-0.5 text-[10px] uppercase tracking-[0.14em] opacity-70">
                ms
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ─── Hand balance ─────────────────────────────────────────────── */

const LEFT_HAND = new Set([
  "q","w","e","r","t","a","s","d","f","g","z","x","c","v","b",
]);
const RIGHT_HAND = new Set([
  "y","u","i","o","p","h","j","k","l","n","m",
]);

type HandStats = { left: number; right: number; other: number; total: number };

function handBalance(events: readonly KeyEvent[]): HandStats {
  const out = { left: 0, right: 0, other: 0, total: 0 };
  for (const e of events) {
    if (!e.expected) continue;
    const c = e.expected.toLowerCase();
    out.total += 1;
    if (LEFT_HAND.has(c)) out.left += 1;
    else if (RIGHT_HAND.has(c)) out.right += 1;
    else out.other += 1;
  }
  return out;
}

export function HandBalance({ events }: { events: readonly KeyEvent[] }) {
  const stats = useMemo(() => handBalance(events), [events]);
  if (stats.total < 4) return null;
  const leftPct = Math.round((stats.left / stats.total) * 100);
  const rightPct = Math.round((stats.right / stats.total) * 100);
  const otherPct = Math.max(0, 100 - leftPct - rightPct);
  return (
    <Section
      label="hand balance"
      meta={`${stats.total} keystrokes`}
    >
      <div className="flex flex-col gap-2.5">
        <div
          aria-hidden
          className="flex h-2 w-full overflow-hidden rounded-full bg-foreground/[0.05]"
        >
          <span
            className="bg-primary"
            style={{ width: `${leftPct}%` }}
          />
          <span
            className="bg-primary/55"
            style={{ width: `${rightPct}%` }}
          />
          <span
            className="bg-foreground/15"
            style={{ width: `${otherPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs tabular-nums">
          <Legend dot="bg-primary" label="left" pct={leftPct} count={stats.left} />
          <Legend dot="bg-primary/55" label="right" pct={rightPct} count={stats.right} />
          {stats.other > 0 ? (
            <Legend
              dot="bg-foreground/15"
              label="other"
              pct={otherPct}
              count={stats.other}
            />
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function Legend({
  dot,
  label,
  pct,
  count,
}: {
  dot: string;
  label: string;
  pct: number;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block size-2 rounded-sm", dot)} />
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground">
        {pct}% · {count}
      </span>
    </span>
  );
}

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
}: {
  events: readonly KeyEvent[];
  totalWords: number;
}) {
  const stats = useMemo(
    () => extraStats(events, totalWords, 800),
    [events, totalWords],
  );
  if (events.length < 4) return null;
  return (
    <Section label="run shape" meta="">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-6">
        <Cell
          label="longest streak"
          value={`${stats.longestStreak}`}
          suffix=" chars"
          accent
        />
        <Cell
          label="words finished"
          value={`${stats.wordsFinished}/${totalWords}`}
        />
        <Cell label="pauses" value={`${stats.pauseCount}`} suffix=" >0.8s" />
        <Cell
          label="longest pause"
          value={
            stats.longestPauseMs > 0
              ? (stats.longestPauseMs / 1000).toFixed(1)
              : "0"
          }
          suffix="s"
        />
      </div>
    </Section>
  );
}

function Cell({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 leading-none">
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xl font-semibold tabular-nums sm:text-2xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="text-xs font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/* ─── Section shell ────────────────────────────────────────────── */

function Section({
  label,
  meta,
  children,
}: {
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{label}</span>
        {meta ? (
          <span className="text-muted-foreground/70">{meta}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
