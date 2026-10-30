/** Width-aware label placement for `<RangeTrack>`. Pure: the component
 *  measures the track and the label texts, this decides where they go,
 *  in px from the track's left edge. The rules, in order:
 *
 *  - The two band-end labels are used when they fit: each hangs from its
 *    end of the band, growing outward (away from the band) or inward
 *    (under it), with at least `LABEL_GAP` px between them.
 *  - A label never sits under the value dot (the dot and its ring), and
 *    never hangs on the dot's side of a band end the dot lies beyond: it
 *    grows toward the band instead, so it can't read as the dot's figure.
 *  - Every label stays inside the track. A label pushed off the dot or
 *    back inside the track may move at most `ATTACH` px from its band end.
 *  - Otherwise the range gets one label, `rangeText` ("Between X and Y",
 *    or the one figure when both ends print alike), centred on the band
 *    and kept inside the track. It goes on two lines (`rangeTextLines`)
 *    when one is wider than the track, or when only two lines can clear
 *    a dot that lies beyond the band. It steps off the dot when it can
 *    (`single`). Under a dot inside the band it can't misread: it names
 *    a range.
 *  - The marks are drawn inside the track: the dot's centre `DOT_R` in
 *    from the ends (`dotLeft`), and the band at least `BAND_MIN` wide,
 *    pulled in from the right end when that minimum would run past it
 *    (`bandLeft`). The labels attach to the band as drawn (`bandPx`). */

/** Space kept between the two end labels (px). */
export const LABEL_GAP = 8;
/** Half the value dot (`size-3`): its centre is kept this far inside the
 *  track's ends, so the dot never pokes past them (`dotLeft`). */
export const DOT_R = 6;
/** Half the width no label may overlap around the dot's centre: the dot
 *  plus its `ring-2`. */
export const DOT_ZONE = DOT_R + 2;
/** How far (px) a label's near edge may end up from its band end. */
export const ATTACH = 12;
/** The band's least drawn width (`min-w-1.5`). */
export const BAND_MIN = 6;

export type RangeLabelSizes = {
  /** The track's width. */
  track: number;
  /** The low and high end labels' widths. */
  low: number;
  high: number;
  /** The one-line single label's width (`rangeText`). */
  one: number;
  /** The two-line single label's width: the wider of `rangeTextLines`. */
  two: number;
};

/** Left edges in px. */
export type RangeLabelLayout =
  | { kind: "ends"; low: number; high: number }
  | { kind: "single"; left: number; lines: 1 | 2 };

/** The marks, in percent of the track (`rangeGeometry`). */
export type RangeMarks = { bandFrom: number; bandTo: number; dot: number | null };

/** The one label of a range whose ends can't both be shown. Ends that
 *  print alike read once ("100%"); otherwise "Between 97.6% and 98.3%",
 *  never "97.6% to 98.3%" (ui-law §27 bans "% to ") and never "X–Y". */
export function rangeText(loText: string, hiText: string): string {
  return loText === hiText ? loText : `Between ${loText} and ${hiText}`;
}

/** `rangeText` broken onto two lines for a narrow track. */
export function rangeTextLines(loText: string, hiText: string): [string, string] {
  return [`Between ${loText}`, `and ${hiText}`];
}

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), Math.max(lo, hi));

/** The dot's centre in px, kept `DOT_R` inside the track's ends. */
export function dotPx(dot: number, track: number): number {
  return clamp((dot / 100) * track, DOT_R, track - DOT_R);
}

/** The same position as CSS, for the drawn dot. */
export function dotLeft(dot: number): string {
  return `clamp(${DOT_R}px, ${dot}%, calc(100% - ${DOT_R}px))`;
}

/** The band as drawn, in px: at least `BAND_MIN` wide, its left edge
 *  pulled in so that minimum never runs past the track's right end. */
export function bandPx(bandFrom: number, bandTo: number, track: number): { bl: number; br: number } {
  const bl = clamp((bandFrom / 100) * track, 0, track - BAND_MIN);
  return { bl, br: bl + Math.max(((bandTo - bandFrom) / 100) * track, BAND_MIN) };
}

/** The band's left edge as CSS, matching `bandPx` (its width stays the
 *  band's percentage with `min-w-1.5`). */
export function bandLeft(bandFrom: number): string {
  return `min(${bandFrom}%, calc(100% - ${BAND_MIN}px))`;
}

/** Whether a label at [a, a + w] overlaps the dot and its ring. */
export function underDot(a: number, w: number, d: number | null): boolean {
  return d !== null && a < d + DOT_ZONE && a + w > d - DOT_ZONE;
}

