import { median, senCI, theilSen } from "../stats";
import { valueOf, type Adjustment } from "./difficulty";
import { noise } from "./usual";
import type { PooledTest, Windows } from "./windows";

/** "Levelled off" (spec-10 §13.3): an equivalence test on session medians.
 *  The 28-day change, at 90% confidence, has to sit inside ±τ, half the
 *  minimal detectable change.
 *
 *  The fitted sessions are those of the last 28 days, and at least the
 *  last 8. (The spec's "last 8 sessions" span only a few days for anyone
 *  who practises daily, so the 14-day span gate could never pass; a
 *  28-day window keeps the test meaningful at any practice rate.) */

export const PLATEAU_MIN_TESTS = 30;
export const PLATEAU_MIN_SESSIONS = 10;
export const PLATEAU_MIN_DAYS = 14;
export const PLATEAU_WINDOW_DAYS = 28;
const SESSIONS_FITTED_MIN = 8;
const Z = 1.645;
const DAY = 86_400_000;

export type Plateau = { weeks: number; aroundWpm: number };

type SessionPoint = { mid: number; y: number };

function sessionPoints(ts: readonly PooledTest[], adj: Adjustment): SessionPoint[] {
  const by = new Map<number, PooledTest[]>();
  for (const t of ts) {
    const list = by.get(t.session);
    if (list) list.push(t);
    else by.set(t.session, [t]);
  }
  // Tests are newest first, so sessions come out newest first too.
  return [...by.values()].map((s) => ({
    mid: (s[0]!.startedAtMs + s[s.length - 1]!.startedAtMs) / 2 / DAY,
    y: median(s.map((t) => valueOf(adj, t))),
  }));
}

export function plateauOf(w: Windows, adj: Adjustment): Plateau | null {
  const ts = w.tests;
  if (ts.length < PLATEAU_MIN_TESTS) return null;
  if (ts[0]!.startedAtMs - ts[ts.length - 1]!.startedAtMs < PLATEAU_MIN_DAYS * DAY) return null;
  const all = sessionPoints(ts, adj);
  if (all.length < PLATEAU_MIN_SESSIONS) return null;
  const newest = all[0]!.mid;
  let fitted = all.filter((s) => s.mid >= newest - PLATEAU_WINDOW_DAYS);
  if (fitted.length < SESSIONS_FITTED_MIN) fitted = all.slice(0, SESSIONS_FITTED_MIN);
  fitted = fitted.reverse();
  const x = fitted.map((s) => s.mid);
  const y = fitted.map((s) => s.y);
  const span = x[x.length - 1]! - x[0]!;
  if (span < PLATEAU_MIN_DAYS) return null;
  const nz = noise(ts.map((t) => valueOf(adj, t)).reverse());
  if (!nz) return null;
  const tau = 0.5 * nz.mdc;
  const [lo, hi] = senCI(theilSen(x, y).slopes, x.length, Z);
  if (!(lo * PLATEAU_WINDOW_DAYS > -tau && hi * PLATEAU_WINDOW_DAYS < tau)) return null;
  return { weeks: Math.max(2, Math.round(span / 7)), aroundWpm: Math.round(median(y)) };
}
