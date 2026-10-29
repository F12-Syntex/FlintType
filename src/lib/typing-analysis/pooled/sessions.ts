import type { Gate } from "@/types/insights";
import { median, round, signTestP } from "../stats";
import { difficultyAdjustment, valueOf } from "./difficulty";
import { eligible, windowsFor, type PooledTest } from "./windows";

/** Warm-up and fatigue (spec-10 §13.8). Sessions span every bucket, but
 *  each test is judged only against its own bucket's usual: speed as
 *  ln(x / usual), accuracy in points against the usual accuracy. */

export const WARMUP_MIN_SESSIONS = 8;
export const FATIGUE_MIN_SESSIONS = 6;
const WARMUP_DROP = -0.02;
const FATIGUE_DROP = -1;
const SIGN_P = 0.05;
const LATE_MS = 20 * 60_000;

export type WarmUp = { found: boolean; wpm: number | null; n: number } | { gate: Gate };
export type Fatigue = { found: boolean; accuracyDrop: number | null; n: number } | { gate: Gate };

export type Scored = { t: PooledTest; y: number; e: number };

/** Each eligible test against its bucket's usual window. */
function scoreTests(ts: readonly PooledTest[]): Map<string, Scored> {
  const out = new Map<string, Scored>();
  const buckets = new Set(ts.filter(eligible).map((t) => t.bucket));
  for (const b of buckets) {
    const w = windowsFor(ts, b);
    const adj = difficultyAdjustment(w);
    const usualX = median(w.usual.map((t) => valueOf(adj, t)));
    const usualAcc = median(w.usual.map((t) => t.accuracy));
    for (const t of w.tests) {
      const x = valueOf(adj, t);
      out.set(t.id, { t, y: usualX > 0 && x > 0 ? Math.log(x / usualX) : 0, e: t.accuracy - usualAcc });
    }
  }
  return out;
}

/** Sessions over every eligible test, each in chronological order. */
function sessionsOf(ts: readonly PooledTest[], scored: Map<string, Scored>): Scored[][] {
  const by = new Map<number, Scored[]>();
  for (const t of ts) {
    const s = scored.get(t.id);
    if (!s || t.session < 0) continue;
    const list = by.get(t.session);
    if (list) list.push(s);
    else by.set(t.session, [s]);
  }
  return [...by.values()].map((s) => s.sort((a, b) => a.t.startedAtMs - b.t.startedAtMs));
}

export function warmUpOf(sessions: readonly Scored[][], W: number): WarmUp {
  const firsts = sessions.filter((s) => s.length >= 2).map((s) => s[0]!.y);
  const S = firsts.length;
  if (S < WARMUP_MIN_SESSIONS) return { gate: { have: S, need: WARMUP_MIN_SESSIONS, unit: "sessions" } };
  const m = median(firsts);
  const found = m <= WARMUP_DROP && signTestP(firsts.filter((w) => w < 0).length, S) < SIGN_P;
  return { found, wpm: found ? Math.round(W * (1 - Math.exp(m))) : null, n: S };
}

export function fatigueOf(sessions: readonly Scored[][]): Fatigue {
  const drops: number[] = [];
  for (const s of sessions) {
    const kept = s.slice(0, -1);
    if (kept.length === 0) continue;
    const start = kept[0]!.t.startedAtMs;
    const early = kept.filter((x) => x.t.startedAtMs - start < LATE_MS);
    const late = kept.filter((x) => x.t.startedAtMs - start >= LATE_MS);
    if (early.length < 2 || late.length < 1) continue;
    drops.push(median(late.map((x) => x.e)) - median(early.slice(1, 4).map((x) => x.e)));
  }
  const S = drops.length;
  if (S < FATIGUE_MIN_SESSIONS) return { gate: { have: S, need: FATIGUE_MIN_SESSIONS, unit: "sessions" } };
  const m = median(drops);
  const found = m <= FATIGUE_DROP && signTestP(drops.filter((a) => a < 0).length, S) < SIGN_P;
  return { found, accuracyDrop: found ? round(Math.abs(m), 1) : null, n: S };
}

/** Warm-up, fatigue and the number of sessions with 2 or more tests. */
export function sessionSignals(ts: readonly PooledTest[], W: number): { warmUp: WarmUp; fatigue: Fatigue; sessionsWithTwo: number } {
  const sessions = sessionsOf(ts, scoreTests(ts));
  return {
    warmUp: warmUpOf(sessions, W),
    fatigue: fatigueOf(sessions),
    sessionsWithTwo: sessions.filter((s) => s.length >= 2).length,
  };
}
