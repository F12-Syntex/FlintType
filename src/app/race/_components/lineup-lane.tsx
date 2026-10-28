"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { progressOf, stoneSrc, stoneTierForWpm } from "./race-data";
import type { Racer } from "./race-types";

/** One racer's lane in the lineup card:
 *
 *    [ ✓ name  bot ]  ( ····🔥··········· | )  [ status ]
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
        "flex items-center gap-2 sm:gap-4",
        r.disconnected && "opacity-60",
      )}
    >
      {/* Identity — ready check (lobby) or colour dot (racing) + name. */}
      <div className="flex w-28 shrink-0 items-center gap-2 sm:w-44">
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

      {/* Track — a rounded pill with a dashed ground line, the racer's
       *  stone, and the finish post. Stacked lanes line their posts up
       *  into one finish line. */}
      <div
        className={cn(
          "relative h-9 min-w-0 flex-1 rounded-pill",
          r.isYou ? "bg-primary/[0.07]" : "bg-muted/70",
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
              style={
                r.isYou
                  ? {
                      filter:
                        "drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 75%, transparent))",
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Status — WPM / place while racing, ready word in the lobby. */}
      <div className="flex w-14 shrink-0 justify-end whitespace-nowrap sm:w-20">
        <LaneStatus
          racer={r}
          racing={racing}
          showReady={showReady}
          showWpm={showWpm}
        />
      </div>
    </li>
  );
}

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
