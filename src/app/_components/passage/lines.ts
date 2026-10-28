/** Line maths for the passage viewport (index.tsx). Pure, so the
 *  rules are unit-tested in lines.test.ts.
 *
 *  The passage reserves a whole number of lines (`reserved`: the Lines
 *  setting, or as many as fit). A passage shorter than that used to
 *  keep the empty lines anyway, which left a gap between a one-line
 *  quote and its credit. The viewport now hugs the text instead, and
 *  `growthPull` keeps that from moving the text mid-run. */

/** Lines the viewport shows: the text's own line count when it is
 *  shorter than the reservation, else the reservation.
 *
 *  While a run is in progress the count only grows. Typing never
 *  removes a line, but an extra letter or a wider mistake can push a
 *  word onto a new one; growing keeps that line visible, and never
 *  shrinking keeps the text and its credit still under the caret.
 *  `prev` is the count from the previous measurement. */
export function visibleLines(
  reserved: number,
  content: number,
  prev: number | null,
  running: boolean,
): number {
  const cap = Math.max(1, reserved);
  const fit = Math.min(cap, Math.max(1, content));
  if (running && prev != null) return Math.min(cap, Math.max(prev, fit));
  return fit;
}

/** Whole lines to scroll the text up so the caret's line stays in view
 *  with lookahead below it. Text that fits the reservation never
 *  scrolls. Otherwise the caret settles on the middle line, clamped to
 *  `cap - 2` so at least one upcoming line stays visible (#43 / FT-008:
 *  with cap 2 the caret would otherwise sit on the bottom line). */
export function scrollLines(
  cap: number,
  currentLine: number,
  content: number,
): number {
  if (content <= cap) return 0;
  const trigger = Math.max(0, Math.min(Math.floor(cap / 2), cap - 2));
  return Math.max(0, currentLine - trigger);
}

export type GrowthGeometry = {
  /** Height of the passage's centring column (px). */
  outer: number;
  /** Height of the slot above the text (the live readouts; 0 if none). */
  above: number;
  /** Height of everything under the text viewport (the quote credit
   *  and its margin; 0 if none). */
  credit: number;
  lineHeight: number;
  /** Lines the viewport showed when the run started. */
  restLines: number;
  /** Lines it shows now. */
  lines: number;
};

/** How far (px, never negative) to pull the text block's bottom margin
 *  up while a run is in progress.
 *
 *  The column centres {readouts, text, credit} as one group, so a line
 *  added mid-run (an extra letter or a wider mistake pushing a word
 *  down) would make the group taller and re-centre it: everything,
 *  the line under the caret included, would jump up half a line. A
 *  negative bottom margin equal to the growth keeps the group's layout
 *  height, so the new line grows downward into the space below and the
 *  text stays put (ui-law 10.3).
 *
 *  If the grown text would then run past the column's bottom edge, the
 *  pull eases off just enough for the group to rise and keep the last
 *  line in view. The credit may slip out of view in that tight case;
 *  the text never does. */
export function growthPull(g: GrowthGeometry): number {
  const growth = Math.max(0, g.lines - g.restLines) * g.lineHeight;
  if (growth <= 0) return 0;
  // Top of the group at rest, centred in the column.
  const top = (g.outer - (g.above + g.restLines * g.lineHeight + g.credit)) / 2;
  const textBottom = top + g.above + g.lines * g.lineHeight;
  const overflow = Math.max(0, textBottom - g.outer);
  // Each px the layout height grows lifts a centred group by half a px,
  // so rising by `overflow` means giving back twice that.
  return Math.max(0, growth - 2 * overflow);
}
