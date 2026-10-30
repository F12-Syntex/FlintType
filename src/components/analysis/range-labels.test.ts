import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import {
  ATTACH,
  BAND_MIN,
  bandLeft,
  bandPx,
  DOT_R,
  dotLeft,
  dotPx,
  LABEL_GAP,
  placeRangeLabels,
  type RangeLabelLayout,
  rangeText,
  rangeTextLines,
  sameLayout,
  underDot,
} from "./range-labels";
import { rangeGeometry } from "./track-geometry";

/** About the width of a `text-xs tabular-nums` character: the reviewer
 *  measured "1000.0 cpm" at 68 px in the browser. */
const CH = 6.8;
const width = (t: string) => t.length * CH;

const cpm = (n: number) => `${(n * 5).toFixed(1)} cpm`;
const wpm = (n: number) => `${Math.round(n)} wpm`;
const wpm1 = (n: number) => `${n.toFixed(1)} wpm`;
const acc = (n: number) => `${Math.round(n * 10) / 10}%`;

type Box = { a: number; b: number };

function place(lo: number, hi: number, v: number | undefined, track: number, fmt: (n: number) => string) {
  const loText = fmt(Math.min(lo, hi));
  const hiText = fmt(Math.max(lo, hi));
  const g = rangeGeometry(lo, hi, v);
  const [l1, l2] = rangeTextLines(loText, hiText);
  const sizes = {
    track,
    low: width(loText),
    high: width(hiText),
    one: width(rangeText(loText, hiText)),
    two: Math.max(width(l1), width(l2)),
  };
  const layout = placeRangeLabels(g, sizes, loText === hiText);
  const boxes: Box[] =
    layout.kind === "ends"
      ? [
          { a: layout.low, b: layout.low + sizes.low },
          { a: layout.high, b: layout.high + sizes.high },
        ]
      : [{ a: layout.left, b: layout.left + (layout.lines === 2 ? sizes.two : sizes.one) }];
  const { bl, br } = bandPx(g.bandFrom, g.bandTo, track);
  const dot = g.dot === null ? null : dotPx(g.dot, track);
  return { layout, boxes, sizes, bl, br, dot };
}

type Placed = ReturnType<typeof place>;
const EPS = 1e-9;

/** What breaks the rules: every end label inside the track, the gap
 *  between them, off the dot, never on the dot's side of a band end the
 *  dot lies beyond, and near its band end; the single label inside the
 *  track whenever it fits, and off a dot that lies beyond the band.
 *  Empty when the layout is clean. */
function violations(p: Placed, track: number): string[] {
  const out: string[] = [];
  for (const { a, b } of p.boxes) {
    if (b - a <= track && (a < -EPS || b > track + EPS)) out.push("leaves the track");
  }
  if (p.layout.kind === "single" && p.dot !== null && (p.dot < p.bl || p.dot > p.br)) {
    const [{ a, b }] = p.boxes as [Box];
    if (underDot(a + 1e-6, b - a - 2e-6, p.dot)) out.push("single label under a dot beyond the band");
  }
  if (p.layout.kind !== "ends") return out;
  const [low, high] = p.boxes as [Box, Box];
  if (low.b + LABEL_GAP > high.a + EPS) out.push("labels overlap");
  for (const { a, b } of p.boxes) if (underDot(a, b - a, p.dot)) out.push("under the dot");
  // A label's centre on the far side of its band end means it hangs toward the dot.
  if (p.dot !== null && p.dot < p.bl && (low.a + low.b) / 2 < p.bl) out.push("low label on the dot's side");
  if (p.dot !== null && p.dot > p.br && (high.a + high.b) / 2 > p.br) out.push("high label on the dot's side");
  const near = (x: Box, end: number) => Math.min(Math.abs(x.a - end), Math.abs(x.b - end));
  if (near(low, p.bl) > ATTACH + EPS || near(high, p.br) > ATTACH + EPS) out.push("label far from its end");
  return out;
}

const expectClean = (p: Placed, track: number) => expect(violations(p, track)).toEqual([]);

describe("rangeText", () => {
  it("names both ends without joining them with to", () => {
    const label = rangeText(acc(97.6), acc(98.3));
    expect(label).toBe("Between 97.6% and 98.3%");
    expect(bannedPatterns(label, { heading: true })).toEqual([]);
    expect(rangeText("77 wpm", "81 wpm")).toBe("Between 77 wpm and 81 wpm");
  });
  it("prints ends that read alike once", () => {
    expect(rangeText("100%", "100%")).toBe("100%");
  });
  it("breaks onto two lines at the and", () => {
    expect(rangeTextLines("1000.0 cpm", "1070.0 cpm")).toEqual(["Between 1000.0 cpm", "and 1070.0 cpm"]);
    for (const line of rangeTextLines("97.6%", "98.3%")) expect(bannedPatterns(line, { heading: true })).toEqual([]);
  });
});

