import { describe, expect, it } from "vitest";
import { dateTicks, localDay, maxDateTicks } from "./trend-ticks";

const DAY = 86_400_000;
const at = (month: number, day: number, hour = 10) => new Date(2026, month, day, hour).getTime();

/** Every gap between neighbouring ticks, as a share of the time on show. */
function gaps(ticks: number[], ts: number[]): number[] {
  const span = ts[ts.length - 1]! - ts[0]!;
  return ticks.slice(1).map((t, i) => (t - ticks[i]!) / span);
}

describe("dateTicks", () => {
  it("labels each day once, at most 5, from the first day to the last", () => {
    const ts = Array.from({ length: 40 }, (_, i) => at(9, 1) + i * (DAY / 2));
    const ticks = dateTicks(ts);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks[0]).toBe(ts[0]);
    expect(new Set(ticks.map(localDay)).size).toBe(ticks.length);
    expect(localDay(ticks[ticks.length - 1]!)).toBe(localDay(ts[ts.length - 1]!));
  });
  it("gives one tick for one day, and none for no points", () => {
    const t = at(9, 1);
    expect(dateTicks([t, t + 60_000, t + 120_000])).toEqual([t]);
    expect(dateTicks([])).toEqual([]);
  });
  it("spreads ticks evenly in time, not over practice days", () => {
    // 30 days in a row, then one test 70 days later.
    const ts = [...Array.from({ length: 30 }, (_, i) => at(5, 1) + i * DAY), at(5, 1) + 100 * DAY];
    const ticks = dateTicks(ts);
    // Spread over practice days, four of the five ticks would sit in the first 30.
    expect(ticks.filter((t) => t < at(5, 1) + 31 * DAY).length).toBeLessThanOrEqual(2);
    expect(ticks[ticks.length - 1]).toBe(ts[ts.length - 1]);
  });
  it("never puts two labels close together when practice days bunch up", () => {
    // Sep 20 to Oct 2 with gaps, the case that drew "Sep 27Sep 29" on a phone.
    const days: [number, number][] = [[8, 20], [8, 21], [8, 24], [8, 27], [8, 29], [8, 30], [9, 1], [9, 2]];
    const ts = days.flatMap(([m, d]) => [at(m, d, 9), at(m, d, 18)]);
    for (const max of [5, 3]) {
      const ticks = dateTicks(ts, max);
      expect(ticks.length).toBeLessThanOrEqual(max);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      for (const g of gaps(ticks, ts)) expect(g).toBeGreaterThanOrEqual(1 / (max + 1));
      expect(new Set(ticks.map(localDay)).size).toBe(ticks.length);
    }
  });
  it("drops a day that crowds the next, even with few days", () => {
    const ts = [at(8, 20), at(8, 21), at(9, 2)];
    expect(dateTicks(ts)).toEqual([at(8, 20), at(9, 2)]);
    // Two days an hour apart over a long day: one label only.
    const late = [at(8, 20, 23), at(8, 21, 0), at(8, 21, 23)];
    expect(dateTicks(late)).toHaveLength(1);
  });
});

describe("maxDateTicks", () => {
  it("fits about one label per 96px, from 2 to 5", () => {
    expect(maxDateTicks(null)).toBe(3);
    expect(maxDateTicks(319)).toBe(3);
    expect(maxDateTicks(552)).toBe(5);
    expect(maxDateTicks(150)).toBe(2);
    expect(maxDateTicks(2400)).toBe(5);
    expect(maxDateTicks(Number.NaN)).toBe(3);
  });
});
