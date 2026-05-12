"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { playerColorFor, progressOf } from "./race-data";
import type { Racer } from "./race-types";

/** Stacked per-racer progress rows below the passage. Each racer
 *  (incl. you) gets one row: colour dot + handle + thin bar + live
 *  WPM. Replaces the older single-bar strip — that read fine for one
 *  glance but couldn't tell you who was leading without a guess.
 *
 *  Sort: you pinned to the top so the eye always lands on your own
 *  bar first; opponents below in current-leader order so the racer
 *  closest to you is adjacent. */
export function RacePlayerStrip({
  racers,
  totalChars,
}: {
  racers: readonly Racer[];
  totalChars: number;
}) {
  const { prefs } = useAppearancePrefs();
  const showColors = prefs.multiplayerPlayerColors;
  const showOpponentWpm = prefs.multiplayerShowOpponentWpm;

  const joined = racers.filter((r) => r.joinedAt != null);
  const you = joined.find((r) => r.isYou) ?? null;
  const opponents = joined
    .filter((r) => !r.isYou)
    .sort((a, b) => b.correctChars - a.correctChars);
  const ordered = you ? [you, ...opponents] : opponents;

  return (
    <div className="flex flex-col gap-1.5">
      {ordered.map((r) => (
        <RacerRow
          key={r.id}
          racer={r}
          totalChars={totalChars}
          showColors={showColors}
          showWpm={showOpponentWpm || r.isYou}
        />
      ))}
    </div>
  );
}

function RacerRow({
  racer,
  totalChars,
  showColors,
  showWpm,
}: {
  racer: Racer;
  totalChars: number;
  showColors: boolean;
  showWpm: boolean;
}) {
  const prog = progressOf(racer.correctChars, totalChars);
  const pct = Math.round(prog * 100);
  const color = playerColorFor(racer.id);
  const place = racer.place;
  return (
    <div
      className="grid grid-cols-[10px_84px_minmax(0,1fr)_44px] items-center gap-2.5"
      role="progressbar"
      aria-label={`${racer.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-sm"
        style={{
          backgroundColor: showColors || racer.isYou ? color : "var(--muted-foreground)",
        }}
      />
      <span
        className={cn(
          "truncate text-[11px] tabular-nums",
          racer.isYou ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {racer.name}
        {place != null ? (
          <span className="ml-1.5 text-[9px] uppercase tracking-[0.18em] text-primary">
            #{place}
          </span>
        ) : null}
      </span>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-[width] duration-100 ease-linear",
            !showColors && !racer.isYou && "bg-foreground/55",
          )}
          style={{
            width: `${pct}%`,
            backgroundColor:
              showColors || racer.isYou ? color : undefined,
          }}
        />
      </div>
      <span
        className={cn(
          "text-right text-[10px] tabular-nums",
          racer.isYou ? "text-primary" : "text-muted-foreground",
        )}
      >
        {showWpm ? racer.wpm : ""}
      </span>
    </div>
  );
}
