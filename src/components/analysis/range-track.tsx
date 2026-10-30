"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  bandLeft,
  dotLeft,
  placeRangeLabels,
  type RangeLabelLayout,
  rangeText,
  rangeTextLines,
  sameLayout,
} from "./range-labels";
import { rangeGeometry } from "./track-geometry";

type RangeTrackProps = {
  low: number;
  high: number;
  /** The figure being placed against the range (the last test). */
  value?: number;
  format: (n: number) => string;
  /** The sentence a screen reader hears ("Your usual speed is between
   *  77 wpm and 81 wpm, and this test was 79 wpm."). */
  label: string;
  className?: string;
};

const LABEL = "absolute top-0 whitespace-nowrap";
const pct = (px: number, track: number) => `${(px / track) * 100}%`;

/** "Is this normal for me?": a usual range as a band on a track, with
 *  one ink dot for the value. Never orange. The band and the dot stay
 *  inside the track (`bandLeft`, `dotLeft`). The labels are placed for
 *  the track's measured width (`placeRangeLabels`): both band ends when
 *  they fit, else one "Between X and Y" label (two lines on a narrow
 *  track). They never overlap, never leave the track, and no end label
 *  sits under the dot or beside it past the band. They stay hidden until
 *  measured, which happens before the first paint, and follow the track
 *  as it resizes. */
export function RangeTrack({ low, high, value, format, label, className }: RangeTrackProps) {
  const loText = format(Math.min(low, high));
  const hiText = format(Math.max(low, high));
  const sameText = loText === hiText;
  const { bandFrom, bandTo, dot } = rangeGeometry(low, high, value);
  const one = rangeText(loText, hiText);
  const [line1, line2] = rangeTextLines(loText, hiText);

  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ layout: RangeLabelLayout; track: number } | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const box = measureRef.current;
    if (!row || !box) return;
    const texts = Array.from(box.children);
    const measure = () => {
      // Both read in the same (possibly transformed) space, and the
      // result renders as percentages of the row, so any scale cancels.
      const track = row.getBoundingClientRect().width;
      const [w0, w1, w2, w3, w4] = texts.map((el) => el.getBoundingClientRect().width);
      const layout =
        track > 0
          ? placeRangeLabels(
              { bandFrom, bandTo, dot },
              { track, low: w0 ?? 0, high: w1 ?? 0, one: w2 ?? 0, two: Math.max(w3 ?? 0, w4 ?? 0) },
              sameText,
            )
          : null;
      setPlaced((prev) =>
        prev?.track === track && sameLayout(prev.layout, layout) ? prev : layout ? { layout, track } : null,
      );
    };
    measure();
    // The row resizes with the page; the texts resize when the font loads.
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    for (const el of texts) ro.observe(el);
    return () => ro.disconnect();
  }, [bandFrom, bandTo, dot, sameText, loText, hiText, one, line1, line2]);

  const layout = placed?.layout ?? null;
  const track = placed?.track ?? 1;
  const twoLines = layout?.kind === "single" && layout.lines === 2;

  return (
    <div role="img" aria-label={label} className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 min-w-1.5 -translate-y-1/2 rounded-full bg-foreground/20"
          style={{ left: bandLeft(bandFrom), width: `${bandTo - bandFrom}%` }}
        />
        {dot !== null ? (
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
            style={{ left: dotLeft(dot) }}
          />
        ) : null}
      </div>
      <div ref={rowRef} className={cn("relative text-xs tabular-nums text-muted-foreground", twoLines ? "h-8" : "h-4")}>
        {/* What the placement measures: clipped, so a wide text never
            widens the page. */}
        <div ref={measureRef} aria-hidden className="invisible absolute inset-0 overflow-hidden">
          {[loText, hiText, one, line1, line2].map((t, i) => (
            <span key={i} className={cn(LABEL, "left-0")}>
              {t}
            </span>
          ))}
        </div>
        {layout?.kind === "ends" ? (
          <>
            <span className={LABEL} style={{ left: pct(layout.low, track) }}>
              {loText}
            </span>
            <span className={LABEL} style={{ left: pct(layout.high, track) }}>
              {hiText}
            </span>
          </>
        ) : layout?.kind === "single" ? (
          <span className={cn(LABEL, "text-center")} style={{ left: pct(layout.left, track) }}>
            {layout.lines === 2 ? (
              <>
                <span className="block">{line1}</span>
                <span className="block">{line2}</span>
              </>
            ) : (
              one
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
}
