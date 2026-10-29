import type { FingerId } from "@/lib/hand-layout";
import {
  SLICE_ORDER,
  type DigestContext,
  type GapClass,
  type LogCell,
  type RunAnalysis,
  type TestDigestV1,
} from "@/types/typing-analysis";
import { DIGEST_FREQUENT, DIGEST_MAX_BYTES, DIGEST_MAX_PAIRS, RULE_VERSION } from "./constants";
import { round } from "./stats";

/** The compact per-test digest stored in test_analyses (spec-10 §15).
 *  Privacy: the only strings are pair keys (2 characters), ctx.layout,
 *  ctx.wordlist and enum values. No word of the passage is stored. */

const r3 = (c: LogCell): LogCell => [c[0], round(c[1], 3), round(c[2], 3)];
const r3map = <K extends string>(m: Partial<Record<K, LogCell>>) => {
  const out: Partial<Record<K, LogCell>> = {};
  for (const [k, c] of Object.entries(m) as [K, LogCell][]) out[k] = r3(c);
  return out;
};
const r = (x: number | null, dp: number) => (x === null ? null : round(x, dp));

export function bytesOf(d: unknown): number {
  return new TextEncoder().encode(JSON.stringify(d)).length;
}

/** Tracked pairs (the server's 8 weakest, [] when the model is cold)
 *  first, then the 8 most frequent in this test; n ≥ 2, at most 16. */
function digestPairs(a: RunAnalysis, tracked: readonly string[]): TestDigestV1["pairs"] {
  const cells = a.cells.pairs;
  const frequent = Object.entries(cells)
    .sort((x, y) => y[1][0] - x[1][0] || (x[0] < y[0] ? -1 : 1))
    .slice(0, DIGEST_FREQUENT)
    .map(([k]) => k);
  const keys = [...new Set([...tracked, ...frequent])].filter((k) => k.length === 2 && (cells[k]?.[0] ?? 0) >= 2);
  return keys.slice(0, DIGEST_MAX_PAIRS).map((k) => {
    const c = r3(cells[k]!);
    return [k, c[0], c[1], c[2]];
  });
}

/** Requires a.slices and a.pace (the server stores nothing otherwise). */
export function buildDigest(
  a: RunAnalysis,
  extras: { acc: number; wpm: number; trackedPairs: readonly string[]; diff: number | null; ctx: DigestContext },
): TestDigestV1 {
  if (!a.slices || !a.pace) throw new Error("buildDigest needs a budget");
  const s = a.slices;
  const m = a.mistakes;
  const d: TestDigestV1 = {
    v: RULE_VERSION as 1,
    ms: a.T,
    head: a.headMs,
    wpm: round(extras.wpm, 1),
    acc: round(extras.acc, 1),
    chars: Math.round((extras.wpm * a.T) / 12000),
    keys: a.counts.keys,
    words: a.counts.words,
    sl: SLICE_ORDER.map((x) => s[x]) as TestDigestV1["sl"],
    se: a.se ? [round(a.se.fixing, 2), round(a.se.before, 2), round(a.se.inside, 2)] : null,
    pace: { P: round(a.pace.P, 1), s: round(a.pace.sigma, 3), n: a.pace.intervals, q: a.quality.pace === "good" ? "g" : "r" },
    flow: r(a.flowWpm, 1),
    n: { bd: a.counts.boundaries, pa: a.counts.pauses, in: a.counts.inWord, ca: a.counts.catches, br: a.counts.breaks },
    err: {
      n: m.count, fixed: m.fixed, rw: m.rewrites, left: m.left, extra: m.extras, ms: m.fixingMs,
      med: r(m.medianCostMs, 0), lat: r(m.detectMs, 0), nk: r(m.noticeKeys, 1), lost: m.lostChars,
    },
    iw: r(a.inWordShare, 3),
    bl: a.pauses.byLength.map((b) => [b[0], b[1]]) as TestDigestV1["bl"],
    ip: a.catches.pairs.filter(([k]) => k.length === 2).slice(0, 5).map(([k, n]) => [k, n]),
    fade: a.fade ? [round(a.fade.fromWpm, 1), round(a.fade.toWpm, 1)] : null,
    rcv: r(a.rcv, 3),
    q: a.quality.quantised ? 1 : 0,
    cls: r3map<GapClass>(a.cells.cls),
    fin: extras.ctx.std && a.cells.fin ? r3map<FingerId>(a.cells.fin) : null,
    pairs: digestPairs(a, extras.trackedPairs),
    diff: r(extras.diff, 3),
    ctx: extras.ctx,
  };
  // Size guard: shed the optional detail until it fits.
  const shed: (() => void)[] = [() => (d.pairs = []), () => (d.fin = null), () => (d.cls = {}), () => (d.ip = [])];
  for (const drop of shed) {
    if (bytesOf(d) <= DIGEST_MAX_BYTES) break;
    drop();
  }
  return d;
}

