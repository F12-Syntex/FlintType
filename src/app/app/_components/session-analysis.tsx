"use client";

import { ArrowDown, ArrowUp, Sparkles, Target, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { KeyEvent } from "./practice-state";

/** Per-test "what went well / what went wrong" panel rendered under
 *  the result chart. Pure derivation from the run's keystroke
 *  stream + word list — same source the heatmap uses, just with
 *  callouts surfaced as named insights rather than colour gradients.
 *
 *  The panel never blocks the page on incomplete data; insufficient
 *  signal renders a quiet "not enough keystrokes for analysis" line
 *  rather than empty cards. */
export function SessionAnalysis({
  words,
  events,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
}) {
  const analysis = useMemo(() => analyseRun(events, words), [events, words]);

  if (analysis.totalKeystrokes < 12) {
    return (
      <div className="flex flex-col gap-2">
        <Tag>SESSION ANALYSIS</Tag>
        <p className="text-xs text-muted-foreground">
          Not enough keystrokes in this run to derive useful insights.
          Run a longer test for a per-pair breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <Tag>SESSION ANALYSIS</Tag>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          {analysis.totalKeystrokes} keystrokes · {analysis.errorCount} mistyped
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Column
          tone="positive"
          title="What went well"
          icon={<Sparkles size={14} />}
          items={analysis.wins}
          empty="Steady rather than spiky — keep building rhythm."
        />
        <Column
          tone="negative"
          title="What went wrong"
          icon={<TriangleAlert size={14} />}
          items={analysis.issues}
          empty="Nothing stood out as a problem in this run."
        />
      </div>

      {analysis.coaching.length > 0 ? (
        <div className="flex flex-col gap-2 border border-foreground/10 bg-card p-4">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-primary" />
            <Tag>COACHING</Tag>
          </div>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-foreground">
            {analysis.coaching.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── column ─────────────────────────────────────────────────────

type Insight = {
  headline: string;
  detail: string;
  /** Optional accent number — surfaced large to anchor the eye. */
  metric?: string;
};

function Column({
  tone,
  title,
  icon,
  items,
  empty,
}: {
  tone: "positive" | "negative";
  title: string;
  icon: React.ReactNode;
  items: readonly Insight[];
  empty: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border bg-card p-4",
        tone === "positive"
          ? "border-primary/30"
          : "border-destructive/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          tone === "positive" ? "text-primary" : "text-destructive",
        )}
      >
        {icon}
        <Tag>{title}</Tag>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3">
              {tone === "positive" ? (
                <ArrowUp
                  size={14}
                  className="mt-1 shrink-0 text-primary"
                  aria-hidden
                />
              ) : (
                <ArrowDown
                  size={14}
                  className="mt-1 shrink-0 text-destructive"
                  aria-hidden
                />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold leading-snug text-foreground">
                  {it.headline}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {it.detail}
                </span>
                {it.metric ? (
                  <span className="mt-1 text-base font-bold tabular-nums text-foreground">
                    {it.metric}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── derivation ─────────────────────────────────────────────────

type Pair = { key: string; avgMs: number; samples: number };
type RunAnalysis = {
  totalKeystrokes: number;
  errorCount: number;
  wins: Insight[];
  issues: Insight[];
  coaching: string[];
};

function analyseRun(
  events: readonly KeyEvent[],
  words: readonly string[],
): RunAnalysis {
  const totalKeystrokes = events.length;
  const errors = events.filter((e) => !e.correct);
  const errorCount = errors.length;

  // Per-pair latency aggregation (only consecutive correct keystrokes
  // inside the same word). Same shape as analysePairs in test-summary
  // but localised so this module is self-contained.
  const buckets = new Map<string, { samples: number; total: number }>();
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!;
    const cur = events[i]!;
    if (!prev.correct || !cur.correct) continue;
    if (prev.wordIndex !== cur.wordIndex) continue;
    if (!prev.expected || !cur.expected) continue;
    const dt = cur.t - prev.t;
    if (dt <= 0 || dt > 2000) continue;
    const key = `${prev.expected.toLowerCase()}${cur.expected.toLowerCase()}`;
    const b = buckets.get(key) ?? { samples: 0, total: 0 };
    b.samples += 1;
    b.total += dt;
    buckets.set(key, b);
  }
  const pairs: Pair[] = [...buckets.entries()]
    .filter(([, b]) => b.samples >= 2)
    .map(([key, b]) => ({
      key,
      avgMs: b.total / b.samples,
      samples: b.samples,
    }));
  pairs.sort((a, b) => a.avgMs - b.avgMs);
  const fastestPair = pairs[0];
  const slowestPair = pairs[pairs.length - 1];

  // Per-word total time + length. Used for "fastest word" and the
  // longest-error-free streak. Reads from `wordIndex` on each event.
  const perWord = new Map<number, { firstT: number; lastT: number; correctChars: number; errors: number }>();
  for (const e of events) {
    const w = perWord.get(e.wordIndex) ?? {
      firstT: e.t,
      lastT: e.t,
      correctChars: 0,
      errors: 0,
    };
    w.firstT = Math.min(w.firstT, e.t);
    w.lastT = Math.max(w.lastT, e.t);
    if (e.correct) w.correctChars += 1;
    else w.errors += 1;
    perWord.set(e.wordIndex, w);
  }
  let bestWordWpm = 0;
  let bestWordIdx: number | null = null;
  for (const [wi, w] of perWord) {
    const target = words[wi];
    if (!target || target.length < 2) continue;
    const span = Math.max(1, w.lastT - w.firstT);
    if (w.errors > 0) continue;
    if (w.correctChars < target.length) continue;
    const wordWpm = (target.length / 5) * (60_000 / span);
    if (wordWpm > bestWordWpm) {
      bestWordWpm = wordWpm;
      bestWordIdx = wi;
    }
  }

  // Longest error-free run, measured in keystrokes. Counts the
  // longest consecutive `correct: true` window in the event stream.
  let longestStreak = 0;
  let currentStreak = 0;
  for (const e of events) {
    if (e.correct) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Most-errored word — the word index with the highest error count.
  let worstWordIdx: number | null = null;
  let worstWordErrors = 0;
  for (const [wi, w] of perWord) {
    if (w.errors > worstWordErrors) {
      worstWordErrors = w.errors;
      worstWordIdx = wi;
    }
  }

  // ── insights ──
  const wins: Insight[] = [];
  const issues: Insight[] = [];
  const coaching: string[] = [];

  if (fastestPair) {
    wins.push({
      headline: `Crispest pair: "${fastestPair.key}"`,
      detail: `${fastestPair.samples} samples · averaged ${Math.round(fastestPair.avgMs)} ms between presses.`,
      metric: `${Math.round(fastestPair.avgMs)} ms`,
    });
  }
  if (bestWordIdx != null && bestWordWpm > 0) {
    wins.push({
      headline: `Fastest word: "${words[bestWordIdx]}"`,
      detail: `Burst speed across that word — your peak in this run.`,
      metric: `${Math.round(bestWordWpm)} wpm`,
    });
  }
  if (longestStreak >= 10) {
    wins.push({
      headline: `Longest clean streak: ${longestStreak} keystrokes`,
      detail: `Continuous run without a mistyped key.`,
    });
  }

  if (slowestPair && (!fastestPair || slowestPair.key !== fastestPair.key)) {
    issues.push({
      headline: `Slowest pair: "${slowestPair.key}"`,
      detail: `${slowestPair.samples} samples · averaged ${Math.round(slowestPair.avgMs)} ms between presses.`,
      metric: `${Math.round(slowestPair.avgMs)} ms`,
    });
  }
  if (worstWordIdx != null && worstWordErrors > 0) {
    const target = words[worstWordIdx];
    if (target) {
      issues.push({
        headline: `Most error-prone word: "${target}"`,
        detail: `${worstWordErrors} mistyped key${worstWordErrors === 1 ? "" : "s"} in that word.`,
        metric: `${worstWordErrors}`,
      });
    }
  }
  const errorRate = totalKeystrokes > 0 ? errorCount / totalKeystrokes : 0;
  if (errorRate > 0.06) {
    issues.push({
      headline: `High error rate: ${Math.round(errorRate * 100)}%`,
      detail:
        "More than 1 in 17 keys mistyped. Slow down by ~10 wpm; the cleaner motion compounds.",
      metric: `${Math.round(errorRate * 100)}%`,
    });
  }

  // ── coaching takeaways ──
  if (slowestPair && fastestPair) {
    const ratio = slowestPair.avgMs / Math.max(1, fastestPair.avgMs);
    if (ratio >= 2.5) {
      coaching.push(
        `Your slowest pair "${slowestPair.key}" was ${ratio.toFixed(1)}× slower than your fastest "${fastestPair.key}" — drilling "${slowestPair.key}" specifically would close that gap fastest.`,
      );
    }
  }
  if (errorRate > 0.05 && errorRate <= 0.1) {
    coaching.push(
      "Error rate is borderline. Your peak WPM is being held back by accuracy — practising at a slower, deliberate pace for one session usually flips the trade-off.",
    );
  }
  if (longestStreak >= 30) {
    coaching.push(
      `30+ clean keystrokes in a row is the rhythm you're chasing — your ceiling is set by how often you can sustain that, not how high your peak burst was.`,
    );
  }

  return {
    totalKeystrokes,
    errorCount,
    wins,
    issues,
    coaching,
  };
}
