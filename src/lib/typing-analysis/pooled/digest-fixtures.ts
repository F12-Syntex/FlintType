import type { FingerId } from "@/lib/hand-layout";
import { runBucketKey } from "@/lib/test-bucket";
import type { TestMode } from "@/types/adapt";
import type { TestSummaryRow } from "@/types/insights";
import type { DigestContext, FixMode, LogCell, RunLengthMode, TestDigestV1 } from "@/types/typing-analysis";
import { seeded } from "../run-script-core";
import { clamp, round } from "../stats";
import { toPooled, type AnalysisIndex, type PooledTest } from "./windows";

/** Test fixture: deterministic synthetic users for the pooled models
 *  (spec-10 §16.3). The default is the realistic stationary user of
 *  §13.7: zero-inflated friction with a stored jackknife se, mistakes as
 *  a Poisson count each costing a log-normal time (so fixing is 0 in
 *  about 35% of tests), and tests in sessions of 1–6, 1–3 sessions a day.
 *  Speed, each friction slice, accuracy and the mistake rate each get a
 *  session effect and an AR(1) day effect (φ = 0.5), both with SD 0.5 ×
 *  that metric's test-to-test SD. Every digest passes parseDigest.
 *  Seeded; never reads the clock. */

type Friction = "before" | "inside" | "breaks";
export type Shift = {
  wpm?: number; before?: number; inside?: number; mistakesPerMin?: number; costMs?: number;
  /** × pace (and every pair time): a uniform speed change. */
  paceScale?: number; accuracy?: number;
  /** × one pair's time relative to pace. */
  pairScale?: Record<string, number>;
};
export type FixtureOptions = {
  tests?: number; wpm?: number; noiseSd?: number;
  /** Session sizes, oldest first (default: random 1–6). */
  sessions?: number[]; perDay?: [number, number];
  /** Days from one practice day to the next (default: 1, sometimes 2). */
  everyDays?: number;
  /** Mean s/min of the non-zero values. */
  slices?: Partial<Record<Friction, number>>; zeroShare?: Partial<Record<Friction, number>>;
  sessionSd?: number; dayAr?: number; mistakesPerMin?: number; costMs?: number;
  /** wpm gained per day (a learning user). */
  drift?: number;
  fixMode?: FixMode; diff?: number | null; iw?: number; seed?: number;
  mode?: TestMode; lengthMode?: RunLengthMode; length?: number; touch?: boolean;
  startMs?: number; idPrefix?: string; gapMin?: number;
  accuracy?: number; accSd?: number;
  /** Applied to the newest `recentN` tests (default 10). */
  recent?: Shift; recentN?: number;
  /** ln offset of each finger's time (a slow finger or hand). */
  fin?: Partial<Record<FingerId, number>>;
  /** Mean to/from speed ratio of the fade, for tests of 30 s or more. */
  fade?: number;
  /** × the pause rate before long words (≥ 8 letters). */
  longWordPause?: number;
  ctx?: Partial<DigestContext>;
};

export const FIXTURE_T0 = 1_780_000_000_000;
const DAY = 86_400_000;
const PAIRS = ["th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es"] as const;
const FINGERS: readonly FingerId[] = ["L5", "L4", "L3", "L2", "R2", "R3", "R4", "R5"];
const FIN_SHARE = [0.08, 0.1, 0.16, 0.2, 0.2, 0.12, 0.08, 0.06];
const GAP_SD = 0.25;
/** Log SD of a friction slice from test to test (and of the mistake rate's
 *  session and day effects, which are 0.5 × it). */
const FRIC_SD = 0.6;

export function gen(seed: number) {
  const u = seeded(seed * 2654435761 + 97);
  const normal = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const int = (lo: number, hi: number) => lo + Math.floor(u() * (hi - lo + 1));
  const poisson = (l: number) => {
    const floor = Math.exp(-l);
    let k = -1;
    for (let p = 1; p > floor && k < 500; k++) p *= u();
    return Math.max(0, k);
  };
  return { u, normal, int, poisson };
}

