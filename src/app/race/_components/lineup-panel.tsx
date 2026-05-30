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
      <ol className="flex max-h-[34vh] flex-col gap-1.5 overflow-y-auto sm:gap-2">
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
  // Fire tier (0..6) tracks the racer's live speed — the field ignites
  // as it goes. Buckets are coarse (25–35 wpm wide) so the stone holds
  // steady mid-race rather than flickering at a boundary.
  const stoneTier = stoneTierForWpm(racer.wpm);
  const place = racer.place;
  const disconnected = racer.disconnected;
  const isYou = racer.isYou;
  // Lane accent: the local user is the one coral spark; opponents take
  // their hand-tuned palette colour only when the player-colours pref
  // is on, else neutral ink. Disconnected drops to muted grey.
  const accent = disconnected
    ? "var(--muted-foreground)"
    : isYou
      ? "var(--primary)"
      : showColors
        ? playerColorFor(racer.id)
        : "var(--foreground)";

  return (
    <li
      role="progressbar"
      aria-label={`${racer.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        "grid grid-cols-[22px_minmax(60px,140px)_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3",
        disconnected && "opacity-60",
      )}
    >
      {/* Rank — leader in the coral spark, the rest muted. */}
      <span
        className={cn(
          "text-[14px] font-bold tabular-nums sm:text-[15px]",
          rank === 1 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {rank.toString().padStart(2, "0")}
      </span>

      {/* Handle + bot / place / disconnected tag, single line. */}
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 truncate text-[12px] sm:text-[13px]",
          disconnected
            ? "text-muted-foreground"
            : isYou
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

      {/* The racetrack lane: a ground line the stone rolls along, a
       *  scorch trail from the start to the stone, a finish post on the
       *  right, and the flint stone gliding to its progress position.
       *  The stone tier escalates with the racer's speed (pebble →
       *  inferno) so the field visibly ignites. */}
      <div className="relative h-11 sm:h-12">
        {/* Ground line — the track surface. Coral for you, faint ink
         *  for opponents. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-3 h-px"
          style={{
            backgroundColor: accent,
            opacity: isYou ? 0.5 : disconnected ? 0.12 : 0.16,
          }}
        />
        {/* Scorch trail from the start to the stone. */}
        <div
          aria-hidden
          className="absolute bottom-3 left-0 h-[2px] rounded-full transition-[width] duration-150 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: accent,
            opacity: disconnected ? 0.25 : isYou ? 0.55 : showColors ? 0.45 : 0.3,
          }}
        />
        {/* Finish post + flag cap at the right edge. */}
        <span
          aria-hidden
          className="absolute right-0 bottom-1.5 h-8 w-px bg-foreground/30"
        />
        <span
          aria-hidden
          className="absolute right-[-2px] top-1 size-2 rounded-[1px] bg-foreground/35"
        />
        {/* The stone — glides along the lane to the progress position;
         *  the inner img carries the subtle idle bob (motion-safe). */}
        <div
          className="absolute bottom-1.5 -translate-x-1/2 transition-[left] duration-150 ease-out"
          style={{ left: `${pct}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stoneSrc(stoneTier)}
            alt=""
            aria-hidden
            draggable={false}
            className="size-9 select-none sm:size-10 motion-safe:animate-[ft-stone-bob_1.3s_ease-in-out_infinite]"
            style={
              isYou
                ? {
                    filter:
                      "drop-shadow(0 0 7px color-mix(in oklch, var(--primary) 75%, transparent))",
                  }
                : undefined
            }
          />
        </div>
      </div>

      {/* WPM + percent cluster, right-aligned. Bigger WPM so the live
       *  speed reads across the room. */}
      <div className="flex items-baseline justify-end gap-2">
        <span
          className={cn(
            "text-[16px] font-bold tabular-nums sm:text-[18px]",
            disconnected
              ? "text-muted-foreground"
              : isYou
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
