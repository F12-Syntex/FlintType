"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { playerColorFor, progressOf } from "./race-data";
import type { Racer } from "./race-types";

/** Per-racer progress ledger below the passage. Each racer is one
 *  horizontal line: square colour tick, handle, bar, live WPM. You
 *  sit pinned at the top; opponents below in current-leader order so
 *  the racer closest to you is always adjacent.
 *
 *  Layout choices that anchor the editorial-mechanical feel:
 *    - Tick is a 6 × 6 sharp-corner square (project's severity-dot
 *      shape, ui-law §11), in player colour
 *    - Handles render in font-mono so the column reads as a fixed
 *      ledger (no jitter as bot names cycle)
 *    - Progress bar is `h-1` `rounded-sm` (not a pill) so it inherits
 *      the same hairline rhythm as the rest of the page chrome
 *    - WPM uses tabular-nums so single-vs-double-digit values don't
 *      jiggle the right edge */
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
    <div className="flex flex-col gap-2">
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
  const disconnected = racer.disconnected;
  // Error tail width: cap at the racer's current progress so the
  // destructive overlay can't extend past the racer's bar fill.
  const errorWidth =
    totalChars > 0
      ? Math.min(prog, racer.errors / totalChars) * 100
      : 0;
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(72px,140px)_minmax(0,1fr)_auto] items-center gap-3",
        disconnected && "opacity-60",
      )}
      role="progressbar"
      aria-label={`${racer.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className={cn(
            "truncate font-mono text-[11px]",
            disconnected
              ? "text-muted-foreground"
              : racer.isYou
                ? "font-semibold text-foreground"
                : "text-foreground/85",
          )}
        >
          {racer.name}
        </span>
        {disconnected ? (
          <span
            className="shrink-0 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80"
            title="Racer left the room"
          >
            Disconnected
          </span>
        ) : place != null ? (
          <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
            #{place}
          </span>
        ) : null}
      </div>
      <div className="relative h-1 overflow-hidden rounded-sm bg-muted">
        {/* Player-colour fill from 0 → progress. */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-[width] duration-150 ease-out",
            !showColors && !racer.isYou && !disconnected && "bg-foreground/55",
            disconnected && "bg-muted-foreground/40",
          )}
          style={{
            width: `${pct}%`,
            backgroundColor:
              !disconnected && (showColors || racer.isYou) ? color : undefined,
          }}
        />
        {/* Destructive tail at the right end of the progress fill,
         *  showing accumulated errors. Only painted when racer has
         *  errors AND has typed at least something. Sits on top of
         *  the player-colour fill so the tip of the bar reads red as
         *  the user mistypes. */}
        {errorWidth > 0 && !disconnected ? (
          <div
            aria-hidden
            className="absolute inset-y-0 transition-[left,width] duration-150 ease-out"
            style={{
              left: `${pct - errorWidth}%`,
              width: `${errorWidth}%`,
              backgroundColor: "var(--destructive)",
            }}
          />
        ) : null}
      </div>
      <div className="flex w-12 items-baseline justify-end gap-1 font-mono text-[10px] tabular-nums">
        {showWpm ? (
          <>
            <span
              className={cn(
                "text-[11px] font-semibold",
                disconnected
                  ? "text-muted-foreground"
                  : racer.isYou
                    ? "text-primary"
                    : "text-foreground",
              )}
            >
              {racer.wpm}
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
              wpm
            </span>
          </>
        ) : (
          <span aria-hidden className="opacity-0">
            00
          </span>
        )}
      </div>
    </div>
  );
}
