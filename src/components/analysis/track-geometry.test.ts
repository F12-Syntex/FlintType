import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import {
  anchorStyle,
  comparisonGeometry,
  rangeGeometry,
  rangeText,
  SLOPE_BOX,
  slopeDirection,
  slopeGeometry,
} from "./track-geometry";

describe("rangeGeometry", () => {
  it("pads the domain by 15% of the span on each side", () => {
    const g = rangeGeometry(70, 80, 75);
    expect(g.bandFrom).toBeCloseTo((1.5 / 13) * 100);
    expect(g.bandTo).toBeCloseTo((11.5 / 13) * 100);
    expect(g.dot).toBeCloseTo(50);
  });

  it("stretches the domain to a value outside the range", () => {
    const g = rangeGeometry(70, 80, 100);
    expect(g.dot).toBeCloseTo((31.5 / 33) * 100);
    expect(g.bandTo).toBeCloseTo((11.5 / 33) * 100);
    const below = rangeGeometry(70, 80, 50);
    expect(below.dot).toBeCloseTo((1.5 / 33) * 100);
  });

  it("labels both ends of a wide band, growing inward near the edges", () => {
    const g = rangeGeometry(70, 80, 75);
    expect(g.labels).toEqual({
      kind: "ends",
      low: { at: g.bandFrom, align: "start" },
      high: { at: g.bandTo, align: "end" },
    });
  });

  it("grows end labels away from each other when only one end is near an edge", () => {
    const g = rangeGeometry(70, 80, 84);
    expect(g.labels.kind).toBe("ends");
    if (g.labels.kind !== "ends") return;
    expect(g.labels.low.align).toBe("start");
    expect(g.labels.high.align).toBe("start");
  });

  it("gives a narrow band one label, hung from its outer end near an edge", () => {
    const left = rangeGeometry(70, 80, 120);
    expect(left.labels).toEqual({ kind: "single", at: { at: left.bandFrom, align: "start" } });
    const right = rangeGeometry(70, 80, 30);
    expect(right.labels).toEqual({ kind: "single", at: { at: right.bandTo, align: "end" } });
  });

  it("centres the single label of a zero-width range", () => {
    const flat = rangeGeometry(79, 79, 79);
    expect(flat.labels).toEqual({ kind: "single", at: { at: 50, align: "center" } });
  });

  it("only lets both end labels grow inward when the band is wider than half", () => {
    for (let v = 0; v <= 200; v += 1) {
      const g = rangeGeometry(70, 80, v);
      if (g.labels.kind === "ends") {
        expect(g.bandTo - g.bandFrom).toBeGreaterThanOrEqual(35);
        if (g.labels.low.align === "start" && g.labels.high.align === "end") {
          expect(g.bandTo - g.bandFrom).toBeGreaterThan(50);
        }
      }
    }
  });

  it("keeps every mark on the track", () => {
    for (const [lo, hi, v] of [[70, 80, -1e6], [70, 80, 1e6], [0, 0, 0], [5, 5, 9]]) {
      const g = rangeGeometry(lo, hi, v);
      for (const p of [g.bandFrom, g.bandTo, g.dot ?? 0]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
      }
    }
  });

  it("handles a zero span, a swapped range and no value", () => {
    const flat = rangeGeometry(79, 79, 79);
    expect(flat.bandFrom).toBeCloseTo(flat.bandTo);
    expect(flat.dot).toBeCloseTo(50);
    expect(rangeGeometry(80, 70).bandFrom).toBeLessThan(rangeGeometry(80, 70).bandTo);
    expect(rangeGeometry(70, 80).dot).toBeNull();
    expect(rangeGeometry(70, 80, Number.NaN).dot).toBeNull();
  });
});

describe("comparisonGeometry", () => {
  it("places the higher value at 80% with the caller's 1.25 headroom", () => {
    const g = comparisonGeometry(4, 8, 10);
    expect(g.recent).toBeCloseTo(80);
    expect(g.better).toBeCloseTo(40);
    expect(g.segFrom).toBeCloseTo(40);
    expect(g.segTo).toBeCloseTo(80);
  });

  it("enforces the headroom when the caller's max is too small", () => {
    expect(comparisonGeometry(4, 8, 8).recent).toBeCloseTo(80);
  });

  it("puts the lower value's caption first, in the dots' order", () => {
    expect(comparisonGeometry(4, 8, 10).betterFirst).toBe(true);
    expect(comparisonGeometry(8, 4, 10).betterFirst).toBe(false);
    expect(comparisonGeometry(0.5, 8, 10).betterFirst).toBe(true);
  });

  it("keeps the caption order on a tie, with both dots at 80%", () => {
    const g = comparisonGeometry(5, 5, 6.25);
    expect(g.better).toBeCloseTo(80);
    expect(g.recent).toBeCloseTo(80);
    expect(g.segTo - g.segFrom).toBeCloseTo(0);
    expect(g.betterFirst).toBe(true);
  });

  it("orders captions like the dots for any pair", () => {
    for (let b = 0; b <= 10; b += 0.5) {
      for (let r = 0; r <= 10; r += 0.5) {
        const g = comparisonGeometry(b, r, Math.max(b, r) * 1.25);
        const [left, right] = g.betterFirst ? [g.better, g.recent] : [g.recent, g.better];
        expect(left).toBeLessThanOrEqual(right);
        expect(g.segFrom).toBeCloseTo(left);
        expect(g.segTo).toBeCloseTo(right);
      }
    }
  });

  it("survives zeros and junk", () => {
    const g = comparisonGeometry(0, 0, 0);
    expect(g.better).toBe(0);
    expect(g.recent).toBe(0);
    const junk = comparisonGeometry(Number.NaN, -3, Number.NaN);
    expect(junk.better).toBe(0);
    expect(junk.recent).toBe(0);
  });
});