/** A cell of n log-values with mean m and spread sd, sampled as a sample. */
function cellLike(g: ReturnType<typeof gen>, n: number, m: number, sd: number): LogCell {
  const mean = m + (sd / Math.sqrt(n)) * g.normal();
  const v = n > 1 ? sd * sd * Math.max(0.2, 1 + Math.sqrt(2 / (n - 1)) * g.normal()) : 0;
  return [n, round(n * mean, 3), round((n - 1) * v + n * mean * mean, 3)];
}

/** Start times, oldest first: sessions of the given sizes, 1–3 a day. */
function schedule(g: ReturnType<typeof gen>, o: FixtureOptions, n: number): { at: number; day: number; sess: number }[] {
  const out: { at: number; day: number; sess: number }[] = [];
  const [lo, hi] = o.perDay ?? [1, 3];
  let day = 0;
  let sess = 0;
  while (out.length < n) {
    const today = g.int(lo, hi);
    for (let s = 0; s < today && out.length < n; s++, sess++) {
      const size = o.sessions ? (o.sessions[sess] ?? o.sessions[o.sessions.length - 1]!) : g.int(1, 6);
      const start = (o.startMs ?? FIXTURE_T0) + day * DAY + (8 + s * 5) * 3_600_000;
      for (let k = 0; k < size && out.length < n; k++) out.push({ at: start + k * (o.gapMin ?? 3) * 60_000 + g.int(0, 30) * 1000, day, sess });
    }
    day += o.everyDays ?? (g.u() < 0.25 ? 2 : 1);
  }
  return out;
}

export type FixtureData = { rows: TestSummaryRow[]; index: AnalysisIndex; digests: Map<string, TestDigestV1> };

/** An AR(1) day series with stationary SD `sd`, grown on demand by day. */
export function arDays(g: ReturnType<typeof gen>, phi: number, sd: number): (day: number) => number {
  const xs: number[] = [];
  return (day) => {
    while (xs.length <= day) xs.push(phi * (xs[xs.length - 1] ?? 0) + sd * Math.sqrt(1 - phi * phi) * g.normal());
    return xs[day]!;
  };
}

