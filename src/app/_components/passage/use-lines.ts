"use client";

import { type RefObject, useCallback, useLayoutEffect, useState } from "react";
import { growthPull, visibleLines } from "./lines";

type LineFit = {
  /** Lines the viewport shows. */
  shown: number;
  /** Lines it showed when the run started (or now, at rest). */
  rest: number;
  /** Bottom-margin pull on the text block, px. */
  pull: number;
};

/** Hugs the passage viewport to the text's own lines and keeps it still
 *  while a run is in progress. The maths lives in lines.ts
 *  (unit-tested); this hook only measures the DOM.
 *
 *  - The viewport reserves `clipHeight` (whole lines), but text shorter
 *    than that shows only its own lines, so a one-line quote's credit
 *    sits right under it (`visibleLines`).
 *  - Mid-run the count only grows, and any growth is cancelled out of
 *    the centred group's layout height (`growthPull`), so a line added
 *    by an extra letter grows downward instead of shifting the text.
 *
 *  Returns the viewport height in px (null until measured, and in tape
 *  mode, which sizes itself) and the pull for the text block. */
export function usePassageLines({
  outerRef,
  aboveRef,
  groupRef,
  innerRef,
  lineHeight,
  clipHeight,
  tapeOn,
  running,
  words,
  typed,
}: {
  /** The centring column. */
  outerRef: RefObject<HTMLDivElement | null>;
  /** The slot above the text (live readouts), if any. */
  aboveRef: RefObject<HTMLDivElement | null>;
  /** The text block: the viewport plus the credit under it. */
  groupRef: RefObject<HTMLDivElement | null>;
  /** The text itself, inside the viewport. */
  innerRef: RefObject<HTMLDivElement | null>;
  lineHeight: number | null;
  clipHeight: number | null;
  tapeOn: boolean;
  running: boolean;
  /** The passage and the typed buffer: a change re-measures. */
  words: readonly string[];
  typed: readonly string[];
}): { height: number | null; pull: number } {
  const [fit, setFit] = useState<LineFit | null>(null);

  const measure = useCallback(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    const group = groupRef.current;
    if (!inner || !outer || !group || tapeOn) return;
    if (lineHeight == null || clipHeight == null || lineHeight <= 0) return;
    const reserved = Math.max(1, Math.round(clipHeight / lineHeight));
    const content = Math.round(inner.offsetHeight / lineHeight);
    const geometry = {
      outer: outer.clientHeight,
      above: aboveRef.current?.offsetHeight ?? 0,
      // Everything in the block under the viewport: the quote credit or
      // the loading line, margins included.
      credit: Math.max(
        0,
        group.offsetHeight - (inner.parentElement?.offsetHeight ?? 0),
      ),
      lineHeight,
    };
    setFit((prev) => {
      const shown = visibleLines(reserved, content, prev?.shown ?? null, running);
      const rest = running && prev ? Math.min(prev.rest, shown) : shown;
      const pull = running
        ? growthPull({ ...geometry, restLines: rest, lines: shown })
        : 0;
      return prev && prev.shown === shown && prev.rest === rest && prev.pull === pull
        ? prev
        : { shown, rest, pull };
    });
  }, [innerRef, outerRef, groupRef, aboveRef, tapeOn, lineHeight, clipHeight, running]);

  // Before paint whenever the text, the line fit or the phase changes.
  useLayoutEffect(() => {
    measure();
  }, [measure, words, typed]);

  // Re-wraps from width or appearance changes, and a column that resizes
  // without changing the line fit.
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => measure());
    for (const el of [innerRef.current, outerRef.current]) {
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [measure, innerRef, outerRef]);

  if (tapeOn || clipHeight == null) return { height: null, pull: 0 };
  return {
    height:
      fit && lineHeight != null
        ? Math.min(clipHeight, fit.shown * lineHeight)
        : clipHeight,
    pull: fit?.pull ?? 0,
  };
}
