"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Stat, Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/line-chart";
import { cn } from "@/lib/utils";
import { type KeyEvent, usePractice } from "./practice-state";

/** Theme-aware replacement for the fixed-paper `<SummarySection>` so the summary
 *  follows the active palette + light/dark mode instead of locking to the
 *  default ink-on-paper surface. Same shape, theme-aware classes. */
function SummarySection({
  title,
  subtitle,
  children,
  className,
  contentClassName,
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-md border border-border bg-card text-foreground",
        compact ? "gap-2 p-3" : "gap-3 p-4 sm:p-5",
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="flex items-baseline justify-between gap-3">
          {title ? <Tag tone="ink">{title}</Tag> : <span />}
          {subtitle ? <Tag>{subtitle}</Tag> : null}
        </div>
      )}
      <div className={cn("flex-1", contentClassName)}>{children}</div>
    </section>
  );
}

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

const wpmChartConfig = {
  wpm: { label: "WPM", color: "var(--primary)" },
} satisfies ChartConfig;

function WpmTraceChart({ buckets }: { buckets: readonly WpmBucket[] }) {
  if (buckets.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        need a longer run for a chart.
      </p>
    );
  }
  return (
    <ChartContainer config={wpmChartConfig} className="aspect-auto h-44 w-full">
      <LineChart
        accessibilityLayer
        data={buckets as WpmBucket[]}
        margin={{ left: 8, right: 12, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
        <XAxis
          dataKey="sec"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tickFormatter={(v: number) => `${v}s`}
        />
        <YAxis
          dataKey="wpm"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          width={28}
        />
        <ChartTooltip
          cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, items) => {
                const first = (items as Array<{ payload?: WpmBucket }>)[0];
                return `${first?.payload?.sec ?? 0}s`;
              }}
            />
          }
        />
        <Line
          dataKey="wpm"
          type="monotone"
          stroke="var(--color-wpm)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, stroke: "var(--color-wpm)", fill: "var(--background)" }}
        />
      </LineChart>
    </ChartContainer>
  );
}

/** Render the run's source passage with each character coloured by its
 *  *speed* — how many ms passed between landing on the previous correct
 *  key and this one. Fast = foreground (white/black per theme), slow =
 *  primary (full). Average lands near the midway blend.
 *
 *  Latencies span the 10th → 90th percentile of the run so a single
 *  outlier (a yawn, an interruption) doesn't crush the colour scale. */
