"use client";

import { Check } from "lucide-react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import {
  playerColorFor,
  progressOf,
  stoneSrc,
  stoneTierForWpm,
} from "./race-data";
import type { Racer, RacePhase } from "./race-types";

/** Race roster + live racetrack, the TypeRacer way: ONE horizontal lane
 *  per racer. Each lane reads left to right —
 *
 *    [ ✓  name ]   ·····🔥·············🏁   [ status / wpm ]
 *
 *  the flint stone glides along its own dashed track toward the finish
 *  post on the right. Sits ABOVE the typing surface and is the single
 *  "who am I racing and how am I doing" surface for every pre-finish
 *  phase:
 *
 *    - lobby / countdown — stones rest at the start line; the left mark
 *      is a checkbox so ready vs not-ready reads down the column at a
 *      glance (the host is implicitly ready).
 *    - racing — stones glide by progress; the right column shows WPM and
 *      the left mark becomes the racer's colour dot.
 *
 *  The local user is the lone coral spark (coral stone glow + a coral
 *  trail behind their stone); opponents stay neutral ink, or their
 *  hand-tuned `playerColorFor` when the player-colours pref is on. A
 *  finished racer shows their place. Lanes keep a STABLE order (you
 *  first, then join order) so an overtake reads as the stone gliding
 *  past, never the whole row jumping. Hidden in queue, and absorbed by
 *  the RaceResults card once the race finishes. */
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
  // Stable lane order: you first, then opponents by join order (id
  // tie-break) so lanes never swap places mid-race.
  const opponents = joined
    .filter((r) => !r.isYou)
    .sort((a, b) => {
      const ja = a.joinedAt ?? Number.MAX_SAFE_INTEGER;
      const jb = b.joinedAt ?? Number.MAX_SAFE_INTEGER;
      if (ja !== jb) return ja - jb;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  const lanes = you ? [you, ...opponents] : opponents;

  const racing = phase === "racing" || phase === "finished";

  /** Marker / stone / text accent for one racer: the local user is the
   *  one coral spark; opponents take their hand-tuned palette colour
   *  only when the player-colours pref is on, else neutral ink;
   *  disconnected drops to muted grey. */
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
      className="flex shrink-0 flex-col gap-3 rounded-md border border-border bg-card/70 px-4 py-3.5 backdrop-blur-sm sm:gap-3.5 sm:px-6 sm:py-4"
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

      {/* Cap the lane stack and scroll past ~6 racers so a big FFA lobby
       *  can't grow tall enough to crowd the passage below. You are
       *  always lane 1 (top), so your own lane stays visible regardless. */}
      <ol className="flex max-h-60 flex-col gap-1.5 overflow-y-auto sm:gap-2">
        {lanes.map((r) => (
          <Lane
            key={r.id}
            racer={r}
            totalChars={totalChars}
            racing={racing}
            accent={accentFor(r)}
            showWpm={showOpponentWpm || r.isYou}
          />
        ))}
      </ol>
    </section>
  );
}

/* ─── One racer's lane ───────────────────────────────────────── */

function Lane({
  racer: r,
  totalChars,
  racing,
  accent,
  showWpm,
}: {
  racer: Racer;
  totalChars: number;
  racing: boolean;
  accent: string;
  showWpm: boolean;
}) {
  const pct = Math.round(progressOf(r.correctChars, totalChars) * 100);
  const tier = stoneTierForWpm(r.wpm);
  return (
    <li
      role="progressbar"
      aria-label={`${r.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        "flex items-center gap-2 sm:gap-3",
        r.disconnected && "opacity-60",
      )}
    >
      {/* Identity — checkbox (lobby) or colour dot (racing) + name. */}
      <div className="flex w-28 shrink-0 items-center gap-1.5 sm:w-40">
        <LaneMark racer={r} racing={racing} accent={accent} />
        <span
          className={cn(
            "min-w-0 truncate text-[11px] sm:text-[12px]",
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
          <BotChip />
        ) : !racing && r.isHost ? (
          <HostTag />
        ) : null}
      </div>

      {/* Track — dashed ground line, the racer's stone, finish post. */}
      <div className="relative h-7 flex-1 sm:h-8">
        {/* Finish post — stacked across lanes, this reads as one line. */}
        <span
          aria-hidden
          className="absolute inset-y-1 right-0 w-px bg-foreground/25"
        />
        {/* Travel area, inset by half a stone so it never overhangs. */}
        <div aria-hidden className="absolute inset-x-4 inset-y-0">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-foreground/15" />
          {r.isYou ? (
            <div
              className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-primary/55 transition-[width] duration-150 ease-out"
              style={{ width: `${pct}%` }}
            />
          ) : null}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-150 ease-out"
            style={{ left: `${pct}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stoneSrc(tier)}
              alt=""
              aria-hidden
              draggable={false}
              className="size-6 select-none sm:size-7 motion-safe:animate-[ft-stone-bob_1.3s_ease-in-out_infinite]"
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
      <div className="flex w-16 shrink-0 justify-end whitespace-nowrap sm:w-20">
        <LaneStatus racer={r} racing={racing} showWpm={showWpm} />
      </div>
    </li>
  );
}

/** Left mark on a lane. In the lobby it's a checkbox so ready/not-ready
 *  reads down the column; while racing it's the racer's colour dot. */
function LaneMark({
  racer: r,
  racing,
  accent,
}: {
  racer: Racer;
  racing: boolean;
  accent: string;
}) {
  if (racing) {
    return (
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-sm"
        style={{ backgroundColor: accent }}
      />
    );
  }
  const ready = r.ready || r.isHost;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border",
        ready
          ? "border-primary bg-primary/15 text-primary"
          : "border-muted-foreground/40 bg-transparent",
      )}
    >
      {ready ? <Check size={11} strokeWidth={3} /> : null}
    </span>
  );
}

/** Right-hand status on a lane. */
function LaneStatus({
  racer: r,
  racing,
  showWpm,
}: {
  racer: Racer;
  racing: boolean;
  showWpm: boolean;
}) {
  if (r.disconnected) {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
        Off
      </span>
    );
  }
  if (r.place != null) {
    return (
      <span className="text-[12px] font-semibold tabular-nums text-primary">
        #{r.place}
      </span>
    );
  }
  if (racing) {
    if (!showWpm) return null;
    return (
      <span
        className={cn(
          "text-[12px] font-bold tabular-nums",
          r.isYou ? "text-primary" : "text-foreground",
        )}
      >
        {r.wpm}
        <span className="ml-0.5 text-[8px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
          wpm
        </span>
      </span>
    );
  }
  // Lobby / countdown — the checkbox carries ready/not; spell it out
  // for the ones that need words (host, and a clear "ready" once set).
  if (r.isHost) return null;
  return (
    <span
      className={cn(
        "text-[9px] font-semibold uppercase tracking-[0.14em]",
        r.ready ? "text-primary" : "text-muted-foreground/70",
      )}
    >
      {r.ready ? "Ready" : "Not ready"}
    </span>
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

/** Tiny "HOST" tag beside the host's name in the lobby. */
function HostTag() {
  return (
    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Host
    </span>
  );
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
