import { describe, expect, it } from "vitest";
import type { TestRow } from "@/types/adapt";
import {
  ACCURACY_SPAN,
  ACCURACY_TARGET,
  CHALLENGE_HIGH,
  CHALLENGE_HIGH_FRESH,
  CHALLENGE_HIGH_TIRED,
  CHALLENGE_LOW,
  CONCENTRATION_FRESH,
  CONCENTRATION_TIRED,
  FATIGUE_MIN_MULT,
  FORM_MAX,
  NEUTRAL_PACING,
  SESSION_GAP_MS,
  WEAKNESS_CONCENTRATION,
  currentSession,
  fatigueDampener,
  inChallengeBand,
  pacingForForm,
  pacingFrom,
} from "./pacing";

function makeTestRow(over: Partial<TestRow>): TestRow {
  return {
    id: "t",
    userId: "u1",
    startedAt: new Date(),
    completedAt: new Date(),
    mode: "training",
    durationOrWordCount: 25,
    lengthMode: null,
    wpm: 100,
    accuracy: 98,
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

describe("fatigueDampener", () => {
  it("returns 1 with too few tests", () => {
    expect(fatigueDampener([])).toBe(1);
    expect(fatigueDampener([makeTestRow({ wpm: 100 })])).toBe(1);
  });

  it("returns 1 when WPM is flat or rising", () => {
    const flat = Array.from({ length: 5 }, () => makeTestRow({ wpm: 100 }));
    expect(fatigueDampener(flat)).toBe(1);
    // Rising: newer (index 0) is faster than older.
    const rising = [
      makeTestRow({ wpm: 110 }),
      makeTestRow({ wpm: 108 }),
      makeTestRow({ wpm: 105 }),
      makeTestRow({ wpm: 100 }),
      makeTestRow({ wpm: 95 }),
    ];
    expect(fatigueDampener(rising)).toBe(1);
  });

  it("clamps to FATIGUE_MIN_MULT for severe declines", () => {
    // Older average ~120, newer average ~80 → 33% decline → clamps.
    const decline = [
      makeTestRow({ wpm: 70 }),
      makeTestRow({ wpm: 80 }),
      makeTestRow({ wpm: 90 }),
      makeTestRow({ wpm: 120 }),
      makeTestRow({ wpm: 120 }),
    ];
    expect(fatigueDampener(decline)).toBe(FATIGUE_MIN_MULT);
  });
});

describe("inChallengeBand", () => {
  it("accepts predictions slightly above baseline", () => {
    // baseline 100ms × 3 bigrams = 300ms expected. 1.2× = 360ms.
    expect(inChallengeBand(360, 100, 3)).toBe(true);
  });

  it("rejects predictions below the band (too easy)", () => {
    expect(inChallengeBand(100 * 3 * (CHALLENGE_LOW - 0.1), 100, 3)).toBe(
      false,
    );
  });

  it("rejects predictions above the band (too hard)", () => {
    expect(inChallengeBand(100 * 3 * (CHALLENGE_HIGH + 0.1), 100, 3)).toBe(
      false,
    );
  });

  it("returns true on cold start (baseline 0)", () => {
    expect(inChallengeBand(500, 0, 3)).toBe(true);
  });
});

describe("inChallengeBand with a pacing ceiling", () => {
  it("honours a lowered ceiling", () => {
    // 2.2× sits inside the neutral band but outside a tired one.
    expect(inChallengeBand(100 * 3 * 2.2, 100, 3)).toBe(true);
    expect(inChallengeBand(100 * 3 * 2.2, 100, 3, CHALLENGE_HIGH_TIRED)).toBe(false);
  });

  it("honours a relaxed floor", () => {
    expect(inChallengeBand(100 * 3 * 0.8, 100, 3)).toBe(false);
    expect(inChallengeBand(100 * 3 * 0.8, 100, 3, CHALLENGE_HIGH, 0)).toBe(true);
  });
});

/** Build a newest-first session: `wpms[0]` is the newest test, each
 *  older one started `gapMs` earlier. */
function session(
  wpms: readonly number[],
  opts: { accuracy?: number; gapMs?: number; newestMs?: number } = {},
): TestRow[] {
  const newest = opts.newestMs ?? 1_700_000_000_000;
  const gap = opts.gapMs ?? 60_000;
  return wpms.map((wpm, i) =>
    makeTestRow({
      wpm,
      accuracy: opts.accuracy ?? 97,
      startedAt: new Date(newest - i * gap),
    }),
  );
}

describe("currentSession", () => {
  it("chains tests until a gap longer than SESSION_GAP_MS", () => {
    const newest = 1_700_000_000_000;
    const rows = [
      makeTestRow({ startedAt: new Date(newest) }),
      makeTestRow({ startedAt: new Date(newest - 60_000) }),
      makeTestRow({ startedAt: new Date(newest - 60_000 - SESSION_GAP_MS - 1) }),
    ];
    expect(currentSession(rows).length).toBe(2);
  });

  it("is empty when the newest test is older than the gap", () => {
    const rows = session([100, 100], { newestMs: 1_000_000 });
    expect(currentSession(rows, 1_000_000 + SESSION_GAP_MS + 1)).toEqual([]);
    expect(currentSession(rows, 1_000_000 + 1_000).length).toBe(2);
  });

  it("skips aborted runs", () => {
    const rows = session([100, 40, 100]);
    rows[1] = { ...rows[1]!, wasCompleted: false };
    expect(currentSession(rows).map((r) => r.wpm)).toEqual([100, 100]);
  });
});

describe("pacingForForm", () => {
  it("is neutral at 0", () => {
    expect(pacingForForm(0)).toEqual(NEUTRAL_PACING);
    expect(NEUTRAL_PACING.challengeHigh).toBe(CHALLENGE_HIGH);
    expect(NEUTRAL_PACING.concentration).toBe(WEAKNESS_CONCENTRATION);
  });

  it("eases the ceiling and softens concentration when struggling", () => {
    const p = pacingForForm(-1);
    expect(p.challengeHigh).toBeCloseTo(CHALLENGE_HIGH_TIRED, 5);
    expect(p.concentration).toBeCloseTo(CONCENTRATION_TIRED, 5);
    expect(p.damping).toBeCloseTo(CHALLENGE_HIGH_TIRED / CHALLENGE_HIGH, 5);
  });

  it("stretches modestly when in form, and caps at FORM_MAX", () => {
    const p = pacingForForm(FORM_MAX);
    expect(p.challengeHigh).toBeCloseTo(CHALLENGE_HIGH_FRESH, 5);
    expect(p.concentration).toBeCloseTo(CONCENTRATION_FRESH, 5);
    expect(p.damping).toBe(1);
    expect(pacingForForm(5)).toEqual(p);
  });

  it("interpolates between the extremes", () => {
    const half = pacingForForm(-0.5);
    expect(half.challengeHigh).toBeLessThan(CHALLENGE_HIGH);
    expect(half.challengeHigh).toBeGreaterThan(CHALLENGE_HIGH_TIRED);
  });
});

describe("pacingFrom", () => {
  it("is neutral with fewer than two session tests", () => {
    expect(pacingFrom([])).toEqual(NEUTRAL_PACING);
    expect(pacingFrom(session([100]))).toEqual(NEUTRAL_PACING);
  });

  it("is neutral for a steady, accurate session", () => {
    expect(pacingFrom(session([100, 100, 100, 100, 100])).form).toBe(0);
  });

  it("eases off when WPM is fading within the session", () => {
    const p = pacingFrom(session([80, 85, 90, 110, 110]));
    expect(p.form).toBeLessThan(0);
    expect(p.challengeHigh).toBeLessThan(CHALLENGE_HIGH);
    expect(p.concentration).toBeLessThan(WEAKNESS_CONCENTRATION);
  });

  it("eases off when session accuracy is below target", () => {
    const p = pacingFrom(
      session([100, 100], { accuracy: ACCURACY_TARGET - ACCURACY_SPAN }),
    );
    expect(p.form).toBeCloseTo(-1, 5);
  });

  it("ignores a decline spread across separate sessions", () => {
    // Same WPM sequence as the fading case, but a day between tests —
    // that's not fatigue, it's just different days.
    const p = pacingFrom(session([80, 85, 90, 110, 110], { gapMs: 86_400_000 }));
    expect(p).toEqual(NEUTRAL_PACING);
  });

  it("eases off in a slump against the user's usual speed", () => {
    const newest = 1_700_000_000_000;
    const today = session([80, 80], { newestMs: newest });
    const before = session([110, 110, 110, 110, 110, 110], {
      newestMs: newest - 3 * 86_400_000,
    });
    expect(pacingFrom([...today, ...before]).form).toBeLessThan(0);
  });

  it("stretches a little when faster than usual and accurate", () => {
    const newest = 1_700_000_000_000;
    const today = session([120, 120], { newestMs: newest });
    const before = session([100, 100, 100, 100, 100, 100], {
      newestMs: newest - 3 * 86_400_000,
    });
    const p = pacingFrom([...today, ...before]);
    expect(p.form).toBeGreaterThan(0);
    expect(p.form).toBeLessThanOrEqual(FORM_MAX);
    expect(p.challengeHigh).toBeGreaterThan(CHALLENGE_HIGH);
  });

  it("treats a finished session as over when given the time", () => {
    const rows = session([80, 85, 90, 110, 110], { newestMs: 1_000_000 });
    expect(pacingFrom(rows, 1_000_000 + 2 * SESSION_GAP_MS)).toEqual(
      NEUTRAL_PACING,
    );
  });
});
