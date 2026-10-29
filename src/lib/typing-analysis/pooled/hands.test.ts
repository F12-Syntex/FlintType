import { describe, expect, it } from "vitest";
import type { FingerId } from "@/lib/hand-layout";
import type { DigestContext, LogCell, TestDigestV1 } from "@/types/typing-analysis";
import { buildPooled } from "./digest-fixtures";
import { handsOf } from "./hands";
import { dg, type PooledTest } from "./windows";

const FINGERS: FingerId[] = ["L5", "L4", "L3", "L2", "R2", "R3", "R4", "R5"];
/** A cell of n values with mean m and sample SD sd (exact moments). */
const cell = (n: number, m: number, sd = 0.25): LogCell => [n, n * m, (n - 1) * sd * sd + n * m * m];

/** `tests` digests, each with `perFinger` gaps per finger at the given ln offsets. */
function withFin(tests: number, perFinger: number, offset: Partial<Record<FingerId, number>> = {}, ctx: Partial<DigestContext> = {}, q: 0 | 1 = 0): PooledTest[] {
  return buildPooled({ tests, seed: 8 }).map((t) => {
    const fin: TestDigestV1["fin"] = {};
    for (const f of FINGERS) fin[f] = cell(perFinger, offset[f] ?? 0);
    return { ...t, digest: { ...dg(t), q, fin, pace: { ...dg(t).pace, P: 150 }, ctx: { ...dg(t).ctx, ...ctx } } };
  });
}
const LEFT_SLOW = { L5: 0.077, L4: 0.077, L3: 0.077, L2: 0.077 };

describe("handsOf", () => {
  it("finds a left hand 8% slower over 400 keys, with the extra time per key", () => {
    const h = handsOf(withFin(10, 5, LEFT_SLOW));
    expect(h).toMatchObject({ kind: "hands", answer: "left-slower", n: 400 });
    if (!("answer" in h)) throw new Error("pending");
    expect(h.ms).toBe(Math.round(150 * (Math.exp(0.077) - 1)));
  });
  it("finds the mirror case, and even hands", () => {
    expect(handsOf(withFin(10, 5, { R2: 0.08, R3: 0.08, R4: 0.08, R5: 0.08 }))).toMatchObject({ answer: "right-slower" });
    expect(handsOf(withFin(10, 5))).toMatchObject({ answer: "even", ms: null });
  });
  it("names the slowest finger with its keys", () => {
    const h = handsOf(withFin(10, 8, { L4: 0.2 }));
    expect(h).toMatchObject({ slowest: { finger: "L4", keys: ["s", "w", "x"] } });
    expect(handsOf(withFin(10, 8, { L4: 0.03 }))).toMatchObject({ slowest: null });
  });
  it("is unsupported when the newest digest isn't QWERTY on a keyboard", () => {
    expect(handsOf(withFin(10, 5, {}, { layout: "plain" }))).toEqual({ kind: "hands", answer: "unsupported", ms: null, slowest: null, n: 0 });
    expect(handsOf(withFin(10, 5, {}, { input: "touch" }))).toMatchObject({ answer: "unsupported" });
  });
  it("waits on non-standard hands, coarse clocks and under 300 keys", () => {
    expect(handsOf(withFin(10, 5, {}, { std: false }))).toEqual({ gate: { have: 0, need: 300, unit: "keys" } });
    expect(handsOf(withFin(10, 5, {}, {}, 1))).toEqual({ gate: { have: 0, need: 300, unit: "keys" } });
    expect(handsOf(withFin(7, 5))).toEqual({ gate: { have: 280, need: 300, unit: "keys" } });
  });
  it("needs 100 keys on each hand", () => {
    const lopsided = withFin(10, 5).map((t) => ({ ...t, digest: { ...dg(t), fin: { L5: cell(4, 0), R2: cell(40, 0) } } }));
    expect(handsOf(lopsided)).toEqual({ gate: { have: 40, need: 100, unit: "keys" } });
  });
});
