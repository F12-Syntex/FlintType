import type { FingerId } from "@/lib/hand-layout";
import { fingerForChar, handOf } from "@/lib/keystrokes/key-map";
import type { GapClass } from "@/types/typing-analysis";
import { CHUNK_MS } from "./constants";
import { isShifted } from "./context";
import type { Timeline } from "./timeline";

/** Gap kinds (spec-10 §7.1) and mechanical gap classes (§5.1). */

export type GapKind = "inWord" | "boundary" | "chunk" | "other";

/** §7.1. A sub-3 ms gap is a chunk first (soft-keyboard text). */
export function gapKind(tl: Timeline, k: number): GapKind {
  if (tl.dt[k]! < CHUNK_MS) return "chunk";
  const a = tl.ev[k - 1]!;
  const b = tl.ev[k]!;
  const m = tl.marks[k]!;
  if (a.wordIndex === b.wordIndex) return m.length === 0 ? "inWord" : "other";
  if (b.wordIndex !== a.wordIndex + 1) return "other";
  if (tl.capture === 1) return "boundary";
  return m.length === 1 && m[0]!.kind === "space" ? "boundary" : "other";
}

type CharInfo = { lower: string; finger: FingerId | null; shifted: boolean };

function infoOf(cache: Map<string, CharInfo>, ch: string): CharInfo {
  let x = cache.get(ch);
  if (!x) {
    const lower = ch.toLowerCase();
    x = { lower, finger: fingerForChar(lower), shifted: isShifted(ch) };
    cache.set(ch, x);
  }
  return x;
}

/** bigramCategory under DEFAULT_HAND_LAYOUT (no finger disabled), read
 *  directly: building its disabled-finger set per gap was the hot path. */
function classOf(qwerty: boolean, a: CharInfo, b: CharInfo): GapClass {
  if (b.shifted) return "shift";
  if (!qwerty) return "plain";
  if (a.lower === b.lower) return "repeat";
  if (!a.finger || !b.finger) return "other";
  if (a.finger === b.finger) return "finger";
  return handOf(a.finger) === handOf(b.finger) ? "hand" : "cross";
}

/** §5.1: the class of gap k (into ev[k]). */
export function gapClass(tl: Timeline, k: number): GapClass {
  const cache = new Map<string, CharInfo>();
  return classOf(tl.qwerty, infoOf(cache, tl.ev[k - 1]!.expected), infoOf(cache, tl.ev[k]!.expected));
}

/** Every gap's class (index 0 unused, "plain"), with the per-character
 *  lookups done once per distinct character of the run. */
export function gapClasses(tl: Timeline): GapClass[] {
  const cache = new Map<string, CharInfo>();
  const out: GapClass[] = new Array(tl.K).fill("plain");
  for (let k = 1; k < tl.K; k++) out[k] = classOf(tl.qwerty, infoOf(cache, tl.ev[k - 1]!.expected), infoOf(cache, tl.ev[k]!.expected));
  return out;
}