function PassageHeatmap({
  words,
  events,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
}) {
  // Walk events, advance a virtual (word, char) cursor on correct keys,
  // and record the per-position latency.
  const latencyByPos = useMemo(() => {
    const map = new Map<string, number>();
    let w = 0;
    let c = 0;
    let prevT = 0;
    for (const e of events) {
      if (!e.correct) continue;
      const word = words[w];
      if (!word) break;
      const dt = Math.max(0, e.t - prevT);
      map.set(`${w}:${c}`, dt);
      prevT = e.t;
      c += 1;
      if (c >= word.length) {
        w += 1;
        c = 0;
      }
    }
    return map;
  }, [events, words]);

  // 10th / 90th percentile bounds for the colour scale.
  const [lo, hi] = useMemo(() => {
    const sorted = [...latencyByPos.values()].sort((a, b) => a - b);
    if (sorted.length < 4) return [0, 1] as const;
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
    return [p10, Math.max(p90, p10 + 1)] as const;
  }, [latencyByPos]);

  if (words.length === 0) {
    return <p className="text-sm text-muted-foreground">no passage to map.</p>;
  }

  return (
    <div className="font-mono text-sm leading-[1.7] tracking-[0.04em] [word-spacing:0.25em]">
      {words.map((word, wi) => (
        <span key={wi}>
          {[...word].map((ch, ci) => {
            const lat = latencyByPos.get(`${wi}:${ci}`);
            if (lat == null) {
              return (
                <span key={ci} className="text-muted-foreground">
                  {ch}
                </span>
              );
            }
            const span = hi - lo;
            const intensity =
              span > 0 ? Math.max(0, Math.min(1, (lat - lo) / span)) : 0;
            const pct = Math.round(intensity * 100);
            return (
              <span
                key={ci}
                style={{
                  color: `color-mix(in oklch, var(--primary) ${pct}%, var(--foreground))`,
                }}
                title={`${Math.round(lat)} ms`}
              >
                {ch}
              </span>
            );
          })}
          {wi < words.length - 1 ? (
            <span className="text-muted-foreground">{" "}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/** Visualises the slow letter pairs as letter chips connected by an
 *  arrow. Stronger primary tint + thicker arrow = slower transition. */
function PairFlow({ pairs }: { pairs: readonly PairStat[] }) {
  if (pairs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Need a longer run to surface slow pairs.
      </p>
    );
  }
  const maxMs = Math.max(0, ...pairs.map((p) => p.avgMs));
  return (
    <ul className="flex flex-wrap gap-3">
      {pairs.map((p) => {
        const intensity = maxMs > 0 ? p.avgMs / maxMs : 0;
        const stroke = 1 + intensity * 2.4;
        const a = p.pair[0] ?? "";
        const b = p.pair[1] ?? "";
        return (
          <li
            key={p.pair}
            className="flex items-center gap-1 rounded-md border border-border/60 bg-card px-2 py-1"
          >
            <Glyph char={a} intensity={intensity} />
            <svg
              width={26}
              height={14}
              aria-hidden
              className="text-primary"
              style={{ opacity: 0.4 + intensity * 0.6 }}
            >
              <line
                x1={2}
                y1={7}
                x2={18}
                y2={7}
                stroke="currentColor"
                strokeWidth={stroke}
                strokeLinecap="round"
              />
              <polygon
                points="18,2 26,7 18,12"
                fill="currentColor"
              />
            </svg>
            <Glyph char={b} intensity={intensity} />
            <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
              {Math.round(p.avgMs)}ms · {p.samples}×
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Glyph({ char, intensity }: { char: string; intensity: number }) {
  const bgPct = Math.round(intensity * 35);
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border font-mono text-sm font-semibold"
      style={{
        backgroundColor: `color-mix(in oklch, var(--primary) ${bgPct}%, transparent)`,
        borderColor: `color-mix(in oklch, var(--primary) ${Math.round(40 + intensity * 60)}%, var(--border))`,
        color: intensity > 0.5 ? "var(--primary)" : "var(--foreground)",
      }}
    >
      {char === " " ? "␣" : char}
    </span>
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

  // Top weak / slow lists are tighter so the whole summary fits without
  // scrolling on standard laptop heights (~720 px content area).
  const topWeak = weakChars.slice(0, 5);
  const topPairs = slowPairs.slice(0, 6);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-1 py-1">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-1.5 bg-primary" />
          <Tag>complete</Tag>
        </div>
        <Button variant="outline" size="sm" onClick={() => restart()}>
          New run · Tab
        </Button>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat label="WPM" value={String(wpm)} size="md" accent bordered />
        <Stat
          label="ACC"
          value={`${Math.round(accuracy * 10) / 10}%`}
          size="md"
          bordered
        />
        <Stat label="PEAK" value={String(peak)} size="md" bordered />
        <Stat label="ERRORS" value={String(wrongTotal)} size="md" bordered />
        <Stat
          label="CONS."
          value={String(cons)}
          suffix="/100"
          size="md"
          bordered
        />
        <Stat label="TIME" value={`${elapsedSec}s`} size="md" />
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[3fr_2fr]">
        <SummarySection
          title="PASSAGE HEATMAP"
          subtitle="redder = slower · gray = unseen / space"
          className="min-h-0 overflow-hidden"
          contentClassName="min-h-0 overflow-y-auto pr-1"
        >
          <PassageHeatmap words={state.words} events={state.events} />
        </SummarySection>
        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
          <SummarySection
            title="WPM TRACE"
            subtitle={`peak ${peak} · ${buckets.length}s`}
            className="min-h-0"
          >
            <WpmTraceChart buckets={buckets} />
          </SummarySection>
          <SummarySection
            title="PAIR FLOW"
            subtitle="from → to · arrow weight = delay"
            className="min-h-0 overflow-hidden"
            contentClassName="min-h-0 overflow-y-auto pr-1"
          >
            <PairFlow pairs={topPairs} />
          </SummarySection>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SummarySection title="WEAK KEYS" subtitle="top 5 by misses" compact>
          <WeakChars stats={topWeak} />
        </SummarySection>
        <SummarySection title="SLOW PAIRS" subtitle="top 6 by avg latency" compact>
          <SlowPairs pairs={topPairs} />
        </SummarySection>
      </section>
    </div>
  );
}