/** An end label hung from `anchor`, growing left (−1) or right (+1),
 *  moved on in that direction to clear the dot, then clamped into the
 *  track. Null when that leaves it more than ATTACH px from its anchor,
 *  still on the dot, or wider than the track. */
function hang(anchor: number, w: number, grow: -1 | 1, d: number | null, W: number): number | null {
  if (w > W) return null;
  let a = grow > 0 ? anchor : anchor - w;
  if (d !== null && underDot(a, w, d)) a = grow > 0 ? d + DOT_ZONE : d - DOT_ZONE - w;
  a = clamp(a, 0, W - w);
  const near = grow > 0 ? a : a + w;
  return Math.abs(near - anchor) > ATTACH || underDot(a, w, d) ? null : a;
}

/** The best pair of end labels, or null when no pair fits. Outward
 *  (−1 for the low label, +1 for the high one) is tried first; the pair
 *  that moves its labels least from their band ends wins. */
function ends(bl: number, br: number, d: number | null, W: number, wl: number, wh: number): RangeLabelLayout | null {
  const lowGrow: (-1 | 1)[] = d !== null && d < bl ? [1] : [-1, 1];
  const highGrow: (-1 | 1)[] = d !== null && d > br ? [-1] : [1, -1];
  let best: RangeLabelLayout | null = null;
  let bestCost = Infinity;
  for (const gl of lowGrow) {
    for (const gh of highGrow) {
      const a1 = hang(bl, wl, gl, d, W);
      const a2 = hang(br, wh, gh, d, W);
      if (a1 === null || a2 === null || a1 + wl + LABEL_GAP > a2) continue;
      const cost = Math.abs((gl > 0 ? a1 : a1 + wl) - bl) + Math.abs((gh > 0 ? a2 : a2 + wh) - br);
      if (cost < bestCost) {
        best = { kind: "ends", low: a1, high: a2 };
        bestCost = cost;
      }
    }
  }
  return best;
}

/** One label for the range, centred on the band and kept inside the
 *  track. On the dot, it moves just clear of it when it can: toward the
 *  band when the dot lies beyond it, either way while its centre stays
 *  over the band when the dot is inside. One line when it fits the
 *  track, else two; two also when only two lines clear a dot beyond the
 *  band (a figure beside that dot would read as its own). */
function single(bl: number, br: number, d: number | null, W: number, one: number, two: number): RangeLabelLayout {
  const beyond = d !== null && (d < bl || d > br);
  const opts: { lines: 1 | 2; w: number }[] = [];
  if (one <= W) opts.push({ lines: 1, w: one });
  if (two < one) opts.push({ lines: 2, w: two });
  if (opts.length === 0) opts.push({ lines: 1, w: one });
  const placed = opts.map(({ lines, w }) => {
    const a0 = clamp((bl + br) / 2 - w / 2, 0, W - w);
    if (d === null || !underDot(a0, w, d)) return { lines, w, a: a0 };
    const sides = beyond ? [d > br ? d - DOT_ZONE - w : d + DOT_ZONE] : [d - DOT_ZONE - w, d + DOT_ZONE];
    const fits = sides.filter((a) => {
      const mid = a + w / 2;
      return a >= 0 && a + w <= W && (beyond || (mid >= bl - ATTACH && mid <= br + ATTACH));
    });
    const a = fits.sort((x, y) => Math.abs(x - a0) - Math.abs(y - a0))[0] ?? a0;
    return { lines, w, a };
  });
  const pick = (beyond && placed.find((p) => !underDot(p.a, p.w, d))) || placed[0]!;
  return { kind: "single", left: pick.a, lines: pick.lines };
}

/** Places the labels (see the file comment). `sameText`: both ends print
 *  alike, so the range always gets its one figure, once. */
export function placeRangeLabels(marks: RangeMarks, s: RangeLabelSizes, sameText: boolean): RangeLabelLayout {
  const W = Math.max(0, s.track);
  const { bl, br } = bandPx(marks.bandFrom, marks.bandTo, W);
  const d = marks.dot === null ? null : dotPx(marks.dot, W);
  const pair = sameText ? null : ends(bl, br, d, W, s.low, s.high);
  return pair ?? single(bl, br, d, W, s.one, sameText ? s.one : s.two);
}

/** Two layouts that render the same. */
export function sameLayout(a: RangeLabelLayout | null, b: RangeLabelLayout | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === "ends" && b.kind === "ends") return a.low === b.low && a.high === b.high;
  if (a.kind === "single" && b.kind === "single") return a.left === b.left && a.lines === b.lines;
  return false;
}
