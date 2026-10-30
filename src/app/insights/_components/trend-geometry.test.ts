import { describe, expect, it } from "vitest";
import { DOT_REACH_PX, hoveredRow, MIN_Y_AXIS_PX, yAxisWidth } from "./trend-geometry";

// One px per minute across, one px per wpm down from 200.
const x = (t: number) => t / 60_000;
const y = (v: number) => 200 - v;
const at = (t: number, v: number) => ({ x: x(t), y: y(v) });
const MIN = 60_000;

describe("hoveredRow", () => {
  // Four tests a few minutes apart, then one a day later.
  const cluster = [
    { t: 0, value: 80 },
    { t: 2 * MIN, value: 92 },
    { t: 3 * MIN, value: 70 },
    { t: 4 * MIN, value: 85 },
    { t: 1440 * MIN, value: 90 },
  ];

  it("names the dot under the pointer, not the first of its cluster", () => {
    // The tooltip snaps to the cluster's first column whichever dot you
    // are on; the pointer's height picks the dot.
    for (const r of cluster.slice(0, 4)) {
      expect(hoveredRow(cluster, { x: x(0), y: y(r.value) }, x, y)).toBe(r);
    }
    expect(hoveredRow(cluster, at(1440 * MIN, 90), x, y)).toBe(cluster[4]);
  });

  it("picks the nearest dot when the pointer is between two", () => {
    expect(hoveredRow(cluster, { x: x(0), y: y(87) }, x, y)).toBe(cluster[3]);
    expect(hoveredRow(cluster, { x: x(0), y: y(89) }, x, y)).toBe(cluster[1]);
    // Far above every dot: still the nearest one in reach.
    expect(hoveredRow(cluster, { x: x(0), y: y(190) }, x, y)).toBe(cluster[1]);
  });

  it("prefers the later dot on a tie, the one drawn on top", () => {
    const same = [
      { t: 0, value: 80 },
      { t: 0, value: 80 },
    ];
    expect(hoveredRow(same, at(0, 80), x, y)).toBe(same[1]);
  });

  it("ignores dots beyond one dot radius of the column", () => {
    const apart = [{ t: 0, value: 80 }, { t: (DOT_REACH_PX + 1) * MIN, value: 120 }];
    expect(hoveredRow(apart, at(0, 120), x, y)).toBe(apart[0]);
    expect(hoveredRow(apart, { x: x(-(DOT_REACH_PX + 1) * MIN), y: y(80) }, x, y)).toBeNull();
    expect(hoveredRow([], at(0, 80), x, y)).toBeNull();
  });

  it("gives null without a position or a scale, and skips unscaled rows", () => {
    expect(hoveredRow(cluster, undefined, x, y)).toBeNull();
    expect(hoveredRow(cluster, at(0, 80), undefined, y)).toBeNull();
    expect(hoveredRow(cluster, at(0, 80), x, undefined)).toBeNull();
    expect(hoveredRow(cluster, { x: Number.NaN, y: 0 }, x, y)).toBeNull();
    const holes = (t: number) => (t === 0 ? undefined : x(t));
    expect(hoveredRow(cluster, at(0, 80), holes, y)).toBe(cluster[3]);
  });
});

describe("yAxisWidth", () => {
  it("keeps the usual width for two-digit speeds", () => {
    expect(yAxisWidth(["40", "60", "80"])).toBe(MIN_Y_AXIS_PX);
    expect(yAxisWidth([])).toBe(MIN_Y_AXIS_PX);
  });
  it("widens for three-digit speeds and decimals", () => {
    // A 12 px "200" measures about 25 px; the label sits 12 px in from
    // the axis edge, so the axis needs at least 37 px.
    expect(yAxisWidth(["90", "100", "110"])).toBeGreaterThanOrEqual(12 + 25);
    expect(yAxisWidth(["200", "240"])).toBe(yAxisWidth(["100"]));
    expect(yAxisWidth(["77.5", "80"])).toBeGreaterThan(yAxisWidth(["100"]));
  });
});
