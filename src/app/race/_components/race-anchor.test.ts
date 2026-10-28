import { describe, expect, it } from "vitest";
import { localGunInstant, publishedWpm, raceNetWpm } from "./race-anchor";

describe("localGunInstant", () => {
  it("is the local time the racing snapshot was seen when it was built at the gun", () => {
    expect(localGunInstant(50_000, 9_000_000, 9_000_000)).toBe(50_000);
  });

  it("backs out how long the race had already run on the server clock", () => {
    // Snapshot built 4.2s after the gun, seen locally at 50s.
    expect(localGunInstant(50_000, 9_004_200, 9_000_000)).toBe(45_800);
  });

  it("ignores device clock skew (only same-clock differences are used)", () => {
    // Server clock 3h ahead of the device: the anchor is unaffected.
    const skew = 3 * 60 * 60 * 1000;
    expect(localGunInstant(50_000, 9_000_120 + skew, 9_000_000 + skew)).toBe(49_880);
  });

  it("never anchors after the local time the snapshot was seen", () => {
    expect(localGunInstant(50_000, 8_999_000, 9_000_000)).toBe(50_000);
  });

  it("drops the racing snapshot's delivery lag using the countdown's offset", () => {
    // Server clock = local + 8_950_000. The racing snapshot (built at
    // the gun) took 80ms to arrive; an earlier snapshot took 1ms, so
    // the offset estimate is true offset − 1ms.
    const trueOffset = 8_950_000;
    const offset = trueOffset - 1;
    const seenAt = 50_080; // gun at local 50_000, seen 80ms later
    expect(localGunInstant(seenAt, 9_000_000, 9_000_000)).toBe(50_080);
    expect(localGunInstant(seenAt, 9_000_000, 9_000_000, offset)).toBe(50_001);
  });

  it("keeps the seen instant when the offset estimate is worse than this snapshot", () => {
    // Offset underestimated by 300ms (only slow samples so far): the
    // countdown-end estimate would land after the snapshot was seen.
    expect(localGunInstant(50_080, 9_000_000, 9_000_000, 8_950_000 - 300)).toBe(50_080);
  });

  it("stays skew-safe with the offset (device clock hours off)", () => {
    const skew = 3 * 60 * 60 * 1000;
    // Local clock 3h behind the server, gun at server 9_000_000.
    const gunLocal = 9_000_000 - skew;
    expect(localGunInstant(gunLocal + 40, 9_000_000, 9_000_000, skew - 2)).toBe(gunLocal + 2);
  });
});

describe("raceNetWpm", () => {
  it("matches the server formula: (progress − errors) / 5 per minute since the gun", () => {
    // 125 chars, no errors, 12.9s since the gun → 116 wpm.
    expect(raceNetWpm(125, 0, 12_900)).toBe(116);
  });

  it("subtracts keystroke errors from progress", () => {
    expect(raceNetWpm(300, 10, 60_000)).toBe(58);
  });

  it("floors the window at one second", () => {
    expect(raceNetWpm(10, 0, 200)).toBe(120);
    expect(raceNetWpm(10, 0, 0)).toBe(120);
  });

  it("never goes negative", () => {
    expect(raceNetWpm(5, 20, 10_000)).toBe(0);
  });

  it("is lower for a late start than the same typing timed from the first key", () => {
    // 2s of waiting after the gun, then 10.9s of typing 125 chars.
    const fromGun = raceNetWpm(125, 0, 12_900);
    const fromFirstKey = raceNetWpm(125, 0, 10_900);
    expect(fromGun).toBeLessThan(fromFirstKey);
    expect(fromFirstKey).toBe(138);
  });
});

describe("publishedWpm", () => {
  const run = { correctChars: 125, errors: 0, startTime: 1_000, endTime: null };

  it("is 0 before the clock has started", () => {
    expect(publishedWpm({ ...run, startTime: null }, 99_000)).toBe(0);
  });

  it("measures up to now while the run is going", () => {
    expect(publishedWpm(run, 13_900)).toBe(116);
  });

  it("freezes at the run's end once it has one", () => {
    expect(publishedWpm({ ...run, endTime: 13_900 }, 60_000)).toBe(116);
  });

  it("times from the gun when the run is anchored there", () => {
    // Gun at 1s, first key at 3s, last at 13.9s: timed from the gun.
    expect(publishedWpm({ ...run, endTime: 13_900 }, 13_900)).toBe(raceNetWpm(125, 0, 12_900));
  });
});
