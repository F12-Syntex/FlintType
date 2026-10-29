import { cn } from "@/lib/utils";
import { comparisonGeometry } from "./track-geometry";

type ComparisonTrackProps = {
  better: number;
  recent: number;
  /** The track's full scale; callers pass max(recent, better) × 1.25. */
  max: number;
  /** Any figure ("4.5 s", "4.5 seconds a minute"): a caption too wide
   *  for half the track wraps, it never collides with the other one. */
  format: (n: number) => string;
  /** Captions for the two dots, better first: ["Better days", "Recently"]. */
  labels: [string, string];
  ariaLabel: string;
  className?: string;
};

const BETTER_FILL = "bg-foreground/40";
const RECENT_FILL = "bg-foreground";

function Caption({
  end,
  swatch,
  label,
  value,
}: {
  end: boolean;
  swatch: string;
  label: string;
  value: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-0.5", end ? "items-end text-right" : "items-start")}>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", swatch)} />
        {label}
      </span>
      <span className="text-xs font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

/** One dot on the track. The disc under the fill is opaque, so the
 *  segment never shows through the lighter better-days dot. */
function Dot({ at, fill }: { at: number; fill: string }) {
  return (
    <span
      className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card ring-2 ring-card"
      style={{ left: `${at}%` }}
    >
      <span className={cn("block size-full rounded-full", fill)} />
    </span>
  );
}

/** Recently against better days: two ink dots on one track, joined by a
 *  faint segment. The captions sit at the two ends of the track, in the
 *  dots' order (lower value left), each with a swatch matching its dot,
 *  so they never collide and identity never rests on position alone.
 *  The track is capped at `max-w-md` so on a wide row the captions stay
 *  near their dots (pass `max-w-none` to opt out). */
export function ComparisonTrack({
  better,
  recent,
  max,
  format,
  labels,
  ariaLabel,
  className,
}: ComparisonTrackProps) {
  const g = comparisonGeometry(better, recent, max);
  const betterCaption = { swatch: BETTER_FILL, label: labels[0], value: format(better) };
  const recentCaption = { swatch: RECENT_FILL, label: labels[1], value: format(recent) };
  const [first, second] = g.betterFirst ? [betterCaption, recentCaption] : [recentCaption, betterCaption];

  return (
    <div role="img" aria-label={ariaLabel} className={cn("flex w-full max-w-md flex-col gap-1.5", className)}>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-foreground/20"
          style={{ left: `${g.segFrom}%`, width: `${g.segTo - g.segFrom}%` }}
        />
        <Dot at={g.better} fill={BETTER_FILL} />
        <Dot at={g.recent} fill={RECENT_FILL} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <Caption end={false} {...first} />
        <Caption end {...second} />
      </div>
    </div>
  );
}
