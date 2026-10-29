import type { RunAnalysis } from "@/types/typing-analysis";
import type { Budget } from "./budget";
import { FADE_MIN_DROP, FADE_MIN_MS, FADE_RHO_MAX, FADE_SHORT_DROP, FADE_WINDOW_MS, FADE_Z, MAX_DURATION_MS } from "./constants";
import { clamp, mad, median, round } from "./stats";
import type { Timeline } from "./timeline";

/** The fade (spec-10 §8.3): 10 s windows over [head, T], each a rate of
 *  correct keys and completed word boundaries per minute of active time.
 *
 *  Two changes from the spec, both so a fade means the typing slowed:
 *  - A break is an interval, [gap end − excess, gap end] (the tail's is
 *    [T − excess, T]). Its overlap is taken out of every window it
 *    touches, and a window left with under 5 s of active time is dropped.
 *    The spec took the whole excess from the window the gap ends in, so a
 *    long break left windows of idle time with a rate of 0.
 *  - The drop must be FADE_Z standard errors at every window count. The
 *    SE comes from the run's own word-to-word noise: each word's time
 *    against its window's time per credit, pooled over the windows and
 *    widened for the lag-1 autocorrelation of word times. With 6 or more
 *    windows the spec's window-spread SE still applies when it is larger.
 *    The spec's rule below 6 windows compared two single windows with no
 *    noise estimate and reported a fade on 8–19% of steady 30 s and 60 s
 *    runs. */

type Win = { s: number; e: number; off: number; keys: number; segD: number[]; segC: number[] };
type Kept = { rate: number; se: number };

function windowsOf(tl: Timeline): Win[] {
  const out: Win[] = [];
  for (let s = tl.head; s < tl.T; s += FADE_WINDOW_MS) {
    const e = Math.min(tl.T, s + FADE_WINDOW_MS);
    if (e - s < FADE_WINDOW_MS / 2 && out.length > 0) break;
    out.push({ s, e, off: 0, keys: 0, segD: [], segC: [] });
  }
  return out;
}

/** The window holding time t, or −1. */
function winAt(wins: readonly Win[], head: number, t: number): number {
  if (t < head || wins.length === 0) return -1;
  const i = Math.floor((t - head) / FADE_WINDOW_MS);
  if (i < wins.length) return i;
  return t <= wins[wins.length - 1]!.e ? wins.length - 1 : -1;
}

/** Takes every break's interval out of the windows it overlaps, and
 *  returns the break excess per gap index (K = the tail). */
function removeBreaks(tl: Timeline, budget: Budget, wins: Win[]): Float64Array {
  const brkAt = new Float64Array(tl.K + 1);
  for (const u of budget.units) {
    if (!u.brk || u.kind === "head") continue;
    brkAt[u.k] = brkAt[u.k]! + u.breaks;
    const end = u.k < tl.K ? tl.ev[u.k]!.t : tl.T;
    const start = end - u.breaks;
    const i0 = Math.max(0, Math.floor((start - tl.head) / FADE_WINDOW_MS));
    const i1 = Math.min(wins.length - 1, Math.floor((end - tl.head) / FADE_WINDOW_MS));
    for (let i = i0; i <= i1; i++) {
      const w = wins[i]!;
      w.off += Math.max(0, Math.min(end, w.e) - Math.max(start, w.s));
    }
  }
  return brkAt;
}

/** Credits each key to its window, and builds word segments (a visit to
 *  a word: its keys and the gaps before them, breaks excluded), each
 *  placed in the window of its last key. */
