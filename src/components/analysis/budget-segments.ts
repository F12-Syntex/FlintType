import { secShort } from "@/lib/format-figure";
import { SLICE_ORDER, type SliceKey, type SliceSet } from "@/types/typing-analysis";

/** The ordinal ink ramp, darkest first, in `SLICE_ORDER`. Validated with
 *  the dataviz ordinal checks against `--card` in light and dark
 *  (adjacent ΔL ≥ 0.06, lightest step ≥ 2:1). `<BudgetTable>` swatches use
 *  the same fills so every segment matches its row without hover. */
export const SLICE_FILL: Record<SliceKey, string> = {
  typing: "bg-foreground/85",
  fixing: "bg-foreground/72",
  before: "bg-foreground/60",
  inside: "bg-foreground/47",
  breaks: "bg-foreground/35",
};

/** The fill for one slice; the focus slice is the view's one orange mark. */
export function sliceFill(key: SliceKey, focus?: SliceKey | null): string {
  return key === focus ? "bg-primary" : SLICE_FILL[key];
}

/** Minimum share a non-zero slice gets, so a sliver stays visible. */
const MIN_PCT = 2;

/** Whether the table twin would show this many seconds as more than
 *  "0 s". A slice it prints as "0 s" (under 0.05 s) draws no segment, so
 *  the bar and its table never disagree. */
const shown = (s: number): boolean => Number.isFinite(s) && s > 0 && secShort(s * 1000) !== "0 s";

/** Segment widths for a `<MinuteBar>`, as percentages in `SLICE_ORDER`.
 *  Every slice the table shows as more than "0 s" gets at least 2%; the
 *  larger slices give up that room in proportion to their size. A slice
 *  under 0.05 s, which the table prints as "0 s", counts as 0. The result sums to exactly 100 at
 *  one decimal (largest remainder), or is all zeros when nothing was
 *  timed. `total` is the bar's full scale (60 for a minute, T/1000 for a
 *  test); the shares come from the slices themselves, so a slice set that
 *  misses its total by a rounding step still fills the bar exactly.
 *  Negative and non-finite values read as 0. */
export function budgetSegments(slices: SliceSet, total: number): number[] {
  const raw = SLICE_ORDER.map((k) => (shown(slices[k]) ? slices[k] : 0));
  const sum = raw.reduce((a, b) => a + b, 0);
  const scale = sum > 0 ? sum : Number.isFinite(total) && total > 0 ? total : 0;
  if (sum <= 0 || scale <= 0) return raw.map(() => 0);

  let pct = raw.map((v) => (v / scale) * 100);
  // Lift slivers to the floor and shrink the rest in proportion. Lifting
  // can push a mid-sized slice under the floor in turn, so repeat until
  // nothing moves (at most one pass per slice).
  const floored = new Set<number>();
  for (let pass = 0; pass < SLICE_ORDER.length; pass++) {
    const lift = pct.findIndex((p, i) => p > 0 && p < MIN_PCT && !floored.has(i));
    if (lift === -1) break;
    pct.forEach((p, i) => {
      if (p > 0 && p < MIN_PCT) floored.add(i);
    });
    const free = 100 - floored.size * MIN_PCT;
    const rest = pct.reduce((a, p, i) => (floored.has(i) ? a : a + p), 0);
    pct = pct.map((p, i) => (floored.has(i) ? MIN_PCT : rest > 0 ? (p / rest) * free : 0));
  }
  return roundToTenths(pct);
}

/** Largest-remainder rounding to one decimal, summing to exactly 100. */
function roundToTenths(pct: readonly number[]): number[] {
  const tenths = pct.map((p) => p * 10);
  const floors = tenths.map(Math.floor);
  let left = 1000 - floors.reduce((a, b) => a + b, 0);
  const order = tenths
    .map((t, i) => ({ i, rem: t - floors[i] }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    if (pct[i] <= 0) continue;
    floors[i] += 1;
    left -= 1;
  }
  return floors.map((f) => f / 10);
}
