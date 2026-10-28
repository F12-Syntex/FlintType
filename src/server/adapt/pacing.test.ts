import { describe, expect, it } from "vitest";
import type { TestRow } from "@/types/adapt";
import { ACCURACY_FLOOR, ACCURACY_SPAN, SESSION_GAP_MS } from "./session-form";
import {
  CHALLENGE_HIGH,
  CHALLENGE_HIGH_FRESH,
  CHALLENGE_HIGH_TIRED,
  CHALLENGE_LOW,
  CONCENTRATION_FRESH,
  CONCENTRATION_TIRED,
  FORM_MAX,
  NEUTRAL_PACING,
  WEAKNESS_CONCENTRATION,
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

  it("eases off when session accuracy is very low", () => {
    const p = pacingFrom(
      session([100, 100], { accuracy: ACCURACY_FLOOR - ACCURACY_SPAN }),
    );
    expect(p.form).toBeCloseTo(-1, 5);
  });

  it("eases off when accuracy drops well below the user's usual", () => {
    const newest = 1_700_000_000_000;
    const today = session([100, 100], { newestMs: newest, accuracy: 90 });
    const before = session([100, 100, 100, 100], {
      newestMs: newest - 3 * 86_400_000,
      accuracy: 97,
    });
    expect(pacingFrom([...today, ...before]).form).toBeLessThan(-0.5);
  });

  it("stays neutral for a steady learner whose accuracy is always ~91%", () => {
    // 91% is this user's level, not a bad day — don't hold them back.
    const steady = session(Array.from({ length: 20 }, () => 55), { accuracy: 91 });
    expect(pacingFrom(steady)).toEqual(NEUTRAL_PACING);
  });

  it("stays neutral when adaptive runs follow faster casual ones", () => {
    // Yesterday: casual runs at ~80 wpm. Today: fresh, accurate
    // adaptive runs at ~70 — slower because adaptive words are the
    // user's weak ones, not because they're tired.
    const newest = 1_700_000_000_000;
    const today = session([70, 71, 69], { newestMs: newest });
    const casual = session(
      Array.from({ length: 17 }, (_, i) => 80 + (i % 3) - 1),
      { newestMs: newest - 86_400_000 },
    ).map((r) => ({ ...r, mode: "casual" as const }));
    expect(pacingFrom([...today, ...casual], newest + 60_000)).toEqual(
      NEUTRAL_PACING,
    );
  });

  it("does not read a switch to longer tests as fatigue", () => {
    // 15-word runs at 90, then 60-word runs at 75, all in one session.
    const rows = session([75, 76, 75, 90, 91]).map((r, i) => ({
      ...r,
      durationOrWordCount: i < 3 ? 60 : 15,
    }));
    expect(pacingFrom(rows)).toEqual(NEUTRAL_PACING);
  });

  it("ignores test-to-test noise of a couple of percent", () => {
    expect(pacingFrom(session([99, 101, 100, 101, 100]))).toEqual(NEUTRAL_PACING);
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
    // The same slower runs against a different kind of test (casual)
    // are not a slump.
    const casualBefore = before.map((r) => ({ ...r, mode: "casual" as const }));
    expect(pacingFrom([...today, ...casualBefore])).toEqual(NEUTRAL_PACING);
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
