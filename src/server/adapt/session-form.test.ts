import { describe, expect, it } from "vitest";
import type { TestRow } from "@/types/adapt";
import {
  ACCURACY_FLOOR,
  FATIGUE_FULL,
  NO_SIGNALS,
  SESSION_GAP_MS,
  USUAL_MIN_TESTS,
  currentSession,
  runBucket,
  sessionSignals,
} from "./session-form";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function row(over: Partial<TestRow>): TestRow {
  return {
    id: "t",
    userId: "u1",
    startedAt: new Date(NOW),
    completedAt: new Date(NOW),
    mode: "training",
    durationOrWordCount: 25,
    lengthMode: "words",
    wpm: 100,
    accuracy: 97,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    rawWpm: null,
    peakWpm: null,
    avgWpm: null,
    stallWpm: null,
    consistency: null,
    wpmHistory: null,
    ...over,
  };
}

/** Newest-first runs one minute apart, starting at `newestMs`. */
function runs(
  wpms: readonly number[],
  over: Partial<TestRow> = {},
  newestMs = NOW,
): TestRow[] {
  return wpms.map((wpm, i) =>
    row({ ...over, wpm, startedAt: new Date(newestMs - i * 60_000) }),
  );
}

describe("runBucket", () => {
  it("separates mode, length unit and length", () => {
    const base = row({});
    expect(runBucket(base)).toBe(runBucket(row({})));
    expect(runBucket(row({ mode: "casual" }))).not.toBe(runBucket(base));
    expect(runBucket(row({ lengthMode: "time" }))).not.toBe(runBucket(base));
    expect(runBucket(row({ durationOrWordCount: 50 }))).not.toBe(runBucket(base));
  });
});

describe("currentSession", () => {
  it("chains tests until a gap longer than SESSION_GAP_MS", () => {
    const rows = [
      row({ startedAt: new Date(NOW) }),
      row({ startedAt: new Date(NOW - 60_000) }),
      row({ startedAt: new Date(NOW - 60_000 - SESSION_GAP_MS - 1) }),
    ];
    expect(currentSession(rows).length).toBe(2);
  });

  it("is empty when the newest test is older than the gap", () => {
    const rows = runs([100, 100]);
    expect(currentSession(rows, NOW + SESSION_GAP_MS + 1)).toEqual([]);
    expect(currentSession(rows, NOW + 1_000).length).toBe(2);
  });

  it("skips aborted runs", () => {
    const rows = runs([100, 40, 100]);
    rows[1] = { ...rows[1]!, wasCompleted: false };
    expect(currentSession(rows).map((r) => r.wpm)).toEqual([100, 100]);
  });
});

describe("sessionSignals", () => {
  it("reports nothing with fewer than two session tests", () => {
    expect(sessionSignals([])).toEqual(NO_SIGNALS);
    expect(sessionSignals(runs([100]))).toEqual(NO_SIGNALS);
  });

  it("measures fatigue within one kind of run", () => {
    const s = sessionSignals(runs([80, 85, 90, 110, 110]));
    expect(s.fatigue).toBe(1);
  });

  it("ignores a decline below the noise band", () => {
    // ~2% slower in the newer half.
    expect(sessionSignals(runs([98, 98, 98, 100, 100])).fatigue).toBe(0);
    // ~10% slower is full fatigue.
    const decline = 1 - FATIGUE_FULL;
    const s = sessionSignals(runs([100 * decline, 100 * decline, 100 * decline, 100, 100]));
    expect(s.fatigue).toBeCloseTo(1, 5);
  });

  it("reads mixed test lengths in one session as no fatigue", () => {
    const rows = runs([60, 61, 60, 90, 90]).map((r, i) => ({
      ...r,
      durationOrWordCount: i < 3 ? 60 : 15,
    }));
    expect(sessionSignals(rows).fatigue).toBe(0);
  });

  it("needs USUAL_MIN_TESTS earlier runs of the same kind for a usual speed", () => {
    const today = runs([80, 80]);
    const few = runs(Array(USUAL_MIN_TESTS - 1).fill(110), {}, NOW - DAY);
    const enough = runs(Array(USUAL_MIN_TESTS).fill(110), {}, NOW - DAY);
    expect(sessionSignals([...today, ...few]).slump).toBe(0);
    expect(sessionSignals([...today, ...enough]).slump).toBeGreaterThan(0.9);
  });

  it("judges accuracy against the user's own norm for that kind of run", () => {
    const today = runs([100, 100], { accuracy: 91 });
    const usually91 = runs([100, 100, 100, 100], { accuracy: 91 }, NOW - DAY);
    const usually97 = runs([100, 100, 100, 100], { accuracy: 97 }, NOW - DAY);
    expect(sessionSignals([...today, ...usually91]).strain).toBe(0);
    expect(sessionSignals([...today, ...usually97]).strain).toBe(1);
  });

  it("always counts accuracy under the absolute floor", () => {
    const sloppy = runs([100, 100], { accuracy: ACCURACY_FLOOR - 3 });
    expect(sessionSignals(sloppy).strain).toBeCloseTo(0.5, 5);
  });

  it("reports lift when faster than usual for the same kind of run", () => {
    const today = runs([115, 115]);
    const before = runs([100, 100, 100, 100], {}, NOW - DAY);
    const s = sessionSignals([...today, ...before]);
    expect(s.lift).toBe(1);
    expect(s.slump).toBe(0);
  });
});