describe("placeRangeLabels on a narrow track (the compare-usual row)", () => {
  // The rows the review measured: [low, high, value, format].
  const ROWS: [number, number, number, (n: number) => string][] = [
    [200, 214, 216.5, cpm],
    [70, 80, 82.4, cpm],
    [200, 214, 218.5, cpm],
    [70, 80, 67.6, cpm],
    [70, 80, 67.6, wpm],
    [70, 80, 82.4, wpm],
    [200, 214, 216.5, wpm1],
    [97.6, 98.3, 99.1, acc],
    [97.6, 98.3, 95, acc],
  ];
  for (const track of [182, 205]) {
    it(`never overlaps, leaks or sits under the dot at ${track} px`, () => {
      for (const [lo, hi, v, fmt] of ROWS) expectClean(place(lo, hi, v, track, fmt), track);
    });
  }

  it("gives 1000.0 cpm and 1070.0 cpm one label on two lines at 182 px", () => {
    const p = place(200, 214, 216.5, 182, cpm);
    expect(p.layout).toMatchObject({ kind: "single", lines: 2 });
    expect(p.boxes[0]!.b).toBeLessThanOrEqual(182);
    expect(underDot(p.boxes[0]!.a, p.boxes[0]!.b - p.boxes[0]!.a, p.dot)).toBe(false);
  });

  it("hangs 350.0 cpm and 70 wpm toward the band, never beside a dot below it", () => {
    for (const fmt of [cpm, wpm]) {
      for (const track of [182, 205]) {
        const p = place(70, 80, 67.6, track, fmt);
        expect(p.dot!).toBeLessThan(p.bl);
        const [first] = p.boxes as [Box];
        // An end label starts right of the dot; one label for the range keeps off it.
        expect(first.a).toBeGreaterThan(p.dot! + DOT_R);
      }
    }
  });
});

