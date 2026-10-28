import {
  XP_PER_LEVEL,
  XP_PER_TEST,
  levelFromXp,
} from "@/lib/level";
import {
  DEFAULT_LIFETIME_STATS,
  type LifetimeStats,
} from "@/lib/lifetime-stats";
import { computeTotalXp } from "@/lib/xp-rewards";
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
  /** Accuracy on the *best-WPM* test specifically — not the highest
   *  accuracy across all tests. MT pairs the personal-best speed with
   *  the accuracy that was achieved on the same run, since a clean
   *  high-WPM test reads differently than a messy one. */
  bestWpmAccuracy: number;
  meanAccuracy: number;
  level: number;
  /** Lifetime XP across every completed test. */
  totalXp: number;
  /** XP earned inside the current level, 0..XP_PER_LEVEL-1. */
  xpIntoLevel: number;
  /** XP toward the next level, 0..1. */
  levelProgress: number;
};

/** XP economy lives in `src/lib/level.ts` — re-exported here so
 *  existing consumers (profile-hero level bar) keep their import
 *  path. The leaderboard's Top-by-Level route reads from the same
 *  shared module so the level number a user sees on their profile
 *  always equals their leaderboard rank's level. */
export { XP_PER_TEST, XP_PER_LEVEL };

export function deriveTotals(
  tests: readonly HistoryTest[],
  lifetime: LifetimeStats = DEFAULT_LIFETIME_STATS,
): ProfileTotals {
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
  // Track the best-WPM test so we can pair its accuracy with the
  // personal-best number — accuracy of the highest-WPM run, not the
  // overall accuracy max.
  const bestRun = completed.reduce<HistoryTest | null>(
    (m, t) => (m == null || t.wpm > m.wpm ? t : m),
    null,
  );
  const bestWpm = bestRun?.wpm ?? 0;
  const bestWpmAccuracy = bestRun?.accuracy ?? 0;
  const meanAccuracy =
    completed.length > 0
      ? completed.reduce((s, t) => s + t.accuracy, 0) / completed.length
      : 0;
  const { level, totalXp, xpIntoLevel, progress } = levelFromXp(
    computeTotalXp({ testsCompleted, ...lifetime }),
  );
  return {
    testsStarted,
    testsCompleted,
    completionRate,
    totalSeconds,
    meanWpm,
    bestWpm,
    bestWpmAccuracy,
    meanAccuracy,
    level,
    totalXp,
    xpIntoLevel,
    levelProgress: progress,
  };
}

/** Bucket key like "TIME · 30" / "WORDS · 50" — we group personal
 *  bests by (mode, durationOrWordCount). Mode strings come straight
 *  from HistoryTest.mode without normalisation, so any future modes
 *  surface automatically. */
export type PersonalBest = {
  mode: string;
  amount: number;
  /** Length unit for `amount` — keeps a 60-word run in a separate
   *  bucket from a 60-second run. `null` for legacy rows persisted
   *  before the discriminator existed (and for MT-overlay rows, which
   *  the merge layer keys on (mode, amount) alone). */
  lengthMode: "words" | "time" | "quote" | null;
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
    const key = `${normalizeMode(t.mode)}|${t.lengthMode ?? "legacy"}|${t.durationOrWordCount}`;
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
        lengthMode: t.lengthMode ?? null,
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
 *  reverse_adaptive both fold into the user-facing "training" group.
 *  Exported so the Recent-runs record crown buckets exactly like the
 *  Personal bests section does. */
export function normalizeMode(mode: string): string {
  if (mode === "training" || mode === "reverse_adaptive") return "training";
  if (mode === "casual") return "casual";
  return mode;
}

/** Per-test samples for the trend line, oldest → newest. `idx` is the
 *  run's 1-based chronological position in the loaded history. The
 *  chart filters by date range first and then downsamples
 *  (`trend-series.ts`), so this keeps every completed run by default. */
export type TrendPoint = { idx: number; wpm: number; ts: number };

/** One spoke of the skill radar: a 0..100 value for the chart. */
export type SkillAxis = {
  key: string;
  label: string;
  value: number;
};

/** Best-WPM mapped to a full Speed spoke (300 wpm = 100%). */
const SPEED_CAP = 300;
/** Best long-run WPM mapped to a full Endurance spoke (250 = 100%). */
const ENDURANCE_CAP = 250;
/** A run counts toward Endurance once it's a ~30s+ effort. Keyed off
 *  actual elapsed time (completed − started) since `mode` doesn't
 *  distinguish a time test from a words test; the small slack catches a
 *  30s test that records a hair under 30,000ms. */
const ENDURANCE_MIN_MS = 28_000;

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** A four-axis skill profile derived from completed tests. Speed
 *  normalises best WPM against 300; Endurance is the best WPM on any
 *  ~30s+ run against 250; Accuracy rescales the 80–100% band so real
 *  gaps show; Consistency is 100 minus the WPM coefficient of variation.
 *  Honest on cold start — sparse data yields low/zero spokes. */
export function deriveSkills(
  tests: readonly HistoryTest[],
  totals: ProfileTotals,
): SkillAxis[] {
  const completed = tests.filter((t) => t.wasCompleted);
  const wpms = completed.map((t) => t.wpm);

  let consistency = 0;
  if (wpms.length >= 3) {
    const mean = wpms.reduce((s, w) => s + w, 0) / wpms.length;
    if (mean > 0) {
      const variance =
        wpms.reduce((s, w) => s + (w - mean) ** 2, 0) / wpms.length;
      const cv = Math.sqrt(variance) / mean;
      consistency = clampScore(100 - cv * 250);
    }
  }

  const longBest = completed.reduce((m, t) => {
    const elapsedMs = t.completedAtMs - t.startedAtMs;
    return elapsedMs >= ENDURANCE_MIN_MS && t.wpm > m ? t.wpm : m;
  }, 0);

  return [
    {
      key: "speed",
      label: "Speed",
      value: clampScore((totals.bestWpm / SPEED_CAP) * 100),
    },
    {
      key: "accuracy",
      label: "Accuracy",
      value: clampScore(((totals.meanAccuracy - 80) / 20) * 100),
    },
    {
      key: "consistency",
      label: "Consistency",
      value: consistency,
    },
    {
      key: "endurance",
      label: "Endurance",
      value: clampScore((longBest / ENDURANCE_CAP) * 100),
    },
  ];
}

export function deriveTrend(
  tests: readonly HistoryTest[],
  limit = Number.POSITIVE_INFINITY,
): TrendPoint[] {
  const completed = tests.filter((t) => t.wasCompleted);
  // recentTests is newest-first; reverse for chronological order.
  const ordered = [...completed].reverse();
  const offset = Number.isFinite(limit)
    ? Math.max(0, ordered.length - limit)
    : 0;
  return ordered.slice(offset).map((t, i) => ({
    idx: offset + i + 1,
    wpm: t.wpm,
    ts: t.startedAtMs,
  }));
}