describe("anchorStyle", () => {
  it("maps an anchor to left or right", () => {
    expect(anchorStyle({ at: 20, align: "start" })).toEqual({ left: "20%" });
    expect(anchorStyle({ at: 70, align: "end" })).toEqual({ right: "30%" });
    expect(anchorStyle({ at: 50, align: "center" })).toEqual({ left: "50%", transform: "translateX(-50%)" });
  });
});

describe("rangeText", () => {
  it("names both ends of a narrow band without joining them with to", () => {
    const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
    const label = rangeText(pct(97.6), pct(98.3));
    expect(label).toBe("Between 97.6% and 98.3%");
    expect(bannedPatterns(label, { heading: true })).toEqual([]);
    expect(rangeText("77 wpm", "81 wpm")).toBe("Between 77 wpm and 81 wpm");
  });

  it("prints ends that read alike once", () => {
    expect(rangeText("100%", "100%")).toBe("100%");
  });
});

describe("rangeGeometry sameText", () => {
  it("gives a wide band whose ends print alike one centred label", () => {
    const wide = rangeGeometry(78.6, 79.4, 79);
    expect(wide.labels.kind).toBe("ends");
    const g = rangeGeometry(78.6, 79.4, 79, true);
    expect(g.labels).toEqual({ kind: "single", at: { at: 50, align: "center" } });
    expect(g.bandFrom).toBe(wide.bandFrom);
    expect(g.bandTo).toBe(wide.bandTo);
  });

  it("still hangs the one label from the band's outer end near an edge", () => {
    const g = rangeGeometry(99.96, 100, 10, true);
    expect(g.labels).toEqual({ kind: "single", at: { at: g.bandTo, align: "end" } });
  });
});

describe("slopeGeometry", () => {
  const { top, bottom, mid } = SLOPE_BOX;
  const rises = (g: ReturnType<typeof slopeGeometry>) => g.yAfter < g.yBefore;
  const falls = (g: ReturnType<typeof slopeGeometry>) => g.yAfter > g.yBefore;

  it("reads better or worse from the values", () => {
    expect(slopeDirection(9.3, 5.2, true)).toBe("better");
    expect(slopeDirection(2.1, 3.3, true)).toBe("worse");
    expect(slopeDirection(70, 74, false)).toBe("better");
    expect(slopeDirection(74, 70, false)).toBe("worse");
    expect(slopeDirection(5, 5, true)).toBe("same");
    expect(slopeDirection(Number.NaN, 5, false)).toBe("same");
  });

  it("rises for every improvement and falls for every regression, whichever way the value moved", () => {
    // Lower is better: less time fixing rises, more pauses falls.
    expect(rises(slopeGeometry(9.3, 5.2, true))).toBe(true);
    expect(falls(slopeGeometry(2.1, 3.3, true))).toBe(true);
    // Higher is better: faster rises, slower falls.
    expect(rises(slopeGeometry(70, 74, false))).toBe(true);
    expect(falls(slopeGeometry(74, 70, false))).toBe(true);
    const g = slopeGeometry(9.3, 5.2, true);
    expect([g.yBefore, g.yAfter]).toEqual([bottom, top]);
    expect(g.direction).toBe("better");
  });

  it("is flat when nothing changed", () => {
    const g = slopeGeometry(5, 5, true);
    expect(g).toMatchObject({ direction: "same", yBefore: mid, yAfter: mid });
  });

  it("lets the row's own direction win, so icon and sketch always agree", () => {
    expect(rises(slopeGeometry(2.1, 3.3, true, "better"))).toBe(true);
    expect(falls(slopeGeometry(9.3, 5.2, true, "worse"))).toBe(true);
    expect(rises(slopeGeometry(5, 5, true, "better"))).toBe(true);
    for (const betterIsLower of [true, false]) {
      for (const [b, a] of [[1, 2], [2, 1], [3, 3]] as const) {
        for (const dir of ["better", "worse"] as const) {
          const g = slopeGeometry(b, a, betterIsLower, dir);
          expect(g.direction).toBe(dir);
          expect(dir === "better" ? rises(g) : falls(g)).toBe(true);
        }
      }
    }
  });

  it("starts the line on the before dot's edge", () => {
    const { xBefore, r } = SLOPE_BOX;
    for (const g of [slopeGeometry(9.3, 5.2, true), slopeGeometry(2.1, 3.3, true), slopeGeometry(5, 5, true)]) {
      expect(Math.hypot(g.x1 - xBefore, g.y1 - g.yBefore)).toBeCloseTo(r);
      expect(g.x1).toBeGreaterThan(xBefore);
    }
  });
});
