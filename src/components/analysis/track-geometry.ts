/** Pure geometry for `<RangeTrack>` and `<ComparisonTrack>`: where the
 *  marks sit (percent of the track) and where each label goes, so labels
 *  never collide with each other and never leave the track. */

/** How a label hangs from its anchor: `start` grows right from it,
 *  `end` grows left from it (`right` = 100 − at), `center` straddles it. */
export type LabelAnchor = { at: number; align: "start" | "end" | "center" };

const clampPct = (x: number): number => Math.min(100, Math.max(0, x));
const finite = (x: number, fallback = 0): number => (Number.isFinite(x) ? x : fallback);

/** A label beside a track edge grows toward the middle once its anchor
 *  sits closer to that edge than this (percent of the track). */
const EDGE_ROOM = 25;

/** Below this band width (percent of the track) the two end labels
 *  can't both fit under the band, so the range gets one label instead. */
const SPLIT_MIN = 35;

export type RangeGeometry = {
  bandFrom: number;
  bandTo: number;
  dot: number | null;
  /** Two end labels, or one label for the whole range ("77 to 81 wpm"). */
  labels: { kind: "ends"; low: LabelAnchor; high: LabelAnchor } | { kind: "single"; at: LabelAnchor };
};

/** Domain [min(low, value) − 15% of the span, max(high, value) + 15%].
 *  A zero span is widened so the band still shows as a short pill. A band
 *  of at least 35% of the track gets a label at each end, each growing
 *  away from the other unless it sits near the track's edge (then both
 *  grow inward, which the band's width leaves room for). A narrower band,
 *  or any band whose ends print alike (`sameText`: 99.96 and 100 both
 *  read "100%"), gets one label, centred on it, or hung from its outer
 *  end near an edge, so the same figure is never printed twice. */
export function rangeGeometry(low: number, high: number, value?: number, sameText = false): RangeGeometry {
  let lo = finite(low);
  let hi = finite(high, lo);
  if (lo > hi) [lo, hi] = [hi, lo];
  const v = value === undefined || !Number.isFinite(value) ? null : value;
  const span = hi - lo > 0 ? hi - lo : Math.max(Math.abs(hi) * 0.1, 1);
  const min = Math.min(lo, v ?? lo) - 0.15 * span;
  const max = Math.max(hi, v ?? hi) + 0.15 * span;
  const at = (x: number) => clampPct(((x - min) / (max - min)) * 100);
  const bandFrom = at(lo);
  const bandTo = at(hi);
  const mid = (bandFrom + bandTo) / 2;
  const labels: RangeGeometry["labels"] =
    bandTo - bandFrom >= SPLIT_MIN && !sameText
      ? {
          kind: "ends",
          low: { at: bandFrom, align: bandFrom < EDGE_ROOM ? "start" : "end" },
          high: { at: bandTo, align: 100 - bandTo < EDGE_ROOM ? "end" : "start" },
        }
      : {
          kind: "single",
          at:
            mid < EDGE_ROOM
              ? { at: bandFrom, align: "start" }
              : mid > 100 - EDGE_ROOM
                ? { at: bandTo, align: "end" }
                : { at: mid, align: "center" },
        };
  return { bandFrom, bandTo, dot: v === null ? null : at(v), labels };
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

/** Inline style for a label hung from an anchor. */
export function anchorStyle(a: LabelAnchor): { left?: string; right?: string; transform?: string } {
  if (a.align === "start") return { left: `${a.at}%` };
  if (a.align === "end") return { right: `${100 - a.at}%` };
  return { left: `${a.at}%`, transform: "translateX(-50%)" };
}
