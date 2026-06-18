import { afterEach, describe, expect, it, vi } from "vitest";
import type { HistoryTest } from "@/types/history";
import {
  dayOrdinal,
  deriveActivity,
  derivePersonalBests,
  deriveSkills,
  deriveStreak,
  deriveTotals,
} from "./derive-stats";

const DAY_MS = 86_400_000;

const mk = (over: Partial<HistoryTest> = {}): HistoryTest => ({
  id: Math.random().toString(36).slice(2),
  startedAtMs: 0,
  completedAtMs: 30_000,
  mode: "casual",
  durationOrWordCount: 30,
  lengthMode: "words",
  wpm: 90,
  accuracy: 96,
  errorCount: 0,
  wasCompleted: true,
  ...over,
});

const axis = (tests: HistoryTest[], key: string) =>
  deriveSkills(tests, deriveTotals(tests)).find((s) => s.key === key)!;

describe("deriveSkills", () => {
  it("returns four axes in a stable order (no Experience)", () => {
    expect(deriveSkills([], deriveTotals([])).map((s) => s.key)).toEqual([
      "speed",
      "accuracy",
      "consistency",
      "endurance",
    ]);
  });

  it("is all-zero on no data", () => {
    for (const s of deriveSkills([], deriveTotals([]))) expect(s.value).toBe(0);
  });

  it("normalises speed against the 300 wpm ceiling", () => {
    expect(axis([mk({ wpm: 150 })], "speed").value).toBe(50);
    expect(axis([mk({ wpm: 90 })], "speed").value).toBe(30);
  });

  it("rescales accuracy into the 80–100 band", () => {
    expect(axis([mk({ accuracy: 90 })], "accuracy").value).toBe(50);
  });

  it("rewards consistency when WPM varies little", () => {
    const steady = [mk({ wpm: 100 }), mk({ wpm: 100 }), mk({ wpm: 100 })];
    const swingy = [mk({ wpm: 60 }), mk({ wpm: 100 }), mk({ wpm: 140 })];
    expect(axis(steady, "consistency").value).toBe(100);
    expect(axis(swingy, "consistency").value).toBeLessThan(100);
  });

  it("scores endurance from ~30s+ runs against a 250 ceiling", () => {
    const short = [mk({ wpm: 200, completedAtMs: 15_000 })];
    const long = [mk({ wpm: 125, completedAtMs: 60_000 })];
    expect(axis(short, "endurance").value).toBe(0);
    expect(axis(long, "endurance").value).toBe(50); // 125 / 250
  });
});

describe("derivePersonalBests", () => {
  it("separates a 60-word run from a 60-second run (no bucket merge)", () => {
    const pbs = derivePersonalBests([
      mk({ durationOrWordCount: 60, lengthMode: "words", wpm: 110 }),
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 95 }),
    ]);
    // Two distinct buckets, not one — same mode + amount but different
    // length unit must rank independently (issue #71).
    expect(pbs.length).toBe(2);
    const words = pbs.find((b) => b.lengthMode === "words");
    const time = pbs.find((b) => b.lengthMode === "time");
    expect(words?.bestWpm).toBe(110);
    expect(time?.bestWpm).toBe(95);
    // Neither crowns the other: the time bucket keeps its own (lower)
    // best rather than inheriting the faster words run.
    expect(time?.bestWpm).not.toBe(110);
  });

  it("buckets legacy null-lengthMode rows under their own key", () => {
    const pbs = derivePersonalBests([
      mk({ durationOrWordCount: 60, lengthMode: null, wpm: 80 }),
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 95 }),
    ]);
    expect(pbs.length).toBe(2);
    expect(pbs.find((b) => b.lengthMode === null)?.bestWpm).toBe(80);
  });

  it("merges same-(mode, lengthMode, amount) runs into one bucket", () => {
    const pbs = derivePersonalBests([
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 90 }),
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 105 }),
    ]);
    expect(pbs.length).toBe(1);
    expect(pbs[0]?.bestWpm).toBe(105);
    expect(pbs[0]?.testsCount).toBe(2);
  });
});

describe("dayOrdinal (DST-immune adjacency)", () => {
  // Date.UTC has no DST, so consecutive local calendar dates always map
  // to ordinals exactly 1 apart — even across a DST transition. These
  // are timezone-independent assertions.
  it("US spring-forward (Mar 9 → 10, 2025) is one day apart", () => {
    expect(dayOrdinal(2025, 2, 10) - dayOrdinal(2025, 2, 9)).toBe(1);
  });

  it("EU fall-back (Oct 26 → 27, 2025) is one day apart", () => {
    expect(dayOrdinal(2025, 9, 27) - dayOrdinal(2025, 9, 26)).toBe(1);
  });
});

describe("deriveStreak", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Noon timestamps keep us clear of midnight / DST edges.
  const noon = (daysAgo: number, base: number) =>
    base - daysAgo * DAY_MS + 12 * 3_600_000;

  it("counts 3 consecutive days (current and longest)", () => {
    const base = new Date(2025, 5, 13, 0, 0, 0).getTime();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(base + 12 * 3_600_000));
    const tests = [
      mk({ startedAtMs: noon(0, base) }),
      mk({ startedAtMs: noon(1, base) }),
      mk({ startedAtMs: noon(2, base) }),
    ];
    const s = deriveStreak(tests);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it("breaks the current streak on a gap but keeps the longer longest", () => {
    const base = new Date(2025, 5, 13, 0, 0, 0).getTime();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(base + 12 * 3_600_000));
    const tests = [
      // unbroken tail of 2 (today + yesterday)
      mk({ startedAtMs: noon(0, base) }),
      mk({ startedAtMs: noon(1, base) }),
      // gap at day 2, then a run of 3
      mk({ startedAtMs: noon(3, base) }),
      mk({ startedAtMs: noon(4, base) }),
      mk({ startedAtMs: noon(5, base) }),
    ];
    const s = deriveStreak(tests);
    expect(s.current).toBe(2);
    expect(s.longest).toBe(3);
  });

  it("returns zeros on no tests", () => {
    expect(deriveStreak([])).toEqual({
      current: 0,
      longest: 0,
      lastTestMs: null,
    });
  });
});

describe("deriveActivity", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const ord = (d: Date) =>
    dayOrdinal(d.getFullYear(), d.getMonth(), d.getDate());

  it("fills weeks*7 cells, ends on today, no dup/skip, seeded counts show", () => {
    const today = new Date(2025, 5, 13, 0, 0, 0); // Fri Jun 13 2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date(today.getTime() + 12 * 3_600_000));
    const weeks = 2;
    // Seed 3 tests on today.
    const tests = [
      mk({ startedAtMs: today.getTime() + 12 * 3_600_000 }),
      mk({ startedAtMs: today.getTime() + 13 * 3_600_000 }),
      mk({ startedAtMs: today.getTime() + 14 * 3_600_000 }),
    ];
    const cells = deriveActivity(tests, weeks);

    // Monday-aligned, today included → continuous run ending today.
    expect(cells.length).toBeGreaterThan(0);
    const last = cells[cells.length - 1]!;
    expect(ord(last.date)).toBe(ord(today));

    // Strictly ascending by exactly one calendar day — no dup, no skip.
    for (let i = 1; i < cells.length; i++) {
      expect(ord(cells[i]!.date) - ord(cells[i - 1]!.date)).toBe(1);
    }

    // The seeded day shows its count.
    expect(last.tests).toBe(3);
  });
});