describe("placeRangeLabels", () => {
  it("labels both ends outward on a wide track", () => {
    const p = place(70, 80, 75, 560, wpm);
    expect(p.layout.kind).toBe("ends");
    expect(p.boxes[0]!.b).toBeCloseTo(p.bl);
    expect(p.boxes[1]!.a).toBeCloseTo(p.br);
  });

  it("hangs an end label toward the band when the dot lies beyond that end", () => {
    const below = place(70, 80, 40, 560, wpm);
    expect(below.layout.kind).toBe("ends");
    expect(below.boxes[0]!.a).toBeCloseTo(below.bl);
    const above = place(70, 80, 110, 560, wpm);
    expect(above.layout.kind).toBe("ends");
    expect(above.boxes[1]!.b).toBeCloseTo(above.br);
  });

  it("grows a label inward when there's no room outside the band", () => {
    const p = place(70, 80, 75, 300, wpm);
    expect(p.layout.kind).toBe("ends");
    expect(p.boxes[0]!.a).toBeCloseTo(p.bl);
    expect(p.boxes[1]!.b).toBeCloseTo(p.br);
  });

  it("uses one line for the single label whenever it fits", () => {
    // Neither end label can stay at its end of a band this narrow.
    const one = placeRangeLabels(
      { bandFrom: 45, bandTo: 50, dot: null },
      { track: 200, low: 120, high: 120, one: 150, two: 90 },
      false,
    );
    expect(one).toEqual({ kind: "single", left: 20, lines: 1 });
  });

  it("labels the ends of a narrow band from outside when the track has room", () => {
    const out = placeRangeLabels(
      { bandFrom: 45, bandTo: 50, dot: 48 },
      { track: 300, low: 40, high: 40, one: 150, two: 90 },
      false,
    );
    // The high label steps 2 px right to clear the dot at 144 px.
    expect(out).toEqual({ kind: "ends", low: 95, high: 152 });
  });

  it("prints ends that read alike once, on one line", () => {
    const p = place(99.96, 100, 99.98, 182, acc);
    expect(p.layout).toMatchObject({ kind: "single", lines: 1 });
    expect(p.sizes.one).toBe(width("100%"));
  });

  it("moves the single label off a dot beyond the band, toward the band", () => {
    // One line (140 px) can't clear a dot at 138 px; two lines (90 px) can.
    const near = placeRangeLabels(
      { bandFrom: 40, bandTo: 44, dot: 46 },
      { track: 300, low: 120, high: 120, one: 140, two: 90 },
      false,
    );
    expect(near).toEqual({ kind: "single", left: 138 - 8 - 90, lines: 2 });
    // Far enough away, the centred line already clears it.
    const far = placeRangeLabels({ bandFrom: 40, bandTo: 44, dot: 90 }, { track: 300, low: 120, high: 120, one: 140, two: 90 }, false);
    expect(far).toEqual({ kind: "single", left: 126 - 70, lines: 1 });
  });

  it("steps the single label off a dot inside the band, staying over the band", () => {
    const p = place(102.4, 108.9, 104, 182, wpm1);
    expect(p.layout.kind).toBe("single");
    const [box] = p.boxes as [Box];
    expect(underDot(box.a, box.b - box.a, p.dot)).toBe(false);
    const mid = (box.a + box.b) / 2;
    expect(mid).toBeGreaterThanOrEqual(p.bl - ATTACH);
    expect(mid).toBeLessThanOrEqual(p.br + ATTACH);
    expect(box.a).toBeGreaterThanOrEqual(0);
    expect(box.b).toBeLessThanOrEqual(182);
  });

  it("keeps the band inside the track, at least its least width", () => {
    // The near-zero accuracy band at the right end: pulled in, not past it.
    expect(bandPx(98.9, 99.8, 205)).toEqual({ bl: 205 - BAND_MIN, br: 205 });
    expect(bandPx(45, 45.5, 200)).toEqual({ bl: 90, br: 96 });
    expect(bandPx(20, 70, 200)).toEqual({ bl: 40, br: 140 });
    expect(bandLeft(98.9)).toBe("min(98.9%, calc(100% - 6px))");
    for (let track = 150; track <= 560; track += 7) {
      for (const [from, to] of [[0, 0], [99.5, 100], [100, 100], [40, 60]] as const) {
        const { bl, br } = bandPx(from, to, track);
        expect(bl).toBeGreaterThanOrEqual(0);
        expect(br).toBeLessThanOrEqual(track + EPS);
        expect(br - bl).toBeGreaterThanOrEqual(BAND_MIN - EPS);
      }
    }
  });

  it("centres the label on the band as drawn", () => {
    // A 1 px band drawn 6 px wide, [90, 96]: too narrow for two end
    // labels, so its one label centres on 93, not on 90.5.
    const out = placeRangeLabels(
      { bandFrom: 45, bandTo: 45.5, dot: null },
      { track: 200, low: 40, high: 40, one: 60, two: 40 },
      false,
    );
    expect(out).toEqual({ kind: "single", left: 63, lines: 1 });
  });

  it("keeps the dot a dot's half-width inside the track", () => {
    expect(dotPx(100, 182)).toBe(182 - DOT_R);
    expect(dotPx(0, 182)).toBe(DOT_R);
    expect(dotPx(50, 182)).toBe(91);
    expect(dotLeft(97.5)).toBe("clamp(6px, 97.5%, calc(100% - 6px))");
  });

  it("holds every rule across widths, ranges, values and formats", () => {
    const fmts = [wpm, wpm1, cpm, acc];
    const bad: string[] = [];
    let ends = 0;
    let singles = 0;
    for (let track = 150; track <= 560; track += 7) {
      for (const lo of [30, 70, 98, 200]) {
        for (const span of [0, 0.4, 2, 6, 14, 40]) {
          for (const dv of [-30, -8, -2, -0.5, 0, 0.3, 0.5, 0.8, 1, 1.5, 3, 25]) {
            for (const fmt of fmts) {
              const v = lo + dv * Math.max(span, 1);
              const p = place(lo, lo + span, v, track, fmt);
              for (const why of violations(p, track)) bad.push(`${track}px ${lo}-${lo + span} at ${v}: ${why}`);
              if (p.layout.kind === "ends") ends++;
              else {
                singles++;
                // Two lines only when one doesn't fit, or would sit on a dot beyond the band.
                if (p.layout.lines === 2 && p.sizes.two >= p.sizes.one) bad.push(`${track}px: needless two lines`);
              }
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
    expect(ends).toBeGreaterThan(0);
    expect(singles).toBeGreaterThan(0);
  });
});

describe("sameLayout", () => {
  it("compares what renders", () => {
    const a: RangeLabelLayout = { kind: "ends", low: 1, high: 90 };
    expect(sameLayout(a, { kind: "ends", low: 1, high: 90 })).toBe(true);
    expect(sameLayout(a, { kind: "ends", low: 2, high: 90 })).toBe(false);
    expect(sameLayout(a, { kind: "single", left: 1, lines: 1 })).toBe(false);
    expect(sameLayout({ kind: "single", left: 1, lines: 2 }, { kind: "single", left: 1, lines: 2 })).toBe(true);
    expect(sameLayout(null, null)).toBe(true);
    expect(sameLayout(null, a)).toBe(false);
  });
});
