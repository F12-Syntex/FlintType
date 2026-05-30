"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import {
  playerColorFor,
  progressOf,
  stoneSrc,
  stoneTierForWpm,
} from "./race-data";
import type { Racer, RacePhase } from "./race-types";

/** Race roster + live racetrack. Sits ABOVE the typing surface (the
 *  TypeRacer layout: the track on top, the passage you type below).
 *  One consolidated card so the user has exactly one place to look for
 *  "who am I racing and how am I doing."
 *
 *  ONE shared track: every racer is a flint stone on a single line,
 *  gliding toward the finish post on the right. The lone coral spark is
 *  the local user's stone (coral drop-shadow + a coral trail). A compact
 *  legend below carries the identity the stones can't (rank, handle,
 *  WPM) since beads bunch up and overlap mid-race.
 *
 *  Header carries the phase context (mode + status + the local
 *  words/wpm/acc strip while racing). Hidden in queue (no opponents to
 *  show) and absorbed by the RaceResults card once the race finishes
 *  (rendered below in the page tree). */
export function RaceLineupPanel({
  racers,
  totalChars,
  phase,
  modeName,
  joinedOpponents,
  totalOpponents,
  wordsDone,
  totalWords,
  wpm,
  accuracy,
}: {
  racers: readonly Racer[];
  totalChars: number;
  phase: RacePhase;
  modeName: string;
  joinedOpponents: number;
  totalOpponents: number;
  /** Local user's words-typed count during racing (absorbed into
   *  the header's right-side stat strip when racing/finished). */
  wordsDone: number;
  totalWords: number;
  wpm: number;
  accuracy: number;
}) {
  const { prefs } = useAppearancePrefs();
  const showColors = prefs.multiplayerPlayerColors;
  const showOpponentWpm = prefs.multiplayerShowOpponentWpm;

  const joined = racers.filter((r) => r.joinedAt != null);
  const you = joined.find((r) => r.isYou) ?? null;
  const opponents = joined
    .filter((r) => !r.isYou)
    .sort((a, b) => b.correctChars - a.correctChars);
  // Leaderboard order (you first in the legend so your row is easy to
  // find); the track itself layers you on top regardless of position.
  const ordered = you ? [you, ...opponents] : opponents;

  const racing = phase === "racing" || phase === "finished";
  const youPct = you
    ? Math.round(progressOf(you.correctChars, totalChars) * 100)
    : 0;

  /** Stone / dot / text accent for one racer: the local user is the one
   *  coral spark; opponents take their hand-tuned palette colour only
   *  when the player-colours pref is on, else neutral ink; disconnected
   *  drops to muted grey. */
  const accentFor = (r: Racer): string =>
    r.disconnected
      ? "var(--muted-foreground)"
      : r.isYou
        ? "var(--primary)"
        : showColors
          ? playerColorFor(r.id)
          : "var(--foreground)";

  return (
    <section
      aria-label="Race roster"
      className="flex shrink-0 flex-col gap-3.5 rounded-md border border-border bg-card/70 px-4 py-3.5 backdrop-blur-sm sm:gap-4 sm:px-6 sm:py-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground">
            {modeName}
          </span>
          <PhaseLabel
            phase={phase}
            joinedOpponents={joinedOpponents}
            totalOpponents={totalOpponents}
          />
        </div>
        {racing ? (
          <div className="flex items-baseline gap-x-5 gap-y-1 text-[10px] uppercase tracking-[0.16em] tabular-nums text-muted-foreground">
            <span>
              <span className="text-muted-foreground/70">Words</span>{" "}
              <span className="text-foreground">
                {wordsDone}/{totalWords}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground/70">WPM</span>{" "}
              <span className="text-primary">{wpm}</span>
            </span>
            <span>
              <span className="text-muted-foreground/70">Acc</span>{" "}
              <span className="text-foreground">{accuracy.toFixed(1)}%</span>
            </span>
          </div>
        ) : null}
      </header>

      {/* The single shared track: a ground line every stone rolls along,
       *  a coral trail from the start to YOUR stone, a finish post on the
       *  right, and every racer's flint stone gliding to its progress
       *  position. Stones get a tiny vertical micro-stagger (3 sub-levels)
       *  so a bunched-up pack reads as distinct beads rather than one
       *  blob, while staying visibly one line. */}
      <div
        role="group"
        aria-label="Live racetrack"
        className="relative h-16 sm:h-20"
      >
        {/* Ground line — the track surface. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-3 h-px bg-foreground/15"
        />
        {/* Your coral trail from the start to your stone (the one spark). */}
        {you ? (
          <div
            aria-hidden
            className="absolute bottom-3 left-0 h-[2px] rounded-full bg-primary/55 transition-[width] duration-150 ease-out"
            style={{ width: `${youPct}%` }}
          />
        ) : null}
        {/* Finish post + flag cap at the right edge. */}
        <span
          aria-hidden
          className="absolute right-0 bottom-2.5 h-10 w-px bg-foreground/30 sm:h-12"
        />
        <span
          aria-hidden
          className="absolute right-[-2px] top-0.5 size-2 rounded-[1px] bg-foreground/35"
        />
        {/* Stones — opponents first (lower z), you last (on top). */}
        {[...opponents, ...(you ? [you] : [])].map((r, idx) => {
          const pct = Math.round(progressOf(r.correctChars, totalChars) * 100);
          const tier = stoneTierForWpm(r.wpm);
          const stagger = (idx % 3) * 6; // 0 / 6 / 12 px — micro sub-levels
          return (
            <div
              key={r.id}
              className={cn(
                "absolute -translate-x-1/2 transition-[left] duration-150 ease-out",
                r.disconnected && "opacity-50",
              )}
              style={{
                left: `${pct}%`,
                bottom: `${6 + stagger}px`,
                zIndex: r.isYou ? 30 : 10 + idx,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stoneSrc(tier)}
                alt=""
                aria-hidden
                draggable={false}
                className="size-9 select-none sm:size-10 motion-safe:animate-[ft-stone-bob_1.3s_ease-in-out_infinite]"
                style={
                  r.isYou
                    ? {
                        filter:
                          "drop-shadow(0 0 7px color-mix(in oklch, var(--primary) 75%, transparent))",
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {/* Legend — the identity the stones can't carry: rank, handle, and
       *  WPM per racer. Wraps freely so an 8-racer FFA stays a couple of
       *  lines tall instead of N full lanes. */}
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {ordered.map((r, idx) => {
          const rank = idx + 1;
          const pct = Math.round(progressOf(r.correctChars, totalChars) * 100);
          const accent = accentFor(r);
          const showWpm = showOpponentWpm || r.isYou;
          return (
            <li
              key={r.id}
              role="progressbar"
              aria-label={`${r.name} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className={cn(
                "flex items-center gap-1.5 text-[11px] sm:text-[12px]",
                r.disconnected && "opacity-60",
              )}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-sm"
                style={{ backgroundColor: accent }}
              />
              <span
                className={cn(
                  "font-bold tabular-nums",
                  rank === 1 ? "text-primary" : "text-muted-foreground",
                )}
              >
                {rank.toString().padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "max-w-[14ch] truncate",
                  r.disconnected
                    ? "text-muted-foreground"
                    : r.isYou
                      ? "font-semibold text-foreground"
                      : "text-foreground/85",
                )}
              >
                {r.name}
              </span>
              {r.bot != null ? <BotChip /> : null}
              {r.disconnected ? (
                <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
                  Off
                </span>
              ) : r.place != null ? (
                <span className="text-[10px] font-semibold tabular-nums text-primary">
                  #{r.place}
                </span>
              ) : null}
              {showWpm ? (
                <span
                  className={cn(
                    "tabular-nums font-bold",
                    r.isYou ? "text-primary" : "text-foreground",
                  )}
                >
                  {r.wpm}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ─── Header phase-label ─────────────────────────────────────── */

function PhaseLabel({
  phase,
  joinedOpponents,
  totalOpponents,
}: {
  phase: RacePhase;
  joinedOpponents: number;
  totalOpponents: number;
}) {
  if (phase === "matching") {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-primary motion-safe:animate-pulse">
        Finding racers · {joinedOpponents}/{totalOpponents}
      </span>
    );
  }
  if (phase === "lobby") {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-primary motion-safe:animate-pulse">
        Lobby
      </span>
    );
  }
  if (phase === "countdown") {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-primary">
        Starting
      </span>
    );
  }
  if (phase === "racing") {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-primary">
        Live
      </span>
    );
  }
  if (phase === "finished") {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Finished
      </span>
    );
  }
  return null;
}

/** Tiny "BOT" chip painted beside an opponent's name so it's
 *  unmistakable which racers are AI-driven. Hairline border, muted
 *  fill, mono-tracked uppercase — reads as a system tag, not a
 *  badge, so a row of three bots doesn't shout. */
function BotChip() {
  return (
    <span
      aria-label="Bot opponent"
      className="inline-flex shrink-0 items-center rounded-md border border-foreground/15 bg-foreground/[0.04] px-1 py-[1px] text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
    >
      Bot
    </span>
  );
}
