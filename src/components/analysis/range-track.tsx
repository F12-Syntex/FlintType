import { cn } from "@/lib/utils";
import { anchorStyle, rangeGeometry } from "./track-geometry";

type RangeTrackProps = {
  low: number;
  high: number;
  /** The figure being placed against the range (the last test). */
  value?: number;
  format: (n: number) => string;
  /** The sentence a screen reader hears ("Usual range 77 to 81 wpm. Your
   *  last test 79 wpm."). */
  label: string;
  className?: string;
};

/** "Is this normal for me?": a usual range as a band on a track, with
 *  one ink dot for the value. Never orange. A wide band is labelled at
 *  both ends; a narrow one gets one label ("77 wpm to 81 wpm"), so the
 *  labels never collide, and ends that print alike get one label
 *  ("100%"), never the same figure twice (`rangeGeometry`). */
export function RangeTrack({ low, high, value, format, label, className }: RangeTrackProps) {
  const lo = Math.min(low, high);
  const hi = Math.max(low, high);
  const loText = format(lo);
  const hiText = format(hi);
  const g = rangeGeometry(low, high, value, loText === hiText);

  return (
    <div role="img" aria-label={label} className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 min-w-1.5 -translate-y-1/2 rounded-full bg-foreground/20"
          style={{ left: `${g.bandFrom}%`, width: `${g.bandTo - g.bandFrom}%` }}
        />
        {g.dot !== null ? (
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
            style={{ left: `${g.dot}%` }}
          />
        ) : null}
      </div>
      <div className="relative h-4 text-xs tabular-nums text-muted-foreground">
        {g.labels.kind === "ends" ? (
          <>
            <span className="absolute top-0 whitespace-nowrap" style={anchorStyle(g.labels.low)}>
              {loText}
            </span>
            <span className="absolute top-0 whitespace-nowrap" style={anchorStyle(g.labels.high)}>
              {hiText}
            </span>
          </>
        ) : (
          <span className="absolute top-0 whitespace-nowrap" style={anchorStyle(g.labels.at)}>
            {loText === hiText ? loText : `${loText} to ${hiText}`}
          </span>
        )}
      </div>
    </div>
  );
}
