"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { playerColorFor, progressOf } from "./race-data";
import { useRace } from "./race-state";
import type { Racer } from "./race-types";

/** Leaderboard strip across the top of the race surface. The
 *  human's lane is pinned to position 01 so it never reshuffles
 *  with mode changes or bot overtakes — you always look at the
 *  same row to find yourself. The bots beneath sort by progress
 *  (or final place once finished). Only your bar carries primary;
 *  bots stay neutral so the brand spark stays your anchor. */
export function RaceLanes() {
  const { state } = useRace();
  const { prefs } = useAppearancePrefs();
  const colorize = prefs.multiplayerPlayerColors;
  // Only joined racers appear in the lanes. During the matching
  // phase the user sees themselves + however many bots have already
  // hopped in, growing one row at a time as the schedule fires.
  // The user's lane is always lane 01; bot rows sort underneath.
  const you = state.racers.find((r) => r.isYou && r.joinedAt != null) ?? null;
  const joinedBots = state.racers.filter(
    (r) => !r.isYou && r.joinedAt != null,
  );
  const bots = sortBots(joinedBots, state.phase);
  const expectedSlots = state.racers.length;
  const filledSlots = (you ? 1 : 0) + bots.length;
  // Reserve a fixed min-height equivalent to the maximum 4-racer
  // grid so the passage below sits at the same vertical position in
  // every mode. Smaller modes (1v1, sprint, endurance) leave the
  // remainder as empty space instead of pulling the passage upward.
  return (
    <div className="flex min-h-[10rem] flex-col gap-3">
      {you ? (
        <Lane
          racer={you}
          pos={1}
          totalChars={state.totalChars}
          colorize={colorize}
        />
      ) : null}
      {bots.map((r, i) => (
        <Lane
          key={r.id}
          racer={r}
          pos={i + 2}
          totalChars={state.totalChars}
          colorize={colorize}
        />
      ))}
      {Array.from({ length: expectedSlots - filledSlots }).map((_, i) => (
        <WaitingSlot key={`slot-${i}`} pos={filledSlots + i + 1} />
      ))}
    </div>
  );
}

function WaitingSlot({ pos }: { pos: number }) {
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 sm:grid-cols-[36px_240px_1fr_90px] sm:gap-3.5">
      <span className="text-sm font-bold tabular-nums text-muted-foreground/40">
        {String(pos).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] text-muted-foreground/40">—</span>
        <span className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/60">
          waiting for opponent…
        </span>
      </div>
      <div
        className="relative col-span-2 h-5 overflow-hidden rounded-sm border border-dashed border-border/70 bg-muted/30 sm:col-span-1"
        aria-hidden
      />
      <div aria-hidden className="opacity-0">
        <span className="text-base font-bold tabular-nums">0</span>
      </div>
    </div>
  );
}

function Lane({
  racer,
  pos,
  totalChars,
  colorize,
}: {
  racer: Racer;
  pos: number;
  totalChars: number;
  /** When true, the bar paints in this racer's `playerColorFor`
   *  colour (so each racer is visually distinct mid-race). When
   *  false, bots all share the neutral foreground/55 fill — same
   *  default the project had before multiplayer colours shipped. */
  colorize: boolean;
}) {
  const prog = progressOf(racer.correctChars, totalChars);
  const status = racer.place != null ? `PLACE ${racer.place}` : racer.badge;
  const playerColor = playerColorFor(racer.id);
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 sm:grid-cols-[36px_240px_1fr_90px] sm:gap-3.5">
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          pos === 1 ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {String(pos).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] text-muted-foreground">{racer.flag}</span>
        <div className="flex flex-wrap items-center gap-2">
          {colorize ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: playerColor }}
            />
          ) : null}
          <span
            className={cn(
              "text-[13px] font-semibold",
              racer.isYou ? "text-primary" : "text-foreground",
            )}
          >
            {racer.name}
          </span>
          <span
            className={cn(
              "text-[8px] tracking-[0.16em]",
              racer.place === 1 ? "text-primary" : "text-muted-foreground/70",
            )}
          >
            {status}
          </span>
        </div>
      </div>
      <div className="relative col-span-2 h-5 overflow-hidden rounded-sm border border-border bg-muted sm:col-span-1">
        <div
          className={cn(
            "absolute top-0 bottom-0 left-0 transition-[width] duration-100 ease-linear",
            !colorize && racer.isYou && "bg-primary",
            !colorize && !racer.isYou && "bg-foreground/55",
            !colorize &&
              racer.finishedAt != null &&
              !racer.isYou &&
              "bg-foreground/40",
          )}
          style={{
            width: `${prog * 100}%`,
            backgroundColor: colorize ? playerColor : undefined,
          }}
        />
        {[0.25, 0.5, 0.75].map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-foreground/10"
            style={{ left: `${t * 100}%` }}
            aria-hidden
          />
        ))}
        <div
          className="absolute top-0 right-0 bottom-0 w-1 bg-primary"
          aria-hidden
        />
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-base font-bold tabular-nums",
            racer.isYou ? "text-primary" : "text-foreground",
          )}
        >
          {racer.wpm}
        </span>
        <span className="text-[9px] tracking-wide text-muted-foreground tabular-nums">
          {Math.round(prog * 100)}% done
        </span>
      </div>
    </div>
  );
}

function sortBots(racers: readonly Racer[], phase: string): Racer[] {
  const arr = [...racers];
  if (phase === "finished") {
    return arr.sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  }
  return arr.sort((a, b) => b.correctChars - a.correctChars);
}
