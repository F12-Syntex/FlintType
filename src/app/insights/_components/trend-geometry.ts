/** Pixel geometry for the speed chart (trend-chart.tsx): which test the
 *  tooltip describes, and the room the y-axis labels need. Pure, so it
 *  is tested without a browser (trend-geometry.test.ts). */

/** About the widest a character of a 12 px axis label gets, in px. */
const LABEL_CHAR_PX = 8.5;
/** What recharts keeps between the axis edge and a label: the 6 px tick
 *  (drawn or not) and the chart's 6 px tick margin. */
const TICK_GAP_PX = 12;
/** The y-axis width for two-digit labels. */
export const MIN_Y_AXIS_PX = 32;

/** Room for the y-axis labels, so a three-digit speed ("240") or a
 *  decimal ("77.5") is never cut off at the card's edge. */
export function yAxisWidth(labels: readonly string[]): number {
  const longest = labels.reduce((n, s) => Math.max(n, s.length), 0);
  return Math.max(MIN_Y_AXIS_PX, Math.ceil(TICK_GAP_PX + 2 + LABEL_CHAR_PX * longest));
}

/** How far, in px, a dot reaches either side of the tooltip's column:
 *  the dot's radius (trend-chart.tsx draws r=4). */
export const DOT_REACH_PX = 4;

type Point = { t: number; value: number };
type Px = (n: number) => number | undefined;

/** The dot under the pointer. The chart's tooltip snaps to a row by x
 *  alone, and tests minutes apart share an x, so on its own it names
 *  the first test of a cluster whichever dot you hover. `at` is the
 *  tooltip's position: x is the column it snapped to, y is the
 *  pointer's height. Among the dots within `reach` px of that column,
 *  this returns the one nearest `at`; on a tie, the later one, which is
 *  drawn on top. Null when no dot is in reach or a scale is missing,
 *  so the caller keeps the row the tooltip snapped to. */
export function hoveredRow<T extends Point>(
  rows: readonly T[],
  at: { x: number; y: number } | undefined,
  x: Px | undefined,
  y: Px | undefined,
  reach = DOT_REACH_PX,
): T | null {
  if (!at || !x || !y || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return null;
  let best: T | null = null;
  let bestD = Infinity;
  for (const r of rows) {
    const dx = (x(r.t) ?? Number.NaN) - at.x;
    const dy = (y(r.value) ?? Number.NaN) - at.y;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > reach) continue;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      best = r;
      bestD = d;
    }
  }
  return best;
}
