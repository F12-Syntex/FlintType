/** Pure geometry for `<RangeTrack>` and `<ComparisonTrack>`: where the
 *  marks sit, in percent of the track. `<RangeTrack>`'s labels are
 *  placed in px once the track is measured (`range-labels.ts`). */

const clampPct = (x: number): number => Math.min(100, Math.max(0, x));
const finite = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);

export type RangeGeometry = {
  bandFrom: number;
  bandTo: number;
  dot: number | null;
};

/** Domain [min(low, value) − 15% of the span, max(high, value) + 15%].
 *  A zero span is widened so the band still shows as a short pill. */
export function rangeGeometry(low: number, high: number, value?: number): RangeGeometry {
  let lo = finite(low);
  let hi = finite(high, lo);
  if (lo > hi) [lo, hi] = [hi, lo];
  const v = value === undefined || !Number.isFinite(value) ? null : value;
  const span = hi - lo > 0 ? hi - lo : Math.max(Math.abs(hi) * 0.1, 1);
  const min = Math.min(lo, v ?? lo) - 0.15 * span;
  const max = Math.max(hi, v ?? hi) + 0.15 * span;
  const at = (x: number) => clampPct(((x - min) / (max - min)) * 100);
  return { bandFrom: at(lo), bandTo: at(hi), dot: v === null ? null : at(v) };
}

export type ComparisonGeometry = {
  better: number;
  recent: number;
  segFrom: number;
  segTo: number;
  /** Whether the better-days caption comes first (left). Captions follow
   *  the dots' order: the lower value's caption sits at the track's left
   *  end and the higher one's at its right end. */
  betterFirst: boolean;
};

/** Both dots on [0, max], where max is at least 1.25 × the higher value,
 *  so the higher dot never passes 80%. The captions don't hang from the
 *  dots: they sit at the two ends of the track in a flex row, lower value
 *  left, so they can never collide whatever their width (a long caption
 *  wraps instead). On a tie the better dot counts as the lower one. */
export function comparisonGeometry(better: number, recent: number, max: number): ComparisonGeometry {
  const b = Math.max(0, finite(better));
  const r = Math.max(0, finite(recent));
  const top = Math.max(finite(max), 1.25 * Math.max(b, r)) || 1;
  const pb = clampPct((b / top) * 100);
  const pr = clampPct((r / top) * 100);
  return {
    better: pb,
    recent: pr,
    segFrom: Math.min(pb, pr),
    segTo: Math.max(pb, pr),
    betterFirst: pb <= pr,
  };
}

/** The 40×16 box `<SlopeGlyph>` draws in. */
export const SLOPE_BOX = { top: 3, bottom: 13, mid: 8, xBefore: 5, xAfter: 35, r: 3 } as const;

export type SlopeDirection = "better" | "worse" | "same";

export type SlopeGeometry = {
  direction: SlopeDirection;
  yBefore: number;
  yAfter: number;
  /** Where the line starts: on the before dot's edge, not its centre, so
   *  it never shows through that lighter, translucent dot. */
  x1: number;
  y1: number;
};

/** Better or worse from the values: a fall is better when lower is
 *  better (seconds fixing), a rise when higher is (speed). Equal or junk
 *  values are "same". */
export function slopeDirection(before: number, after: number, betterIsLower: boolean): SlopeDirection {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === after) return "same";
  return (after < before) === betterIsLower ? "better" : "worse";
}

/** The sketch shows what the change means, not which way the raw value
 *  moved: better always rises and worse always falls, matching
 *  `<ChangeRow>`'s ArrowUpRight / ArrowDownRight (so "less time fixing"
 *  rises). The words keep the literal figures ("down from 9.3"). A given
 *  `direction` (ChangeRow passes its own) wins over the values, so the
 *  icon and the sketch can never disagree. "same" is flat. */
export function slopeGeometry(
  before: number,
  after: number,
  betterIsLower: boolean,
  direction?: "better" | "worse",
): SlopeGeometry {
  const { top, bottom, mid, xBefore, xAfter, r } = SLOPE_BOX;
  const dir = direction ?? slopeDirection(before, after, betterIsLower);
  const yBefore = dir === "better" ? bottom : dir === "worse" ? top : mid;
  const yAfter = dir === "better" ? top : dir === "worse" ? bottom : mid;
  const len = Math.hypot(xAfter - xBefore, yAfter - yBefore);
  return {
    direction: dir,
    yBefore,
    yAfter,
    x1: xBefore + (r * (xAfter - xBefore)) / len,
    y1: yBefore + (r * (yAfter - yBefore)) / len,
  };
}