export function fixtureData(o: FixtureOptions = {}): FixtureData {
  const g = gen(o.seed ?? 1);
  const n = o.tests ?? 40;
  const sd = o.noiseSd ?? 3;
  const phi = o.dayAr ?? 0.5;
  const sessSd = (o.sessionSd ?? 0.5) * sd;
  const lengthMode = o.lengthMode ?? "words";
  const length = o.length ?? 25;
  const mode = o.mode ?? "casual";
  const fixMode = o.fixMode ?? "fix";
  const bucket = runBucketKey({ mode, lengthMode, length }, o.touch === true);
  const times = schedule(g, o, n);
  const recentFrom = n - (o.recentN ?? 10);
  const dayFx: number[] = [];
  const sessFx = new Map<number, number>();
  const rows: TestSummaryRow[] = [];
  const index: AnalysisIndex = new Map();
  const digests = new Map<string, TestDigestV1>();
  const ratio = new Map(PAIRS.map((p) => [p, Math.exp(0.15 * g.normal())]));
  const finFx = new Map(FINGERS.map((f) => [f, (o.fin?.[f] ?? 0) + 0.02 * g.normal()]));
  // Session and day effects other than speed's draw from their own stream.
  const gx = gen((o.seed ?? 1) + 7919);
  const half = FRIC_SD / 2;
  const accSd = o.accSd ?? 1.5;
  const day = {
    before: arDays(gx, phi, half), inside: arDays(gx, phi, half), breaks: arDays(gx, phi, half),
    acc: arDays(gx, phi, 0.5 * accSd), mistakes: arDays(gx, phi, half),
  };
  const sessX = new Map<number, Record<Friction | "mistakes", number>>();
  times.forEach((when, i) => {
    const sh: Shift = i >= recentFrom ? (o.recent ?? {}) : {};
    while (dayFx.length <= when.day) dayFx.push(phi * (dayFx[dayFx.length - 1] ?? 0) + 0.5 * sd * Math.sqrt(1 - phi * phi) * g.normal());
    if (!sessFx.has(when.sess)) sessFx.set(when.sess, g.normal());
    const zs = sessFx.get(when.sess)!;
    if (!sessX.has(when.sess)) sessX.set(when.sess, { before: gx.normal(), inside: gx.normal(), breaks: gx.normal(), mistakes: gx.normal() });
    const zx = sessX.get(when.sess)!;
    const wpm = Math.max(10, (o.wpm ?? 70) + (sh.wpm ?? 0) + (o.drift ?? 0) * when.day + dayFx[when.day]! + sessSd * zs + sd * g.normal());
    const timed = lengthMode === "time";
    const T = timed ? length * 1000 : Math.round(((lengthMode === "words" ? length : 30) * 5.6 * 12000) / wpm);
    const keys = Math.round(timed ? (wpm * T) / 12000 : (T * wpm) / 12000);
    const words = Math.max(2, Math.round(keys / 5.6));
    const fr = (k: Friction, def: number, zero: number) => {
      if (g.u() < (o.zeroShare?.[k] ?? zero)) return 0;
      const mean = (o.slices?.[k] ?? def) + (k === "breaks" ? 0 : (sh[k] ?? 0));
      const fx = half * zx[k] + day[k](when.day) - half * half;
      return Math.max(0, mean * Math.exp(FRIC_SD * g.normal() + fx - 0.18));
    };
    const before = fr("before", 4, 0.4);
    const inside = fr("inside", 2, 0.5);
    const breaks = fr("breaks", 6, 0.85);
    const rateFx = Math.exp(half * zx.mistakes + day.mistakes(when.day) - half * half);
    const mistakes = g.poisson(((o.mistakesPerMin ?? 2.7) + (sh.mistakesPerMin ?? 0)) * rateFx * (T / 60000));
    const costs = Array.from({ length: mistakes }, () => ((o.costMs ?? 900) + (sh.costMs ?? 0)) * Math.exp(0.4 * g.normal() - 0.08));
    let fixingMs = costs.reduce((s, c) => s + c, 0);
    let fric = [fixingMs, (before * T) / 60, (inside * T) / 60, (breaks * T) / 60];
    const total = fric.reduce((s, v) => s + v, 0);
    if (total > 0.8 * T) fric = fric.map((v) => (v * 0.8 * T) / total);
    const sl = fric.map((v) => Math.round(v));
    fixingMs = sl[0]!;
    const typing = T - sl.reduce((s, v) => s + v, 0);
    const flow = (wpm * T) / typing;
    const P = (12000 / flow) * 0.92 * (sh.paceScale ?? 1);
    const seFor = (v: number) => (v > 0 ? round(v * (0.4 + 0.3 * g.u()), 2) : 0);
    const bd = words - 1;
    const pa = Math.min(bd, before > 0 ? Math.max(1, Math.round(sl[1]! / (2 * P))) : 0);
    const ca = inside > 0 ? Math.max(1, Math.round(sl[2]! / P)) : 0;
    const bands: [number, number] = [Math.round(bd * 0.5), Math.round(bd * 0.15)];
    const mid = bd - bands[0] - bands[1];
    const lw = o.longWordPause ?? 1;
    const rate = pa / Math.max(1, bands[0] + mid + lw * bands[1]);
    const paL = Math.min(bands[1], Math.round(rate * lw * bands[1]));
    const paS = Math.min(bands[0], Math.round(rate * bands[0]));
    const paM = Math.min(mid, Math.max(0, pa - paS - paL));
    const pairsCells: TestDigestV1["pairs"] = PAIRS.map((p) => {
      const c = cellLike(g, g.int(2, 6), Math.log(P * ratio.get(p)! * (sh.pairScale?.[p] ?? 1)) + 0.05 * g.normal(), GAP_SD);
      return [p, c[0], c[1], c[2]];
    });
    const ip: [string, number][] = [];
    for (let c = 0; c < ca && ip.length < 5; c++) {
      const p = PAIRS[g.int(0, PAIRS.length - 1)]!;
      const hit = ip.find((x) => x[0] === p);
      if (hit) hit[1]++;
      else ip.push([p, 1]);
    }
    const fin: Partial<Record<FingerId, LogCell>> = {};
    FINGERS.forEach((f, k) => (fin[f] = cellLike(g, Math.max(2, Math.round((keys - words) * FIN_SHARE[k]!)), finFx.get(f)!, GAP_SD)));
    const acc = round(clamp((o.accuracy ?? 96) + (sh.accuracy ?? 0) + day.acc(when.day) + accSd * (0.5 * zs + g.normal()), 70, 100), 1);
    const fixed = fixMode === "none" ? 0 : mistakes;
    // As the engine: no fix means no cost, latency or notice figures.
    const costed = fixed > 0;
    const id = `${o.idPrefix ?? "t"}${String(i).padStart(4, "0")}`;
    const diff = o.diff === undefined || o.diff === null ? null : round(o.diff * Math.exp(0.08 * g.normal()), 3);
    const d: TestDigestV1 = {
      v: 1, ms: T, head: 0, wpm: round(wpm, 1), acc, chars: Math.round((wpm * T) / 12000), keys, words,
      sl: [typing, sl[0]!, sl[1]!, sl[2]!, sl[3]!],
      se: [seFor((60 * sl[0]!) / T), seFor(before), seFor(inside)],
      pace: { P: round(P, 1), s: round(0.22 + 0.08 * g.u(), 3), n: keys - words, q: "g" },
      flow: round(flow, 1),
      n: { bd, pa: paS + paM + paL, in: keys - words, ca, br: breaks > 0 ? 1 : 0 },
      err: { n: mistakes, fixed, rw: 0, left: mistakes - fixed, extra: 0, ms: fixingMs,
        med: costed ? Math.round([...costs].sort((a, b) => a - b)[Math.floor(mistakes / 2)]!) : null,
        lat: costed ? 300 : null, nk: costed ? round(0.5 + g.u(), 1) : null, lost: 0 },
      iw: round(clamp((o.iw ?? 0.6) + 0.03 * g.normal(), 0.05, 0.95), 3),
      bl: [[bands[0], paS], [mid, paM], [bands[1], paL]],
      ip,
      fade: T >= 30_000 ? [round(wpm * 1.02, 1), round(wpm * 1.02 * (o.fade ?? 1) * Math.exp(0.04 * g.normal()), 1)] : null,
      rcv: 0.3, q: 0, cls: {}, fin, pairs: pairsCells, diff,
      ctx: { input: o.touch ? "touch" : "keyboard", layout: "qwerty", std: true, wordlist: "english", fixMode,
        suddenDeath: false, drill: false, race: mode === "race", punctuation: false, ...o.ctx },
    };
    rows.push({ id, startedAt: new Date(when.at), mode, lengthMode, durationOrWordCount: length, wpm: round(wpm, 1),
      accuracy: acc, errorCount: mistakes, wasCompleted: true });
    index.set(id, { bucket, diff });
    digests.set(id, d);
  });
  rows.reverse();
  return { rows, index, digests };
}

/** The fixture as pooled tests, newest first (sessions from toPooled). */
export function buildPooled(o: FixtureOptions = {}): PooledTest[] {
  const f = fixtureData(o);
  return toPooled(f.rows, f.index, f.digests);
}

/** Several fixtures merged into one user's data (e.g. two buckets). */
export function mergeFixtures(parts: readonly FixtureData[]): FixtureData {
  const rows = parts.flatMap((p) => p.rows).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  return {
    rows,
    index: new Map(parts.flatMap((p) => [...p.index])),
    digests: new Map(parts.flatMap((p) => [...p.digests])),
  };
}

/** The time just after the newest test (a natural "now" for a fixture). */
export const nowAfter = (ts: readonly { startedAtMs: number }[]): number => (ts[0]?.startedAtMs ?? FIXTURE_T0) + 60_000;
