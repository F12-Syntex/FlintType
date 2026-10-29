import { cn } from "@/lib/utils";
import { SLOPE_BOX, slopeGeometry } from "./track-geometry";

type SlopeGlyphProps = {
  before: number;
  after: number;
  /** Whether a fall is the good direction (time a minute) or a rise is
   *  (speed). */
  betterIsLower: boolean;
  /** The row's own verdict. When given it sets the slope, so a row's
   *  icon and sketch always agree. */
  direction?: "better" | "worse";
  className?: string;
};

/** A 40×16 before-and-after sketch: a light before dot and an ink after
 *  dot joined by a line. It shows what the change means: better always
 *  rises and worse always falls, whichever way the raw value moved
 *  (`slopeGeometry`). Decorative (`aria-hidden`): the row's words carry
 *  the change and its literal figures. */
export function SlopeGlyph({ before, after, betterIsLower, direction, className }: SlopeGlyphProps) {
  const g = slopeGeometry(before, after, betterIsLower, direction);
  const { xBefore, xAfter, r } = SLOPE_BOX;

  return (
    <svg
      aria-hidden
      viewBox="0 0 40 16"
      width={40}
      height={16}
      data-direction={g.direction}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <line x1={g.x1} y1={g.y1} x2={xAfter} y2={g.yAfter} strokeWidth={1.5} className="stroke-foreground/50" />
      <circle cx={xBefore} cy={g.yBefore} r={r} className="fill-foreground/40" />
      <circle cx={xAfter} cy={g.yAfter} r={r} className="fill-foreground" />
    </svg>
  );
}
