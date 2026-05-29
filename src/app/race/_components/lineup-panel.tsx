"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { playerColorFor, progressOf } from "./race-data";
import type { Racer, RacePhase } from "./race-types";

/** Race roster + live racetrack. Sits ABOVE the typing surface (the
 *  TypeRacer layout: lanes on top, the passage you type below). One
 *  consolidated card so the user has exactly one place to look for
 *  "who am I racing and how am I doing."
 *
 *  Header carries the phase context (mode + status + the local
 *  words/wpm/acc strip while racing). Body is a ledger of compact
 *  lanes: each racer is a bead gliding along its own lane toward the
 *  finish post on the right, with a player-coloured trail behind it.
 *  The bead reads at a glance — no need to parse a number to know
 *  who's ahead.
 *
 *  Hidden in queue (no opponents to show) and absorbed by the
 *  RaceResults card once the race finishes (rendered below in the
 *  page tree). */
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
  const ordered = you ? [you, ...opponents] : opponents;

  const racing = phase === "racing" || phase === "finished";

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

      {/* Lanes. Capped height + internal scroll so a full 8-racer FFA
       *  lobby never crushes the passage below it. Common 1v1 / small
       *  lobbies never reach the cap. */}
      <ol className="flex max-h-[42vh] flex-col gap-2.5 overflow-y-auto sm:gap-3">
        {ordered.map((r, idx) => (
          <RacerLane
            key={r.id}
            racer={r}
            rank={idx + 1}
            totalChars={totalChars}
            showColors={showColors}
            showWpm={showOpponentWpm || r.isYou}
          />
        ))}
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

/* ─── Racer lane (the racetrack) ──────────────────────────────── */

function RacerLane({
  racer,
  rank,
  totalChars,
  showColors,
  showWpm,
}: {
  racer: Racer;
  rank: number;
  totalChars: number;
  showColors: boolean;
  showWpm: boolean;
}) {
  const prog = progressOf(racer.correctChars, totalChars);
  const pct = Math.round(prog * 100);
  const color = playerColorFor(racer.id);
  const place = racer.place;
  const disconnected = racer.disconnected;
  // Errors accumulated at the leading edge — a short destructive
  // segment trailing the bead so a sloppy racer reads visibly "hot".
  const errorWidth =
    totalChars > 0 ? Math.min(prog, racer.errors / totalChars) * 100 : 0;
  // Trail + bead colour: the local user is always the coral spark;
  // opponents take their hand-tuned palette colour only when the
  // player-colours pref is on, else a neutral ink. Disconnected racers
  // drop to a muted grey regardless.
  const fill = disconnected
    ? "var(--muted-foreground)"
    : showColors || racer.isYou
      ? color
      : undefined;

  return (
    <li
      role="progressbar"
      aria-label={`${racer.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        "grid grid-cols-[18px_minmax(56px,132px)_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3",
        disconnected && "opacity-60",
      )}
    >
      {/* Rank — leader in the coral spark, the rest muted. */}
      <span
        className={cn(
          "text-[12px] font-bold tabular-nums sm:text-[13px]",
          rank === 1 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {rank.toString().padStart(2, "0")}
      </span>

      {/* Handle + bot/place/disconnected tag, single line. */}
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 truncate text-[12px] sm:text-[13px]",
          disconnected
            ? "text-muted-foreground"
            : racer.isYou
              ? "font-semibold text-foreground"
              : "text-foreground/85",
        )}
      >
        <span className="truncate">{racer.name}</span>
        {racer.bot != null ? <BotChip /> : null}
        {disconnected ? (
          <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
            Off
          </span>
        ) : place != null ? (
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-primary">
            #{place}
          </span>
        ) : null}
      </span>

      {/* The lane. A road (muted, inset hairline), a player-coloured
       *  trail behind the bead, the destructive error segment at the
       *  tip, a finish post on the right, and the racer bead gliding
       *  to its progress position. The bead rides ON the lane (size-3,
       *  taller than the h-2.5 road) so it reads as a distinct object,
       *  not just a bar cap. */}
      <div className="relative h-2.5">
        {/* Road + trail + error, clipped to the rounded lane so the
         *  fills never spill past the ends. The bead + finish post are
         *  siblings outside this layer so the bead can ride past the
         *  lane edges as a distinct object. */}
        <div className="absolute inset-0 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-out",
              !fill && "bg-foreground/65",
            )}
            style={{ width: `${pct}%`, backgroundColor: fill }}
          />
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
        {/* Finish post. */}
        <span
          aria-hidden
          className="absolute -top-0.5 -bottom-0.5 right-0 w-px bg-foreground/30"
        />
        {/* Racer bead — glides to its progress position. */}
        <span
          aria-hidden
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background transition-[left] duration-150 ease-out"
          style={{
            left: `${pct}%`,
            backgroundColor: disconnected
              ? "var(--muted-foreground)"
              : fill ?? "var(--foreground)",
          }}
        />
      </div>

      {/* WPM + percent cluster, right-aligned. Compact so the lane
       *  stays the dominant element. */}
      <div className="flex items-baseline justify-end gap-2">
        <span
          className={cn(
            "text-[14px] font-bold tabular-nums sm:text-[15px]",
            disconnected
              ? "text-muted-foreground"
              : racer.isYou
                ? "text-primary"
                : "text-foreground",
          )}
        >
          {showWpm ? racer.wpm : ""}
        </span>
        <span className="w-9 text-right text-[10px] uppercase tracking-[0.12em] tabular-nums text-muted-foreground/80">
          {pct}%
        </span>
      </div>
    </li>
  );
}
