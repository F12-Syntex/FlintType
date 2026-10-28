import type { HistoryTest } from "@/types/history";

/** Day-based derivations for the profile: the streak and the activity
 *  heatmap. All day math walks DST-immune day ordinals or calendar
 *  dates, never raw millisecond deltas. */

export type StreakStats = {
  current: number;
  longest: number;
  lastTestMs: number | null;
};

/** A DST-immune day ordinal: the integer count of UTC days for a
 *  *local* calendar date. `Date.UTC` has no DST, so consecutive local
 *  calendar dates always map to ordinals differing by exactly 1 —
 *  regardless of the local timezone or whether a DST transition fell
 *  between them. Day math (streaks, heatmap) walks ordinals, never raw
 *  millisecond deltas, which drift by ±1h across DST. */
export function dayOrdinal(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m, d) / 86_400_000);
}

/** Ordinal of the *local* calendar date a timestamp falls on. */
export function ordinalOfMs(ms: number): number {
  const d = new Date(ms);
  return dayOrdinal(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Streak counts consecutive *days* with at least one completed test.
 *  "Current" includes today if there's a test today, otherwise it
 *  counts back from the most recent activity day. */
export function deriveStreak(tests: readonly HistoryTest[]): StreakStats {
  if (tests.length === 0) return { current: 0, longest: 0, lastTestMs: null };
  const days = new Set<number>();
  let lastTestMs = 0;
  for (const t of tests) {
    if (!t.wasCompleted) continue;
    days.add(ordinalOfMs(t.startedAtMs));
    if (t.startedAtMs > lastTestMs) lastTestMs = t.startedAtMs;
  }
  const sortedDays = [...days].sort((a, b) => a - b);

  // Run-length over consecutive day ordinals (exact integer math — no
  // DST drift).
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const ord of sortedDays) {
    if (prev != null && ord - prev === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = ord;
  }

  // Current streak counts back from today (or the most recent day if
  // we haven't typed today). Decrementing an integer ordinal is exact.
  let cursor = ordinalOfMs(Date.now());
  let current = 0;
  // Allow a one-day grace if the most recent activity was yesterday.
  if (!days.has(cursor)) {
    cursor -= 1;
    if (!days.has(cursor)) {
      return { current: 0, longest, lastTestMs: lastTestMs || null };
    }
  }
  while (days.has(cursor)) {
    current += 1;
    cursor -= 1;
  }
  return { current, longest, lastTestMs: lastTestMs || null };
}

function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
  // Walk by calendar date with setDate (DST-aware: it advances exactly
  // one local day each step, unlike a fixed 86.4M ms increment which
  // can land on the wrong calendar date across a DST transition).
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - dayOfWeek - (weeks - 1) * 7);
  const todayMs = today.getTime();

  const out: DayCell[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    if (cursor.getTime() > todayMs) break;
    out.push({ date: new Date(cursor), tests: counts.get(dateKey(cursor.getTime())) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
