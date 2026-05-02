"use client";

import { useMemo } from "react";
import { Panel, Stat, Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type KeyEvent, usePractice } from "./practice-state";

/** Per-second WPM bucket. We treat 5 *correct* characters as one word
 *  (the standard typing-speed convention) and slot every event into the
 *  second it landed in. Last bucket is whatever fraction of a second is
 *  left over. */
type WpmBucket = { sec: number; wpm: number };

function bucketWpm(events: readonly KeyEvent[]): WpmBucket[] {
  if (events.length === 0) return [];
  const lastT = events[events.length - 1]!.t;
  const seconds = Math.max(1, Math.ceil(lastT / 1000));
  const correctPerSec = new Array<number>(seconds).fill(0);
  for (const e of events) {
    if (!e.correct) continue;
    const i = Math.min(seconds - 1, Math.floor(e.t / 1000));
    correctPerSec[i] = (correctPerSec[i] ?? 0) + 1;
  }
  return correctPerSec.map((c, i) => ({ sec: i + 1, wpm: (c / 5) * 60 }));
}

function peakWpm(buckets: readonly WpmBucket[]): number {
  return buckets.reduce((m, b) => (b.wpm > m ? b.wpm : m), 0);
}

function consistency(buckets: readonly WpmBucket[]): number {
  if (buckets.length < 2) return 100;
  const avg = buckets.reduce((s, b) => s + b.wpm, 0) / buckets.length;
  if (avg === 0) return 0;
  const variance =
    buckets.reduce((s, b) => s + (b.wpm - avg) ** 2, 0) / buckets.length;
  const stdDev = Math.sqrt(variance);
  // Coefficient-of-variation → 0-100 consistency score (clamped).
  const cv = stdDev / avg;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
}

type CharStat = { char: string; total: number; wrong: number; rate: number };

function analyseChars(events: readonly KeyEvent[]): CharStat[] {
  const counts = new Map<string, { total: number; wrong: number }>();
  for (const e of events) {
    if (!e.expected) continue;
    const c = e.expected.toLowerCase();
    const cur = counts.get(c) ?? { total: 0, wrong: 0 };
    cur.total += 1;
    if (!e.correct) cur.wrong += 1;
    counts.set(c, cur);
  }
  return [...counts.entries()]
    .map(([char, v]) => ({
      char,
      total: v.total,
      wrong: v.wrong,
      rate: v.total > 0 ? v.wrong / v.total : 0,
    }))
    .filter((s) => s.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.rate - a.rate)
    .slice(0, 8);
}

type PairStat = { pair: string; samples: number; avgMs: number };

function analysePairs(events: readonly KeyEvent[]): PairStat[] {
  const buckets = new Map<string, { samples: number; total: number }>();
  for (let i = 1; i < events.length; i += 1) {
    const prev = events[i - 1]!;
    const cur = events[i]!;
    if (!prev.correct || !cur.correct) continue;
    if (!prev.expected || !cur.expected) continue;
    const dt = cur.t - prev.t;
    if (dt <= 0 || dt > 2000) continue; // ignore outliers
    const key = `${prev.expected.toLowerCase()}${cur.expected.toLowerCase()}`;
    const b = buckets.get(key) ?? { samples: 0, total: 0 };
    b.samples += 1;
    b.total += dt;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .filter(([, b]) => b.samples >= 2)
    .map(([pair, b]) => ({ pair, samples: b.samples, avgMs: b.total / b.samples }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 8);
}

function WpmTraceChart({ buckets }: { buckets: readonly WpmBucket[] }) {
  if (buckets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">no data — run too short.</p>
    );
  }
  const w = 600;
  const h = 160;
  const pad = 12;
  const peak = Math.max(1, peakWpm(buckets));
  const xStep = buckets.length === 1 ? 0 : (w - 2 * pad) / (buckets.length - 1);
  const points = buckets
    .map((b, i) => {
      const x = pad + xStep * i;
      const y = h - pad - (b.wpm / peak) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const ticks = [0, peak / 2, peak].map((v) => Math.round(v));
  return (
    <svg
      role="img"
      aria-label="WPM over time"
      viewBox={`0 0 ${w} ${h}`}
      className="h-40 w-full"
      preserveAspectRatio="none"
    >
      {ticks.map((t, i) => {
        const y = h - pad - (t / peak) * (h - 2 * pad);
        return (
          <g key={i}>
            <line
              x1={pad}
              x2={w - pad}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text
              x={pad}
              y={y - 2}
              fontSize={9}
              fill="currentColor"
              opacity={0.5}
            >
              {t}
            </text>
          </g>
        );
      })}
      <polyline
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function WeakChars({ stats }: { stats: readonly CharStat[] }) {
  if (stats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Clean run — no character mistakes recorded.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {stats.map((s) => (
        <li
          key={s.char}
          className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5 last:border-b-0 last:pb-0"
        >
          <span className="flex items-baseline gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card font-mono text-base font-semibold">
              {s.char === " " ? "␣" : s.char}
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {s.wrong} miss · {s.total} total
            </span>
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              s.rate >= 0.2 ? "text-primary" : "text-foreground",
            )}
          >
            {Math.round(s.rate * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function SlowPairs({ pairs }: { pairs: readonly PairStat[] }) {
  if (pairs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Need a longer run to spot slow letter pairs.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {pairs.map((p) => (
        <li
          key={p.pair}
          className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5 last:border-b-0 last:pb-0"
        >
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-base font-semibold">
              {p.pair.split("").map((c, i) => (
                <span key={i} className="px-0.5">
                  {c === " " ? "␣" : c}
                </span>
              ))}
            </span>
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {p.samples}×
            </span>
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {Math.round(p.avgMs)} ms
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TestSummary() {
  const { state, restart, wpm, accuracy, elapsedMs } = usePractice();
  const buckets = useMemo(() => bucketWpm(state.events), [state.events]);
  const peak = Math.round(peakWpm(buckets));
  const cons = consistency(buckets);
  const weakChars = useMemo(() => analyseChars(state.events), [state.events]);
  const slowPairs = useMemo(() => analysePairs(state.events), [state.events]);
  const wrongTotal = state.events.filter((e) => !e.correct).length;
  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));

  return (
    <div className="flex flex-col gap-6 px-1 py-2">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-1.5 bg-primary" />
          <Tag>complete</Tag>
        </div>
        <Button variant="outline" size="sm" onClick={() => restart()}>
          New run · Tab
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="WPM" value={String(wpm)} size="lg" accent bordered />
        <Stat
          label="ACC"
          value={`${Math.round(accuracy * 10) / 10}%`}
          size="lg"
          bordered
        />
        <Stat label="PEAK" value={String(peak)} size="lg" bordered />
        <Stat label="ERRORS" value={String(wrongTotal)} size="lg" bordered />
        <Stat
          label="CONSISTENCY"
          value={String(cons)}
          suffix="/100"
          size="lg"
          bordered
        />
        <Stat label="TIME" value={`${elapsedSec}s`} size="lg" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <Panel title="WPM TRACE" subtitle={`peak ${peak} · ${buckets.length}s`}>
          <WpmTraceChart buckets={buckets} />
        </Panel>
        <Panel title="WEAK KEYS" subtitle="ranked by misses">
          <WeakChars stats={weakChars} />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-5">
        <Panel title="SLOW PAIRS" subtitle="avg ms between two correct keys">
          <SlowPairs pairs={slowPairs} />
        </Panel>
      </section>
    </div>
  );
}
