import { describe, expect, it } from "vitest";
import { buildPooled, type FixtureOptions } from "./digest-fixtures";
import { difficultyAdjustment } from "./difficulty";
import { plateauOf } from "./plateau";
import { windowsFor } from "./windows";

const DAY = 86_400_000;
function plateau(o: FixtureOptions) {
  const ts = buildPooled(o);
  const w = windowsFor(ts, ts[0]!.bucket);
  return plateauOf(w, difficultyAdjustment(w));
}
const levelledShare = (o: FixtureOptions, seeds = 20) => {
  let k = 0;
  for (let s = 1; s <= seeds; s++) if (plateau({ ...o, seed: s })) k++;
  return k / seeds;
};
/** A session of 5 a day for 4 weeks: a steady typist. (12 sessions, the
 *  spec's example, is too few for a 90% equivalence test once days and
 *  sessions differ: about 1 such user in 12 would pass.) */
const steadyDaily: FixtureOptions = { tests: 140, perDay: [1, 1], everyDays: 1, sessions: Array(28).fill(5), noiseSd: 1.5, sessionSd: 0.2 };

describe("plateauOf", () => {
  it("flat speed over 28 daily sessions is levelled for most such typists", () => {
    const ts = buildPooled({ ...steadyDaily, seed: 1 });
    expect((ts[0]!.startedAtMs - ts[ts.length - 1]!.startedAtMs) / DAY).toBeGreaterThan(14);
    expect(levelledShare(steadyDaily)).toBeGreaterThanOrEqual(0.6);
    const p = plateau({ ...steadyDaily, seed: 1 })!;
    expect(p.weeks).toBeGreaterThanOrEqual(2);
    expect(Math.abs(p.aroundWpm - 70)).toBeLessThan(4);
  });
  it("gaining 0.3 wpm a day is not levelled", () => {
    expect(levelledShare({ ...steadyDaily, drift: 0.3 })).toBe(0);
  });
  it("a typist who practises several times a day is judged on the last 28 days, not the last 8 sittings", () => {
    // 3 sittings a day: the last 8 sessions span under 3 days.
    expect(levelledShare({ tests: 200, perDay: [3, 3], everyDays: 1, sessions: Array(70).fill(3), noiseSd: 1.5, sessionSd: 0.2, dayAr: 0 })).toBeGreaterThanOrEqual(0.8);
  });
  it("sessions packed into 10 days are not levelled", () => {
    expect(plateau({ tests: 72, perDay: [1, 1], everyDays: 1, sessions: Array(8).fill(9), noiseSd: 1, sessionSd: 0, dayAr: 0, seed: 3 })).toBeNull();
  });
  it("needs 30 tests, 10 sessions and two weeks", () => {
    expect(plateau({ ...steadyDaily, tests: 29 })).toBeNull();
    expect(plateau({ ...steadyDaily, everyDays: 3, sessions: Array(9).fill(16) })).toBeNull();
    expect(plateau({ tests: 40, perDay: [3, 3], everyDays: 1, sessions: Array(14).fill(3) })).toBeNull();
  });
});
