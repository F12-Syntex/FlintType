"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import type {
  HistorySummaryOutput,
  HistoryTest,
  HistoryWeakness,
} from "@/types/history";
import { AllTestsChart } from "./all-tests-chart";
import { DailyChart, type DailyPoint } from "./daily-chart";
import { Headline, type HeadlineInsight } from "./headline";
import { PairEvolution } from "./pair-evolution";
import { Records, type RecordRow } from "./records";
import { RunLog } from "./runlog";
import { TrendTiles } from "./trend-tiles";

const DAILY_WINDOW_DAYS = 90;
const RUNLOG_LIMIT = 12;

/** History page client wrapper. Single backend call, then everything
 *  downstream is a pure function of the returned summary + the
 *  current `now`. Loading/empty/error each render the page chrome
 *  with a banner so the page never collapses to a blank screen. */
export function HistoryView() {
  const backend = useBackend();
  const [data, setData] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setData(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to see your history.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load history.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  // `now` resolves at render-time on the client. We freeze it once
  // per data load so every relative-time string in the page agrees.
  const now = useMemo(() => Date.now(), [data]);

  if (loading) {
    return (
      <section className="px-5 pt-12 pb-9 sm:px-16">
        <Tag>YOUR HISTORY · LOADING</Tag>
        <p className="mt-4 text-sm text-muted-foreground">Reading your runs…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="px-5 pt-12 pb-9 sm:px-16">
        <Tag>YOUR HISTORY · UNAVAILABLE</Tag>
        <p className="mt-4 text-sm text-primary">{error}</p>
      </section>
    );
  }
  if (!data) return null;

  const {
    recentTests,
    weakestPairs,
    weakestTrigrams,
    cold,
    bigramBaselineMs,
    trigramBaselineMs,
  } = data;
  const dailyPoints = buildDailyPoints(recentTests, now, DAILY_WINDOW_DAYS);
  const movingAvg = sevenDayMovingAvg(dailyPoints);
  const records = buildRecords(recentTests);
  const headlineHero = buildHero(recentTests, weakestPairs, cold, now);
  const insights = buildInsights(recentTests, weakestPairs, cold, now);
  const runs = recentTests.slice(0, RUNLOG_LIMIT);

  return (
    <>
      <Headline hero={headlineHero} insights={insights} />

      {/* Numeric tiles right under the hero — surfaces the
       *  improvement-rate and projection metrics the user actually
       *  cares about ("am I getting better?") before the charts. */}
      <section className="border-b border-foreground/10 px-5 py-8 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <Tag>TRAJECTORY</Tag>
          <span className="text-[11px] text-muted-foreground">
            mean · slope · projection · best · sample
          </span>
        </div>
        <TrendTiles tests={recentTests} now={now} />
      </section>

      {/* All-tests scatter — every run as a point, with a linear
       *  regression trend line. Scales with sparse data better than
       *  the daily bars below; the daily chart stays for users with
       *  plenty of history. */}
      <section className="border-b border-foreground/10 px-5 py-8 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-5">
            <Tag>EVERY TEST · WPM</Tag>
            <span className="text-[11px] text-muted-foreground">
              each dot = one test · dashed line = trend
            </span>
          </div>
        </div>
        <AllTestsChart tests={recentTests} />
      </section>

      <section className="border-b border-foreground/10 px-5 py-8 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-5">
            <Tag>DAILY WPM · {DAILY_WINDOW_DAYS} DAYS</Tag>
            <span className="text-[11px] text-muted-foreground">
              each bar = best run that day · line = 7-day average
            </span>
          </div>
        </div>
        <DailyChart days={dailyPoints} movingAvg={movingAvg} />
      </section>

      <section className="grid grid-cols-1 gap-8 border-b border-foreground/10 px-5 py-8 sm:px-16 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Tag>BIGRAM WEAKNESSES</Tag>
            <span className="text-[11px] text-muted-foreground">
              top {weakestPairs.length} · ms over baseline
            </span>
          </div>
          <PairEvolution pairs={weakestPairs} baselineMs={bigramBaselineMs} />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Tag>TRIGRAM WEAKNESSES</Tag>
            <span className="text-[11px] text-muted-foreground">
              top {weakestTrigrams.length} · ms over baseline
            </span>
          </div>
          <PairEvolution
            pairs={weakestTrigrams}
            baselineMs={trigramBaselineMs}
            itemLabel="TRIGRAM"
          />
        </div>
      </section>

      <section className="border-b border-foreground/10 px-5 py-8 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <Tag>PERSONAL BESTS</Tag>
          <span className="text-[11px] text-muted-foreground">by mode</span>
        </div>
        <Records records={records} now={now} />
      </section>

      <section className="px-5 py-8 pb-14 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <Tag>
            RUN LOG · LAST {runs.length} OF {recentTests.length}
          </Tag>
        </div>
        <RunLog tests={runs} now={now} />
      </section>
    </>
  );
}

// ─── aggregation helpers ──────────────────────────────────────────────

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildDailyPoints(
  tests: readonly HistoryTest[],
  now: number,
  windowDays: number,
): DailyPoint[] {
  const todayStart = startOfDay(now);
  const dayMs = 86_400_000;
  /** Map of dayStart → bestWpm for runs that landed on that day. */
  const bestByDay = new Map<number, number>();
  for (const t of tests) {
    const day = startOfDay(t.completedAtMs);
    if (day > todayStart) continue;
    if (todayStart - day >= windowDays * dayMs) continue;
    const prev = bestByDay.get(day) ?? 0;
    if (t.wpm > prev) bestByDay.set(day, t.wpm);
  }
  const out: DailyPoint[] = [];
  for (let i = 0; i < windowDays; i++) {
    const day = todayStart - i * dayMs;
    out.push({ daysAgo: i, bestWpm: bestByDay.get(day) ?? 0 });
  }
  return out;
}

function sevenDayMovingAvg(points: readonly DailyPoint[]): number[] {
  const avg = new Array<number>(points.length);
  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let n = 0;
    for (let k = i; k < Math.min(points.length, i + 7); k++) {
      const v = points[k]?.bestWpm ?? 0;
      if (v > 0) {
        sum += v;
        n++;
      }
    }
    avg[i] = n > 0 ? sum / n : 0;
  }
  return avg;
}

