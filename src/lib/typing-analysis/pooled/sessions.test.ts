import { describe, expect, it } from "vitest";
import type { TestSummaryRow } from "@/types/insights";
import { seeded } from "../run-script-core";
import { fatigueOf, sessionSignals, warmUpOf } from "./sessions";
import { toPooled } from "./windows";

const T0 = 1_790_000_000_000;
const MIN = 60_000;
const DAY = 86_400_000;
type Spec = { wpm: number; acc?: number; length?: number; gapMin?: number };

/** Rows from sessions, oldest first: one session a day, tests `gapMin`
 *  apart (default 4 minutes). */
function rows(sessions: Spec[][]): TestSummaryRow[] {
  const out: TestSummaryRow[] = [];
  sessions.forEach((s, d) => s.forEach((t, k) => out.push({
    id: `s${d}t${k}`, startedAt: new Date(T0 + d * DAY + k * (t.gapMin ?? 4) * MIN), mode: "casual", lengthMode: "words",
    durationOrWordCount: t.length ?? 25, wpm: t.wpm, accuracy: t.acc ?? 96, errorCount: 1, wasCompleted: true,
  })));
  return out.reverse();
}
const signals = (s: Spec[][], W = 70) => sessionSignals(toPooled(rows(s), new Map(), new Map()), W);
const noise = (seed: number) => {
  const u = seeded(seed);
  return () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
};

describe("warm-up", () => {
  it("finds a 5% slower first test in 8 of 9 sessions", () => {
    const s = Array.from({ length: 9 }, (_, i) => [{ wpm: i === 4 ? 71 : 66.5 }, { wpm: 70 }, { wpm: 70.5 }, { wpm: 69.5 }]);
    const r = signals(s).warmUp;
    expect(r).toMatchObject({ found: true, n: 9 });
    expect("wpm" in r && r.wpm).toBeGreaterThanOrEqual(3);
  });
  it("needs 8 sessions of 2 or more tests", () => {
    const s = [...Array.from({ length: 7 }, () => [{ wpm: 60 }, { wpm: 70 }]), [{ wpm: 60 }]];
    expect(signals(s).warmUp).toEqual({ gate: { have: 7, need: 8, unit: "sessions" } });
    expect(signals(s).sessionsWithTwo).toBe(7);
  });
  it("is not found at random in at least 90% of typists", () => {
    let found = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const n = noise(seed);
      const s = Array.from({ length: 12 }, () => Array.from({ length: 2 + (seed % 4) }, () => ({ wpm: 70 + 3 * n() })));
      const r = signals(s).warmUp;
      if ("found" in r && r.found) found++;
    }
    expect(found).toBeLessThanOrEqual(10);
  });
  it("isn't inflated when a slow first test makes people keep going", () => {
    let found = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const n = noise(seed + 500);
      const s = Array.from({ length: 12 }, () => {
        const first = 70 + 3 * n();
        const more = first < 70 ? 5 : 1;
        return [{ wpm: first }, ...Array.from({ length: more }, () => ({ wpm: 70 + 3 * n() }))];
      });
      const r = signals(s).warmUp;
      if ("found" in r && r.found) found++;
    }
    expect(found).toBeLessThanOrEqual(10);
  });
  it("judges each first test against its own bucket", () => {
    // First tests are in a slower bucket (50 words at 60), never slower for it.
    const s = Array.from({ length: 9 }, () => [{ wpm: 60, length: 50 }, { wpm: 70 }, { wpm: 70 }]);
    expect(signals(s).warmUp).toMatchObject({ found: false });
  });
});

describe("fatigue", () => {
  const long = (lateAcc: number, n = 12) => Array.from({ length: n }, (_, k) => ({ wpm: 70, acc: k * 4 >= 20 ? lateAcc : 97 }));
  it("finds accuracy 2 points lower after 20 minutes", () => {
    const r = signals(Array.from({ length: 7 }, () => long(95)));
    expect(r.fatigue).toEqual({ found: true, accuracyDrop: 2, n: 7 });
  });
  it("needs 6 sessions that run past 20 minutes", () => {
    expect(signals(Array.from({ length: 5 }, () => long(95))).fatigue).toEqual({ gate: { have: 5, need: 6, unit: "sessions" } });
    expect(signals(Array.from({ length: 9 }, () => long(95, 5))).fatigue).toMatchObject({ gate: { have: 0 } });
  });
  it("compares accuracy within each bucket, so a 90% bucket late in a session isn't fatigue", () => {
    const mixed = Array.from({ length: 8 }, () => Array.from({ length: 12 }, (_, k) =>
      (k * 4 >= 20 ? { wpm: 70, acc: 90, length: 50 } : { wpm: 70, acc: 97 })));
    // Enough history in the 50-word bucket for its usual to be 90%.
    expect(signals(mixed).fatigue).toMatchObject({ found: false });
  });
  it("leaves out each session's last test", () => {
    // Only the last test is late, and it is bad: no session qualifies.
    const s = Array.from({ length: 8 }, () => [...Array.from({ length: 5 }, () => ({ wpm: 70, acc: 97 })), { wpm: 70, acc: 80, gapMin: 0 }]);
    const lastLate = s.map((x) => x.map((t, k) => ({ ...t, gapMin: k === 5 ? 5 : 1 })));
    expect(signals(lastLate).fatigue).toMatchObject({ gate: { have: 0 } });
  });
  it("works from scored sessions directly", () => {
    expect(fatigueOf([])).toEqual({ gate: { have: 0, need: 6, unit: "sessions" } });
    expect(warmUpOf([], 70)).toEqual({ gate: { have: 0, need: 8, unit: "sessions" } });
  });
});
