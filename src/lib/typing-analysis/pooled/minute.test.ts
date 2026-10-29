import { describe, expect, it } from "vitest";
import { SLICE_ORDER } from "@/types/typing-analysis";
import { seeded } from "../run-script-core";
import { buildPooled } from "./digest-fixtures";
import { betterDays, fillMinute, kelleyQ25, minuteOf, minuteOfDigest, recentFixing, sPerMin } from "./minute";
import { dg, fixKeyOf, windowsFor, type PooledTest } from "./windows";

const w = (ts: PooledTest[]) => windowsFor(ts, ts[0]!.bucket);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (s: Record<string, number>) => Math.round(SLICE_ORDER.reduce((a, k) => a + s[k]!, 0) * 10) / 10;

describe("sPerMin and fillMinute", () => {
  it("converts a slice to seconds a minute", () => {
    const d = dg(buildPooled({ tests: 1 })[0]!);
    expect(sPerMin(d, "fixing")).toBeCloseTo((60 * d.sl[1]) / d.ms, 12);
    expect(sum(minuteOfDigest(d))).toBe(60);
  });
  it("puts the remainder in typing and scales an overfull minute", () => {
    expect(fillMinute({ fixing: 1, before: 2, inside: 3, breaks: 4 })).toEqual({ typing: 50, fixing: 1, before: 2, inside: 3, breaks: 4 });
    const over = fillMinute({ fixing: 40, before: 40, inside: 0, breaks: 0 });
    expect(over.typing).toBe(0);
    expect(sum(over)).toBe(60);
  });
});

describe("kelleyQ25", () => {
  it("is the plain Q25 without standard errors", () => {
    expect(kelleyQ25([1, 2, 3, 4, 5], [])).toBe(2);
  });
  it("λ = 0 when the noise is at least the spread: every value becomes the mean", () => {
    expect(kelleyQ25([1, 2, 3, 4, 5], [5, 5, 5, 5, 5])).toBe(3);
  });
  it("removes the noise bias: identical true scores plus noise give about the mean", () => {
    const u = seeded(7);
    const n = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
    const xs = Array.from({ length: 30 }, () => 4 + 1.5 * n());
    const plainQ25 = kelleyQ25(xs, []);
    const shrunk = kelleyQ25(xs, xs.map(() => 1.5));
    expect(Math.abs(shrunk - mean(xs))).toBeLessThan(Math.abs(plainQ25 - mean(xs)) / 2);
  });
});

describe("minuteOf", () => {
  it("the recent minute and better days each sum to 60.0", () => {
    const m = minuteOf(w(buildPooled({ tests: 40 })), "fix");
    expect(m.status).toBe("ready");
    if (m.status !== "ready") return;
    expect(sum(m.recent)).toBe(60);
    expect(sum(m.better)).toBe(60);
    expect(m.tests).toBe(10);
  });
  it("keysPerSecond is the flow speed in keys, and catchFactor comes from pace.s", () => {
    const ts = buildPooled({ tests: 40 });
    const m = minuteOf(w(ts), "fix");
    if (m.status !== "ready") throw new Error("not ready");
    expect(m.keysPerSecond).toBeCloseTo(Math.round(((m.flowWpm! * 5) / 60) * 10) / 10, 9);
    const fixed = ts.map((t) => ({ ...t, digest: { ...dg(t), pace: { ...dg(t).pace, s: 0.2 } } }));
    const m2 = minuteOf(w(fixed), "fix");
    if (m2.status !== "ready") throw new Error("not ready");
    expect(m2.catchFactor).toBe(1.6); // e^(2.33·0.2) = 1.59, clamped up
    expect(m2.breakMs).toBeGreaterThanOrEqual(2000);
  });
  it("fixing uses the newest fix mode's digests, or all of them (suppressed) below 3", () => {
    const ts = buildPooled({ tests: 40 });
    const mixed = ts.map((t, i) => (i > 0 && i < 9 ? { ...t, digest: { ...dg(t), ctx: { ...dg(t).ctx, fixMode: "none" as const } } } : t));
    const win = w(mixed);
    expect(fixKeyOf(win)).toBe("fix");
    const r = recentFixing(win, "fix");
    expect(r.suppressed).toBe(true);
    expect(r.ts).toHaveLength(10);
    expect(recentFixing(w(ts), "fix")).toMatchObject({ suppressed: false });
    const better = betterDays(w(ts), "none");
    expect(better.fixing).toBe(0); // no "none" digests at all
  });
  it("is learning below 5 recent digests, with the newest test's minute", () => {
    const ts = buildPooled({ tests: 4 });
    const m = minuteOf(w(ts), "fix");
    expect(m).toEqual({ status: "learning", last: minuteOfDigest(dg(ts[0]!)), gate: { have: 4, need: 5, unit: "tests" } });
    expect(minuteOf(w(ts.map((t) => ({ ...t, digest: null }))), null)).toMatchObject({ last: null, gate: { have: 0 } });
  });
});