function buildRecords(tests: readonly HistoryTest[]): RecordRow[] {
  // Group by displayed (mode, length) tuple; pick max wpm per group.
  const best = new Map<string, RecordRow>();
  for (const t of tests) {
    const label =
      t.mode === "training"
        ? `ADAPT · ${t.durationOrWordCount}`
        : `WORDS · ${t.durationOrWordCount}`;
    const cur = best.get(label);
    if (!cur || t.wpm > cur.wpm) {
      best.set(label, {
        mode: label,
        wpm: Math.round(t.wpm),
        completedAtMs: t.completedAtMs,
      });
    }
  }
  return [...best.values()].sort((a, b) => b.wpm - a.wpm);
}

function buildHero(
  tests: readonly HistoryTest[],
  weakest: readonly HistoryWeakness[],
  cold: boolean,
  now: number,
): { highlight: string; lead: string; muted: string } {
  if (cold || tests.length === 0) {
    return {
      lead: "Type a few tests",
      highlight: "to populate this page.",
      muted: "Adaptive drilling will surface here once we have signal.",
    };
  }
  const dayMs = 86_400_000;
  const recent = tests.filter((t) => now - t.completedAtMs <= 7 * dayMs);
  const older = tests.filter(
    (t) =>
      now - t.completedAtMs > 7 * dayMs &&
      now - t.completedAtMs <= 90 * dayMs,
  );
  const recentMax = recent.reduce((m, t) => Math.max(m, t.wpm), 0);
  const olderMax = older.reduce((m, t) => Math.max(m, t.wpm), 0);
  if (recentMax > 0 && olderMax > 0 && recentMax > olderMax) {
    const delta = Math.round(recentMax - olderMax);
    return {
      lead: "You're",
      highlight: `${delta} wpm faster`,
      muted:
        weakest.length > 0
          ? `than your 90-day high. Top current pain point: "${weakest[0]!.key}".`
          : "than your 90-day high.",
    };
  }
  if (recentMax > 0) {
    return {
      lead: `Your 7-day ceiling is`,
      highlight: `${Math.round(recentMax)} wpm.`,
      muted:
        weakest.length > 0
          ? `Drill "${weakest[0]!.key}" to push past it.`
          : "",
    };
  }
  return { lead: "Welcome back.", highlight: "", muted: "" };
}

function buildInsights(
  tests: readonly HistoryTest[],
  weakest: readonly HistoryWeakness[],
  cold: boolean,
  now: number,
): HeadlineInsight[] {
  if (cold || tests.length === 0) return [];
  const out: HeadlineInsight[] = [];
  const dayMs = 86_400_000;
  const last30 = tests.filter((t) => now - t.completedAtMs <= 30 * dayMs);
  const last7 = last30.filter((t) => now - t.completedAtMs <= 7 * dayMs);
  if (last30.length >= 5) {
    const avg30 = average(last30.map((t) => t.wpm));
    const avg7 = last7.length > 0 ? average(last7.map((t) => t.wpm)) : avg30;
    const delta = avg7 - avg30;
    if (delta > 1.5) {
      out.push({
        kind: "win",
        headline: `Up ${delta.toFixed(1)} wpm vs. your 30-day average`,
        detail: `7-day avg ${avg7.toFixed(1)} · 30-day avg ${avg30.toFixed(1)}. ${last7.length} run${last7.length === 1 ? "" : "s"} in the window.`,
      });
    } else if (delta < -1.5) {
      out.push({
        kind: "win",
        headline: `Down ${Math.abs(delta).toFixed(1)} wpm vs. your 30-day average`,
        detail: `7-day avg ${avg7.toFixed(1)} · 30-day avg ${avg30.toFixed(1)}. Possibly fatigue — short, focused drills tend to help.`,
      });
    }
  }
  if (last7.length > 0) {
    const ceiling = last7.reduce((m, t) => Math.max(m, t.wpm), 0);
    out.push({
      kind: "now",
      headline: `Your 7-day ceiling is ${Math.round(ceiling)} wpm`,
      detail: `Across ${last7.length} run${last7.length === 1 ? "" : "s"} this week. Consistency comes from defending this number.`,
    });
  }
  if (weakest.length > 0) {
    const top = weakest[0]!;
    out.push({
      kind: "next",
      headline: `"${top.key}" is your slowest pair`,
      detail: `Mean ${Math.round(top.meanMs)}ms across ${top.sampleCount} samples. Drill it for the biggest single bump in your average WPM.`,
    });
  }
  return out;
}

function average(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const v of xs) s += v;
  return s / xs.length;
}