function credit(tl: Timeline, wins: Win[], brkAt: Float64Array): void {
  const { ev, K } = tl;
  let d = 0;
  let c = 0;
  let last = -1;
  const closeSeg = () => {
    const i = last >= 0 ? winAt(wins, tl.head, ev[last]!.t) : -1;
    if (i >= 0) {
      wins[i]!.segD.push(d);
      wins[i]!.segC.push(c);
    }
    d = 0;
    c = 0;
  };
  for (let k = 0; k < K; k++) {
    const e = ev[k]!;
    if (k > 0 && e.wordIndex !== ev[k - 1]!.wordIndex) closeSeg();
    const cr = (e.correct ? 1 : 0) + (k > 0 && e.wordIndex > ev[k - 1]!.wordIndex ? 1 : 0);
    const i = winAt(wins, tl.head, e.t);
    if (i >= 0) wins[i]!.keys += cr;
    if (k > 0) d += Math.max(0, Math.max(0, tl.dt[k]!) - brkAt[k]!);
    c += cr;
    last = k;
  }
  closeSeg();
}

/** Pooled per-segment residual variance (each segment's time against its
 *  window's time per credit) and the AR(1) design effect, or null when
 *  there are too few segments to estimate them. */
function noiseOf(wins: readonly Win[]): { s2: number; deff: number } | null {
  let ss = 0;
  let df = 0;
  let lag = 0;
  for (const w of wins) {
    const m = w.segD.length;
    const D = w.segD.reduce((a, x) => a + x, 0);
    const C = w.segC.reduce((a, x) => a + x, 0);
    if (m < 2 || C <= 0) continue;
    const res = w.segD.map((x, j) => x - (D / C) * w.segC[j]!);
    for (let j = 0; j < m; j++) {
      ss += res[j]! ** 2;
      if (j > 0) lag += res[j]! * res[j - 1]!;
    }
    df += m - 1;
  }
  if (df < 1) return null;
  if (ss <= 0) return { s2: 0, deff: 1 };
  const r1 = clamp(lag / ss, 0, FADE_RHO_MAX);
  return { s2: ss / df, deff: (1 + r1) / (1 - r1) };
}

export function fadeOf(tl: Timeline, budget: Budget): RunAnalysis["fade"] {
  // The upper bound keeps the window loop bounded (usableInput holds it too).
  if (tl.T < FADE_MIN_MS || tl.T > MAX_DURATION_MS) return null;
  const wins = windowsOf(tl);
  credit(tl, wins, removeBreaks(tl, budget, wins));
  const noise = noiseOf(wins);
  const kept: Kept[] = [];
  for (const w of wins) {
    const active = w.e - w.s - w.off;
    if (active < FADE_WINDOW_MS / 2) continue;
    const rate = (12000 * w.keys) / active;
    const D = w.segD.reduce((a, x) => a + x, 0);
    const se = noise && D > 0 ? (rate * Math.sqrt(w.segD.length * noise.s2 * noise.deff)) / D : Infinity;
    kept.push({ rate, se });
  }
  if (kept.length < 3) return null;
  const ws = kept.length >= 4 ? kept.slice(1) : kept;
  const n = ws.length;
  const n1 = Math.max(1, Math.floor(n / 3));
  const head = ws.slice(0, n1);
  const tail = ws.slice(n - n1);
  const from = median(head.map((x) => x.rate));
  const to = median(tail.map((x) => x.rate));
  // SE of the median of n1 windows: the mean's SE, × 1.2533 from 3 windows.
  const groupSE = (g: Kept[]) => ((g.length >= 3 ? 1.2533 : 1) * Math.sqrt(g.reduce((a, x) => a + x.se ** 2, 0))) / g.length;
  let se = Math.hypot(groupSE(head), groupSE(tail));
  if (n >= 6) se = Math.max(se, 1.2533 * 1.4826 * mad(ws.map((x) => x.rate)) * Math.sqrt(2 / n1));
  const significant = to <= from * (1 - FADE_MIN_DROP) && to - from <= -FADE_Z * se
    && (n >= 6 || from - to >= FADE_SHORT_DROP * from);
  return { fromWpm: round(from, 1), toWpm: round(to, 1), lastSeconds: n1 * 10, significant };
}
