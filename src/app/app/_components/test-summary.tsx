"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/line-chart";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import { cn } from "@/lib/utils";
import { type KeyEvent, usePractice } from "./practice-state";

// ─── Stats ─────────────────────────────────────────────────────────

type Bucket = { sec: number; wpm: number; raw: number };

function peakWpm(buckets: readonly Bucket[]): number {
  return buckets.reduce((m, b) => (b.wpm > m ? b.wpm : m), 0);
}

function consistencyScore(buckets: readonly Bucket[]): number {
  if (buckets.length < 2) return 100;
  const avg = buckets.reduce((s, b) => s + b.wpm, 0) / buckets.length;
  if (avg === 0) return 0;
  const variance =
    buckets.reduce((s, b) => s + (b.wpm - avg) ** 2, 0) / buckets.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avg;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
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
    if (dt <= 0 || dt > 2000) continue;
    const key = `${prev.expected.toLowerCase()}${cur.expected.toLowerCase()}`;
    const b = buckets.get(key) ?? { samples: 0, total: 0 };
    b.samples += 1;
    b.total += dt;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .filter(([, b]) => b.samples >= 2)
    .map(([pair, b]) => ({
      pair,
      samples: b.samples,
      avgMs: b.total / b.samples,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 6);
}

// ─── Pieces ────────────────────────────────────────────────────────

function BigStat({
  label,
  value,
  suffix,
  accent = false,
}: {
  label: string;
  value: string | number;
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
          "text-2xl font-semibold tabular-nums sm:text-3xl lg:text-4xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="text-base font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
  );
}

const chartConfig = {
  wpm: { label: "wpm", color: "var(--primary)" },
  raw: { label: "raw", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function WpmChart({
  buckets,
  startAtZero,
}: {
  buckets: readonly Bucket[];
  startAtZero: boolean;
}) {
  if (buckets.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        run too short for a chart.
      </p>
    );
  }
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-32 w-full sm:h-44 lg:h-52"
    >
      <LineChart
        accessibilityLayer
        data={buckets as Bucket[]}
        margin={{ left: 8, right: 16, top: 12, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="currentColor"
          strokeOpacity={0.08}
        />
        <XAxis
          dataKey="sec"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tickFormatter={(v: number) => `${v}`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          width={28}
          domain={startAtZero ? [0, "auto"] : ["auto", "auto"]}
        />
        <ChartTooltip
          cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, items) => {
                const first = (items as Array<{ payload?: Bucket }>)[0];
                return `${first?.payload?.sec ?? 0}s`;
              }}
            />
          }
        />
        <Line
          dataKey="raw"
          type="monotone"
          stroke="var(--color-raw)"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          dot={false}
        />
        <Line
          dataKey="wpm"
          type="monotone"
          stroke="var(--color-wpm)"
          strokeWidth={2.25}
          dot={false}
          activeDot={{
            r: 3,
            stroke: "var(--color-wpm)",
            fill: "var(--background)",
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}

/** Render the run's source passage with each character coloured by its
 *  *speed* — fast = foreground (white/black per theme), slow = primary
 *  full. The 10th–90th-percentile range becomes the colour scale so a
 *  single outlier (a yawn) doesn't crush the gradient. */
function PassageHeatmap({
  words,
  events,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
}) {
  const latencyByPos = useMemo(() => {
    const map = new Map<string, number>();
    let w = 0;
    let c = 0;
    let prevT = 0;
    for (const e of events) {
      if (!e.correct) continue;
      const word = words[w];
      if (!word) break;
      map.set(`${w}:${c}`, Math.max(0, e.t - prevT));
      prevT = e.t;
      c += 1;
      if (c >= word.length) {
        w += 1;
        c = 0;
      }
    }
    return map;
  }, [events, words]);

  const [lo, hi] = useMemo(() => {
    const sorted = [...latencyByPos.values()].sort((a, b) => a - b);
    if (sorted.length < 4) return [0, 1] as const;
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
    return [p10, Math.max(p90, p10 + 1)] as const;
  }, [latencyByPos]);

  if (words.length === 0) return null;

  return (
    <div className="font-mono text-base leading-[1.7] tracking-[0.04em] [word-spacing:0.25em]">
      {words.map((word, wi) => (
        <span key={wi}>
          {[...word].map((ch, ci) => {
            const lat = latencyByPos.get(`${wi}:${ci}`);
            if (lat == null) {
              return (
                <span key={ci} className="text-muted-foreground/60">
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
            <span className="text-muted-foreground/60">{" "}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function PairFlow({ pairs }: { pairs: readonly PairStat[] }) {
  if (pairs.length === 0) return null;
  const maxMs = Math.max(0, ...pairs.map((p) => p.avgMs));
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {pairs.map((p) => {
        const intensity = maxMs > 0 ? p.avgMs / maxMs : 0;
        const a = p.pair[0] ?? "";
        const b = p.pair[1] ?? "";
        return (
          <li
            key={p.pair}
            className="flex items-center gap-1.5 text-sm tabular-nums"
          >
            <Glyph char={a} intensity={intensity} />
            <svg
              width={22}
              height={10}
              aria-hidden
              className="text-muted-foreground"
              style={{ opacity: 0.5 + intensity * 0.5 }}
            >
              <line
                x1={1}
                y1={5}
                x2={15}
                y2={5}
                stroke="currentColor"
                strokeWidth={1 + intensity * 1.5}
              />
              <polygon points="15,1 22,5 15,9" fill="currentColor" />
            </svg>
            <Glyph char={b} intensity={intensity} />
            <span className="ml-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {Math.round(p.avgMs)}ms
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Glyph({ char, intensity }: { char: string; intensity: number }) {
  return (
    <span
      className="font-mono text-base font-semibold leading-none"
      style={{
        color: `color-mix(in oklch, var(--primary) ${Math.round(intensity * 100)}%, var(--foreground))`,
      }}
    >
      {char === " " ? "␣" : char}
    </span>
  );
}

// ─── Replay ────────────────────────────────────────────────────────

function reconstructCursor(
  events: readonly KeyEvent[],
  words: readonly string[],
  upTo: number,
) {
  let w = 0;
  let c = 0;
  const errorWords = new Set<number>();
  for (let i = 0; i < upTo; i += 1) {
    const e = events[i]!;
    const word = words[w];
    if (!word) break;
    if (e.correct) {
      c += 1;
      if (c >= word.length) {
        w += 1;
        c = 0;
      }
    } else {
      errorWords.add(w);
    }
  }
  return { wordIdx: w, charIdx: c, errorWords };
}

function ReplayView({
  words,
  events,
  onExit,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
  onExit: () => void;
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (paused) return;
    if (step >= events.length) {
      const id = setTimeout(onExit, 1500);
      return () => clearTimeout(id);
    }
    const cur = events[step]!;
    const next = events[step + 1];
    const realDelay = next ? Math.max(20, next.t - cur.t) : 600;
    const id = setTimeout(
      () => setStep((s) => s + 1),
      realDelay / speed,
    );
    return () => clearTimeout(id);
  }, [step, events, paused, speed, onExit]);

  const { wordIdx, charIdx, errorWords } = useMemo(
    () => reconstructCursor(events, words, step),
    [events, words, step],
  );

  const pct =
    events.length > 0 ? Math.min(100, Math.round((step / events.length) * 100)) : 0;
  const elapsed = step > 0 && events[step - 1] ? events[step - 1]!.t : 0;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div className="flex w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            replay · {pct}% · {(elapsed / 1000).toFixed(1)}s
          </span>
          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-sm border px-2 py-0.5 font-mono normal-case",
                  speed === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {s}×
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "play" : "pause"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit}>
              stop
            </Button>
          </div>
        </div>

        <div
          aria-hidden
          className="h-0.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="font-mono text-xl leading-[1.7] tracking-[0.04em]">
          {words.map((word, wi) => (
            <span key={wi}>
              {[...word].map((ch, ci) => {
                const typed =
                  wi < wordIdx || (wi === wordIdx && ci < charIdx);
                const cls = !typed
                  ? "text-muted-foreground"
                  : errorWords.has(wi)
                    ? "text-primary underline decoration-1 underline-offset-[6px]"
                    : "text-foreground";
                const isCursor = wi === wordIdx && ci === charIdx;
                return (
                  <span
                    key={ci}
                    className={cn(cls, isCursor && "border-l-2 border-primary")}
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
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export function TestSummary() {
  const { state, restart, wpm, raw, accuracy, elapsedMs, wpmHistory } =
    usePractice();
  const { prefs: appearance } = useAppearancePrefs();
  const [replaying, setReplaying] = useState(false);
  // Convert the live wpmHistory samples into chart buckets keyed by
  // whole-second markers. monkeytype draws its WPM trace from exactly
  // this stream.
  const buckets = useMemo<Bucket[]>(
    () =>
      wpmHistory.map((s) => ({
        sec: Math.max(1, Math.round(s.t / 1000)),
        wpm: s.wpm,
        raw: s.raw,
      })),
    [wpmHistory],
  );
  const peak = Math.round(peakWpm(buckets));
  const cons = consistencyScore(buckets);
  const slowPairs = useMemo(() => analysePairs(state.events), [state.events]);
  const wrongTotal = state.events.filter((e) => !e.correct).length;
  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
  // Raw comes straight from the practice state now — same monkeytype
  // formula as WPM but without the "only-perfect-words" filter.
  const rawWpm = raw;
  const modeLabel =
    state.mode === "TIME"
      ? `time ${state.length}`
      : state.mode === "QUOTE"
        ? "quote"
        : `words ${state.length}`;

  if (replaying) {
    return (
      <ReplayView
        words={state.words}
        events={state.events}
        onExit={() => setReplaying(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center overflow-y-auto px-2 py-3 sm:justify-center sm:overflow-hidden sm:px-4 sm:py-0">
      <div className="flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
        {/* Top row: stat column on the left, smaller centered chart. */}
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[140px_1fr] sm:gap-6 lg:grid-cols-[160px_1fr]">
          <div className="flex flex-row items-baseline gap-6 sm:flex-col sm:items-start sm:gap-4">
            <BigStat
              label={SPEED_UNIT_LABEL[appearance.typingSpeedUnit]}
              value={formatSpeed(
                wpm,
                appearance.typingSpeedUnit,
                appearance.alwaysShowDecimal,
              )}
              accent
            />
            <BigStat
              label="acc"
              value={
                appearance.alwaysShowDecimal
                  ? `${(Math.round(accuracy * 10) / 10).toFixed(1)}%`
                  : `${Math.round(accuracy * 10) / 10}%`
              }
              accent
            />
            <div className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
              <div>test type</div>
              <div className="mt-1 text-foreground">{modeLabel}</div>
              <div className="text-foreground">english</div>
            </div>
          </div>
          <div className="w-full">
            <WpmChart
              buckets={buckets}
              startAtZero={appearance.startGraphsAtZero}
            />
          </div>
        </div>

        {/* Inline stats row, monkeytype-style. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <BigStat
            label="raw"
            value={formatSpeed(
              rawWpm,
              appearance.typingSpeedUnit,
              appearance.alwaysShowDecimal,
            )}
            accent
          />
          <BigStat
            label="characters"
            value={`${state.correctChars}/${wrongTotal}/0/0`}
            accent
          />
          <BigStat label="consistency" value={`${cons}%`} accent />
          <BigStat label="time" value={`${elapsedSec}s`} accent />
        </div>

        {/* Heatmap strip — speed-coloured passage. */}
        {state.words.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>passage heatmap</span>
              <span className="text-muted-foreground/70">
                fast → slow · hover for ms
              </span>
            </div>
            <PassageHeatmap words={state.words} events={state.events} />
          </div>
        ) : null}

        {/* Slow pairs — only render if we have any. */}
        {slowPairs.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>slow pairs</span>
              <span className="text-muted-foreground/70">
                top {slowPairs.length} · arrow weight = delay
              </span>
            </div>
            <PairFlow pairs={slowPairs} />
          </div>
        ) : null}

        {/* Restart hint — quiet footer. */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="rounded-sm border border-border bg-card px-2 py-1 font-mono normal-case text-foreground">
            tab
          </span>
          <span>restart · peak {peak}</span>
          {state.events.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplaying(true)}
              className="text-[11px] uppercase tracking-[0.18em]"
            >
              ▶ replay
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