type J = Record<string, unknown>;
const isObj = (x: unknown): x is J => typeof x === "object" && x !== null && !Array.isArray(x);
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const numOrNull = (x: unknown) => x === null || num(x);
const tuple = (x: unknown, n: number) => Array.isArray(x) && x.length === n && x.every(num);
const pairKey = (k: unknown) => typeof k === "string" && k.length >= 1 && k.length <= 2;
const oneOf = (x: unknown, vals: readonly unknown[]) => vals.includes(x);
const GAP_CLASSES: readonly string[] = ["cross", "hand", "finger", "repeat", "shift", "other", "plain"];
const FINGERS: readonly string[] = ["L5", "L4", "L3", "L2", "L1", "R1", "R2", "R3", "R4", "R5"];
const cellMap = (x: unknown, keys: readonly string[]) =>
  isObj(x) && Object.entries(x).every(([k, c]) => keys.includes(k) && tuple(c, 3));
const allNum = (o: unknown, keys: readonly string[]) => isObj(o) && keys.every((k) => num(o[k]));

function ctxOk(c: unknown): boolean {
  if (!isObj(c)) return false;
  return oneOf(c.input, ["keyboard", "touch", "mixed"]) && oneOf(c.layout, ["qwerty", "plain"])
    && typeof c.std === "boolean" && (c.wordlist === null || (typeof c.wordlist === "string" && c.wordlist.length <= 64))
    && oneOf(c.fixMode, ["fix", "block", "none"]) && typeof c.suddenDeath === "boolean"
    && typeof c.drill === "boolean" && typeof c.race === "boolean"
    && (c.punctuation === null || typeof c.punctuation === "boolean");
}

/** A stored digest, or null when it isn't a valid v1 digest. Checks every
 *  field's type and every array's length; never throws. */
export function parseDigest(json: unknown): TestDigestV1 | null {
  try {
    if (!isObj(json) || json.v !== 1) return null;
    const d = json;
    if (!["ms", "head", "wpm", "acc", "chars", "keys", "words"].every((k) => num(d[k]))) return null;
    if (!tuple(d.sl, 5) || !(d.se === null || tuple(d.se, 3))) return null;
    if (!allNum(d.pace, ["P", "s", "n"]) || !oneOf((d.pace as J).q, ["g", "r"])) return null;
    if (!allNum(d.n, ["bd", "pa", "in", "ca", "br"])) return null;
    if (!allNum(d.err, ["n", "fixed", "rw", "left", "extra", "ms", "lost"])) return null;
    const err = d.err as J;
    if (![err.med, err.lat, err.nk, d.flow, d.iw, d.rcv, d.diff].every(numOrNull)) return null;
    if (!Array.isArray(d.bl) || d.bl.length !== 3 || !d.bl.every((b) => tuple(b, 2))) return null;
    if (!Array.isArray(d.ip) || d.ip.length > 5) return null;
    if (!d.ip.every((p) => Array.isArray(p) && p.length === 2 && pairKey(p[0]) && num(p[1]))) return null;
    if (!(d.fade === null || tuple(d.fade, 2)) || !oneOf(d.q, [0, 1])) return null;
    if (!cellMap(d.cls, GAP_CLASSES) || !(d.fin === null || cellMap(d.fin, FINGERS))) return null;
    if (!Array.isArray(d.pairs) || d.pairs.length > DIGEST_MAX_PAIRS) return null;
    const pairOk = (p: unknown) => Array.isArray(p) && p.length === 4 && pairKey(p[0]) && p.slice(1).every(num);
    if (!d.pairs.every(pairOk) || !ctxOk(d.ctx)) return null;
    return d as unknown as TestDigestV1;
  } catch {
    return null;
  }
}
