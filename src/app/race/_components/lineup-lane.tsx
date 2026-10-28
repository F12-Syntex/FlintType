"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { progressOf, stoneSrc, stoneTierForWpm } from "./race-data";
import type { Racer } from "./race-types";

/** One racer's lane in the lineup card. From sm it's one row:
 *
 *    [ ✓ name  bot ]  ( ····🔥··········· | )  [ status ]
 *
 *  On phones it stacks (name + status above a full-width track) so the
 *  stone has the whole card width to travel instead of ~90px.
 *
 *  The track is a soft rounded pill; the racer's flint stone glides
 *  along a dashed ground line toward the finish post at the right end.
 *  Your own lane carries the orange trail + glowing stone (the lone
 *  spark); opponents stay ink, or their player colour when the pref is
 *  on. The glide is `transition-[left]` (functional motion) plus the
 *  motion-safe idle bob (ui-law §13). */
export function Lane({
  racer: r,
  totalChars,
  racing,
  showReady,
  accent,
  showWpm,
}: {
  racer: Racer;
  totalChars: number;
  racing: boolean;
  /** Private-lobby lobby phase only: show the ready check + word. In a
   *  public race (or once the countdown starts) readiness means nothing,
   *  so lanes show the colour dot and no status instead. */
  showReady: boolean;
  accent: string;
  showWpm: boolean;
}) {
  const progress = progressOf(r.correctChars, totalChars);
  const pct = Math.round(progress * 100);
  const tier = stoneTierForWpm(r.wpm);
  return (
    <li
      role="progressbar"
      aria-label={`${r.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        // Phones stack the lane: name + status on one row, then a
        // full-width track, so the stone has the card's whole width to
        // travel. From sm it's one row: name | track | status.
        "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4",
        r.disconnected && "opacity-60",
      )}
    >
      {/* Name row on phones; `sm:contents` dissolves it so identity and
       *  status become direct row items (ordered around the track). */}
      <div className="flex min-w-0 items-center justify-between gap-3 sm:contents">
        {/* Identity — ready check (lobby) or colour dot (racing) + name. */}
        <div className="flex min-w-0 items-center gap-2 sm:order-1 sm:w-44 sm:shrink-0">
          <LaneMark racer={r} showReady={showReady && !racing} accent={accent} />
          <span
            className={cn(
              "min-w-0 truncate text-[13px]",
              r.disconnected
                ? "text-muted-foreground"
                : r.isYou
                  ? "font-semibold text-foreground"
                  : "text-foreground/85",
            )}
          >
            {r.name}
          </span>
          {r.bot != null ? (
            <LaneTag label="Bot" aria-label="Bot opponent" />
          ) : !racing && r.isHost ? (
            <LaneTag label="Host" />
          ) : null}
        </div>

        {/* Status — WPM / place while racing, ready word in the lobby. */}
        <div className="flex shrink-0 justify-end whitespace-nowrap sm:order-3 sm:w-20">
          <LaneStatus
            racer={r}
            racing={racing}
            showReady={showReady}
            showWpm={showWpm}
          />
        </div>
      </div>

      {/* Track — a rounded pill with a dashed ground line, the racer's
       *  stone, and the finish post. Stacked lanes line their posts up
       *  into one finish line. Opponent tracks lift a touch in dark mode
       *  so the dark stone never sinks into a dark card. */}
      <div
        className={cn(
          "relative h-8 min-w-0 rounded-pill sm:order-2 sm:h-9 sm:flex-1",
          r.isYou ? "bg-primary/[0.07]" : "bg-muted/70 dark:bg-foreground/[0.07]",
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-2 right-3 w-0.5 rounded-full bg-foreground/20"
        />
        {/* Travel area, inset so the stone never overhangs the pill's
         *  rounded ends; at 100% it rests against the finish post. */}
        <div aria-hidden className="absolute inset-y-0 right-7 left-4">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-foreground/15" />
          {r.isYou ? (
            <div
              className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full bg-primary/60 transition-[width] duration-150 ease-out"
              style={{ width: `${pct}%` }}
            />
          ) : null}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-150 ease-out"
            style={{ left: `${pct}%` }}
          >
            {/* max-w-none: at left:100% the wrapper's shrink-to-fit width
             *  is 0, and preflight's img max-width:100% would collapse the
             *  stone to nothing right as it crosses the line. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stoneSrc(tier)}
              alt=""
              aria-hidden
              draggable={false}
              className="size-6 max-w-none select-none sm:size-7 motion-safe:animate-[ft-stone-bob_1.3s_ease-in-out_infinite]"
              style={{ filter: r.isYou ? YOU_GLOW : OPPONENT_HALO }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

/** Your stone: the orange spark. */
const YOU_GLOW =
  "drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 75%, transparent))";
/** Opponents' stones: a thin theme-aware halo (light in dark mode, a
 *  soft shadow in light mode) so the dark pebble art reads on any track. */
const OPPONENT_HALO =
  "drop-shadow(0 0 1.5px color-mix(in oklch, var(--foreground) 55%, transparent))";

/** Left mark on a lane. In a private lobby it's a round check so ready
 *  vs not ready reads down the column (filled orange = ready, host
 *  implied); everywhere else it's the racer's colour dot. */
function LaneMark({
  racer: r,
  showReady,
  accent,
}: {
  racer: Racer;
  showReady: boolean;
  accent: string;
}) {
  if (!showReady) {
    return (
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
      />
    );
  }
  const ready = r.ready || r.isHost;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full",
        ready
          ? "brand-surface text-primary-foreground"
          : "border border-muted-foreground/40",
      )}
    >
      {ready ? <Check size={10} strokeWidth={3.5} /> : null}
    </span>
  );
}

/** Right-hand status on a lane. Your own numbers are the orange spark;
 *  everyone else's stay ink. */
function LaneStatus({
  racer: r,
  racing,
  showReady,
  showWpm,
}: {
  racer: Racer;
  racing: boolean;
  showReady: boolean;
  showWpm: boolean;
}) {
  if (r.disconnected) {
    return <span className="text-xs text-muted-foreground">Left</span>;
  }
  if (r.place != null) {
    return (
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          r.isYou ? "text-primary" : "text-foreground",
        )}
      >
        #{r.place}
      </span>
    );
  }
  if (racing) {
    if (!showWpm) return null;
    return (
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          r.isYou ? "text-primary" : "text-foreground",
        )}
      >
        {r.wpm}
        <span className="ml-1 text-[11px] font-medium text-muted-foreground">
          wpm
        </span>
      </span>
    );
  }
  // Private lobby — the check carries ready/not; spell it out for
  // guests (the host is implicitly ready, so no word there).
  if (!showReady || r.isHost) return null;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        r.ready ? "text-primary" : "text-muted-foreground",
      )}
    >
      {r.ready ? "Ready" : "Not ready"}
    </span>
  );
}

/** Tiny tag beside a racer's name — "Bot" for AI opponents, "Host" for
 *  the lobby owner. A muted pill so a row of bots doesn't shout. */
function LaneTag({
  label,
  "aria-label": ariaLabel,
}: {
  label: string;
  "aria-label"?: string;
}) {
  return (
    <span
      aria-label={ariaLabel}
      className="inline-flex shrink-0 items-center rounded-pill bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground"
    >
      {label}
    </span>
  );
}
