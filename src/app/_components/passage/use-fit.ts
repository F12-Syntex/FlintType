"use client";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { AppearancePrefs } from "@/lib/appearance-prefs";

export const LINE_RATIO = 2.1;
const MIN_FONT_PX = 15; // absolute readable floor
const MAX_FONT_PX = 40; // comfortable ceiling at scale 1 (≈ 2.5rem)
// Phones: a 40px ceiling at a 2.1 line ratio fits 2–3 words per line
// on a 375px screen. Below 640px wide the ceiling drops so a line
// holds a readable phrase; the fit guarantee below is unchanged.
const MAX_FONT_PX_NARROW = 26;
const NARROW_VIEWPORT_PX = 640;

/** Fit-to-space sizing. Measure the passage's REAL available height and
 *  pick the font size + whole-line count that fit it — never a size
 *  taken off the viewport's height (which can't see the chrome stacked
 *  above the passage, the root cause of the "zoom the browser out to
 *  read the text" bug: a crowded surface left < 1 line of room, the old
 *  code forced one giant line anyway, and overflow-hidden + centring
 *  sliced it through the middle).
 *
 *  Algorithm, given available height H (minus the reserved `above`
 *  slot and quote credit) and the target whole-line count T:
 *    1. font = H / (T · LINE_RATIO)        — largest size fitting T lines
 *    2. clamp to [MIN, MAX·scale]          — Size preset raises the ceiling
 *    3. font = min(font, H / LINE_RATIO)   — but ALWAYS keep ≥1 whole line
 *    4. show min(T, ⌊H / lineHeight⌋) whole lines, clipped exactly
 *  Step 3 is the guarantee: at least one complete line always fits H, so
 *  a line is never sliced in half regardless of how little room is left.
 *  ResizeObserver covers container/viewport changes; a MutationObserver
 *  on <html> catches Size / palette CSS-var changes that restyle the
 *  passage without resizing its box. */
export function usePassageFit({
  outerRef,
  innerRef,
  aboveRef,
  groupRef,
  appearance,
  tapeOn,
}: {
  /** The centring column. */
  outerRef: RefObject<HTMLDivElement | null>;
  /** The text itself, inside the viewport. */
  innerRef: RefObject<HTMLDivElement | null>;
  /** The slot above the text (live readouts), if any. */
  aboveRef: RefObject<HTMLDivElement | null>;
  /** The text block: the viewport plus the credit under it. */
  groupRef: RefObject<HTMLDivElement | null>;
  appearance: AppearancePrefs;
  tapeOn: boolean;
}): { fontPx: number | null; lineHeight: number | null; clipHeight: number | null } {
  // High-water mark of the above-slot height within a measurement cycle.
  // The readouts can shrink mid-run (the "flash" live-stat style hides
  // stats most of the time), and we don't want the text to reflow every
  // time they fade out — so we reserve the tallest height seen and only
  // reset it when appearance changes (which re-runs the effect).
  const aboveMaxRef = useRef(0);
  // Clip the passage to a whole number of lines so a partial last line
  // never peeks through the bottom edge.
  const [clipHeight, setClipHeight] = useState<number | null>(null);
  // One computed line-height in px. Used as the viewport height in tape
  // mode (single-line layout) and as the unit for vertical scroll math.
  const [lineHeight, setLineHeight] = useState<number | null>(null);
  // Fit-to-space font size in px. The passage no longer takes a fixed
  // size off viewport-height media queries (which couldn't see how much
  // chrome sat above it, so a crowded surface clipped a giant line in
  // half and the user had to zoom the browser out). Instead we MEASURE
  // the real available height and pick the largest font that shows the
  // target whole-line count — shrinking when space is tight, capping at
  // the comfortable max when there's room. See the measure effect below.
  const [fontPx, setFontPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      // Reserve the above-slot's height (readouts + its gap) so the
      // centred group is `above + N lines`, not `N lines` overflowing
      // it. 0 when the slot is absent or hidden. High-water so a flash
      // hide doesn't reflow the text (see aboveMaxRef).
      const aboveNow = aboveRef.current?.offsetHeight ?? 0;
      aboveMaxRef.current = Math.max(aboveMaxRef.current, aboveNow);
      // Reserve the quote credit under the text too (0 elsewhere).
      // Without it a long quote that filled its lines pushed the group
      // past the column, and the viewport shrank into its last line.
      const group = groupRef.current;
      const credit = group
        ? Math.max(0, group.offsetHeight - (inner.parentElement?.offsetHeight ?? 0))
        : 0;
      const h = outer.clientHeight - aboveMaxRef.current - credit;
      if (!Number.isFinite(h) || h <= 0) return;

      // The Size preset (`--ft-font-scale`) raises/lowers the ceiling
      // rather than acting as a fixed multiplier, so a big preset stays
      // big when there's room but still yields to the fit guarantee when
      // space is tight. Read the cascaded value so it works on the real
      // surface (<html>) and inside scoped previews alike.
      const scaleRaw = getComputedStyle(inner)
        .getPropertyValue("--ft-font-scale")
        .trim();
      const scale = Number.parseFloat(scaleRaw) || 1;

      // Tape mode is a single line, so it sizes to fit ONE line in H;
      // multi-line sizes to fit the user's line target (default below).
      const target = tapeOn
        ? 1
        : appearance.linesRendered > 0
          ? appearance.linesRendered
          : 3;

      const ceiling =
        window.innerWidth < NARROW_VIEWPORT_PX ? MAX_FONT_PX_NARROW : MAX_FONT_PX;
      let font = h / (target * LINE_RATIO);
      font = Math.min(font, ceiling * scale);
      font = Math.max(font, MIN_FONT_PX);
      // Always keep at least one whole line within H (beats the floor in
      // pathologically short space) so a line is never sliced.
      font = Math.min(font, h / LINE_RATIO);

      const lh = font * LINE_RATIO;
      const fits = Math.max(1, Math.floor(h / lh));
      const shown = appearance.linesRendered > 0
        ? Math.min(appearance.linesRendered, fits)
        : fits;

      setFontPx(font);
      setLineHeight(lh);
      setClipHeight(shown * lh);
    };
    // Reset the high-water reservation per appearance change so a smaller
    // readouts size / a removed slot reclaims the space.
    aboveMaxRef.current = 0;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    if (aboveRef.current) ro.observe(aboveRef.current);
    // The credit appears (and changes) as quotes load.
    if (groupRef.current) ro.observe(groupRef.current);
    // Size / palette changes flip CSS vars on <html> without resizing the
    // box; observe its attribute mutations so the fit recomputes live.
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [appearance, tapeOn, outerRef, innerRef, aboveRef, groupRef]);

  return { fontPx, lineHeight, clipHeight };
}
