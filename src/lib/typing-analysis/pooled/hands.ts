import { LEFT_FINGERS, RIGHT_FINGERS, type FingerId } from "@/lib/hand-layout";
import { keysForFinger } from "@/lib/keystrokes/key-map";
import type { Gate, Habit } from "@/types/insights";
import type { LogCell } from "@/types/typing-analysis";
import { cellMean, cellVar, median, mergeCells } from "../stats";
import { dg, type PooledTest } from "./windows";

/** "Do both hands keep up?" (spec-10 §13.9). Pools the per-finger cells
 *  (each a ln ratio to the run's own pace) over QWERTY keyboard digests
 *  on the standard hand layout with a fine clock. */

export const HANDS_MIN_KEYS = 300;
export const HANDS_MIN_PER_HAND = 100;
const HAND_MIN_DELTA = 0.07;
const HAND_Z = 3;
const FINGER_MIN = 30;
const FINGER_MIN_DELTA = Math.log(1.08);
const FINGER_Z = 3;

type HandsHabit = Extract<Habit, { kind: "hands" }>;
export type HandsResult = HandsHabit | { gate: Gate };

const supported = (t: PooledTest) => {
  const d = dg(t);
  return d.ctx.layout === "qwerty" && d.ctx.input === "keyboard" && d.ctx.std && d.q === 0 && d.fin !== null;
};

function pool(ts: readonly PooledTest[]): Map<FingerId, LogCell> {
  const out = new Map<FingerId, LogCell>();
  for (const t of ts) {
    for (const [f, c] of Object.entries(dg(t).fin ?? {}) as [FingerId, LogCell][]) {
      out.set(f, mergeCells([out.get(f) ?? [0, 0, 0], c]));
    }
  }
  return out;
}

const merged = (cells: Map<FingerId, LogCell>, fs: readonly FingerId[]) => mergeCells(fs.map((f) => cells.get(f) ?? [0, 0, 0]));
const zOf = (a: LogCell, b: LogCell) => {
  const se = Math.sqrt(cellVar(a) / a[0] + cellVar(b) / b[0]);
  return se > 0 ? (cellMean(a) - cellMean(b)) / se : 0;
};

/** `usualD` newest first. */
export function handsOf(usualD: readonly PooledTest[]): HandsResult {
  const ok = usualD.filter(supported);
  if (ok.length === 0) {
    const newest = usualD[0] ? dg(usualD[0]) : null;
    if (newest && (newest.ctx.layout === "plain" || newest.ctx.input !== "keyboard")) {
      return { kind: "hands", answer: "unsupported", ms: null, slowest: null, n: 0 };
    }
  }
  const cells = pool(ok);
  const L = merged(cells, LEFT_FINGERS);
  const R = merged(cells, RIGHT_FINGERS);
  const n = L[0] + R[0];
  if (n < HANDS_MIN_KEYS) return { gate: { have: n, need: HANDS_MIN_KEYS, unit: "keys" } };
  const fewer = Math.min(L[0], R[0]);
  if (fewer < HANDS_MIN_PER_HAND) return { gate: { have: fewer, need: HANDS_MIN_PER_HAND, unit: "keys" } };
  const P = median(ok.map((t) => dg(t).pace.P));
  const delta = cellMean(L) - cellMean(R);
  const z = zOf(L, R);
  const answer = delta >= HAND_MIN_DELTA && z >= HAND_Z ? "left-slower"
    : -delta >= HAND_MIN_DELTA && -z >= HAND_Z ? "right-slower" : "even";
  let slowest: HandsHabit["slowest"] = null;
  const candidates = [...cells].filter(([, c]) => c[0] >= FINGER_MIN).sort((a, b) => cellMean(b[1]) - cellMean(a[1]));
  const top = candidates[0];
  if (top) {
    const others = mergeCells(candidates.slice(1).map(([, c]) => c));
    const gap = cellMean(top[1]) - cellMean(others);
    if (others[0] > 0 && gap >= FINGER_MIN_DELTA && zOf(top[1], others) >= FINGER_Z) {
      slowest = { finger: top[0], keys: keysForFinger(top[0]), ms: Math.round(P * (Math.exp(gap) - 1)) };
    }
  }
  return {
    kind: "hands", answer,
    ms: answer === "even" ? null : Math.round(P * (Math.exp(Math.abs(delta)) - 1)),
    slowest, n,
  };
}
