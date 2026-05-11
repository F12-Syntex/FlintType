import type { HistoryTest } from "@/types/history";

/** Pure derivations from the user's HistoryTest stream. The /profile
 *  page is read-only — every panel is a function over `recentTests`. */

export type ProfileTotals = {
  testsStarted: number;
  testsCompleted: number;
  /** Completion ratio, 0..1. NaN-safe — 0 when no tests started. */
  completionRate: number;
  totalSeconds: number;
  meanWpm: number;
  bestWpm: number;
  /** Highest single-test accuracy across completed tests. MT shows
   *  this alongside best WPM as the second marquee number. */
  bestAccuracy: number;
  meanAccuracy: number;
  level: number;
  /** XP toward the next level, 0..1. */
  levelProgress: number;
};

/** Test-driven level: every full level requires more tests than the
 *  one before it (5, 8, 12, 19, …) so the early levels feel quick and
 *  late levels feel earned. Returns floor(level) and the [0..1)
 *  progress to the next one. */
function levelFromCount(testsCompleted: number): {
  level: number;
  progress: number;
} {
  if (testsCompleted <= 0) return { level: 1, progress: 0 };
  let level = 1;
  let needed = 5;
  let used = 0;
  while (used + needed <= testsCompleted) {
    used += needed;
    level += 1;
    needed = Math.round(needed * 1.5);
  }
  const progress = Math.max(0, Math.min(1, (testsCompleted - used) / needed));
  return { level, progress };
}

export function deriveTotals(tests: readonly HistoryTest[]): ProfileTotals {
  const testsStarted = tests.length;
  const completed = tests.filter((t) => t.wasCompleted);
  const testsCompleted = completed.length;
  const completionRate =
    testsStarted > 0 ? testsCompleted / testsStarted : 0;
  const totalSeconds = completed.reduce((s, t) => {
    const dur = Math.max(0, t.completedAtMs - t.startedAtMs);
    return s + dur / 1000;
  }, 0);
  const meanWpm =
    completed.length > 0
      ? completed.reduce((s, t) => s + t.wpm, 0) / completed.length
      : 0;
  const bestWpm = completed.reduce((m, t) => (t.wpm > m ? t.wpm : m), 0);
  const bestAccuracy = completed.reduce(
    (m, t) => (t.accuracy > m ? t.accuracy : m),
    0,
  );
  const meanAccuracy =
    completed.length > 0
      ? completed.reduce((s, t) => s + t.accuracy, 0) / completed.length
      : 0;
  const { level, progress } = levelFromCount(testsCompleted);
  return {
    testsStarted,
    testsCompleted,
    completionRate,
    totalSeconds,
    meanWpm,
    bestWpm,
    bestAccuracy,
    meanAccuracy,
    level,
    levelProgress: progress,
  };
}

export type StreakStats = {
  current: number;
  longest: number;
  lastTestMs: number | null;
};

/** Streak counts consecutive *days* with at least one completed test.
 *  "Current" includes today if there's a test today, otherwise it
 *  counts back from the most recent activity day. */
export function deriveStreak(tests: readonly HistoryTest[]): StreakStats {
  if (tests.length === 0) return { current: 0, longest: 0, lastTestMs: null };
  const days = new Set<string>();
  let lastTestMs = 0;
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    const d = new Date(t.startedAtMs);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.add(key);
    if (t.startedAtMs > lastTestMs) lastTestMs = t.startedAtMs;
  }
  const sortedDays = [...days]
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y!, m!, d!).getTime();
    })
    .sort((a, b) => b - a);

  // Walk forward through consecutive days from the most recent.
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const ts of [...sortedDays].reverse()) {
    if (prev != null && ts - prev === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = ts;
  }

  // Current streak counts back from today (or the most recent day if
  // we haven't typed today).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  let current = 0;
  // Allow a one-day grace if the most recent activity was yesterday.
  if (!days.has(dateKey(cursor))) {
    cursor -= 86_400_000;
    if (!days.has(dateKey(cursor))) {
      return { current: 0, longest, lastTestMs: lastTestMs || null };
    }
  }
  while (days.has(dateKey(cursor))) {
    current += 1;
    cursor -= 86_400_000;
  }
  return { current, longest, lastTestMs: lastTestMs || null };
}

function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Bucket key like "TIME · 30" / "WORDS · 50" — we group personal
 *  bests by (mode, durationOrWordCount). Mode strings come straight
 *  from HistoryTest.mode without normalisation, so any future modes
 *  surface automatically. */
export type PersonalBest = {
  mode: string;
  amount: number;
  bestWpm: number;
  bestAccuracy: number;
  testsCount: number;
};

export function derivePersonalBests(
  tests: readonly HistoryTest[],
): PersonalBest[] {
  const buckets = new Map<string, PersonalBest>();
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    const key = `${normalizeMode(t.mode)}|${t.durationOrWordCount}`;
    const existing = buckets.get(key);
    if (existing) {
      if (t.wpm > existing.bestWpm) {
        existing.bestWpm = t.wpm;
        existing.bestAccuracy = t.accuracy;
      }
      existing.testsCount += 1;
    } else {
      buckets.set(key, {
        mode: normalizeMode(t.mode),
        amount: t.durationOrWordCount,
        bestWpm: t.wpm,
        bestAccuracy: t.accuracy,
        testsCount: 1,
      });
    }
  }
  return [...buckets.values()].sort((a, b) => {
    if (a.mode !== b.mode) return a.mode.localeCompare(b.mode);
    return a.amount - b.amount;
  });
}

/** Split practice modes into a coarser display label. Adapt /
 *  reverse_adaptive both fold into the user-facing "training" group. */
function normalizeMode(mode: string): string {
  if (mode === "training" || mode === "reverse_adaptive") return "training";
  if (mode === "casual") return "casual";
  return mode;
}

export type DayCell = { date: Date; tests: number };

/** Build the last `weeks` weeks of activity, week-aligned to Monday.
 *  Returns chronological days; the heatmap component groups them into
 *  columns by week. */
export function deriveActivity(
  tests: readonly HistoryTest[],
  weeks = 26,
): DayCell[] {
  const counts = new Map<string, number>();
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    counts.set(dateKey(t.startedAtMs), (counts.get(dateKey(t.startedAtMs)) ?? 0) + 1);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
  const lastMonday = today.getTime() - dayOfWeek * 86_400_000;
  const startMs = lastMonday - (weeks - 1) * 7 * 86_400_000;

  const out: DayCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const ms = startMs + i * 86_400_000;
    if (ms > today.getTime()) break;
    const d = new Date(ms);
    out.push({ date: d, tests: counts.get(dateKey(ms)) ?? 0 });
  }
  return out;
}

/** Per-test (sec, wpm) samples for the trend line. Sorted oldest →
 *  newest, capped at the last `limit` tests so the chart breathes
 *  rather than compressing 500 dots into noise. */
export type TrendPoint = { idx: number; wpm: number; ts: number };

export function deriveTrend(
  tests: readonly HistoryTest[],
  limit = 60,
): TrendPoint[] {
  const completed = tests.filter((t) => t.wasCompleted);
  // recentTests is newest-first; reverse for chronological order.
  const ordered = [...completed].reverse();
  const slice = ordered.slice(-limit);
  return slice.map((t, i) => ({
    idx: i + 1,
    wpm: t.wpm,
    ts: t.startedAtMs,
  }));
}
