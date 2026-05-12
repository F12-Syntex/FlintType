"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { playerColorFor, progressOf } from "./race-data";
import type { Racer, RacePhase } from "./race-types";

/** Primary lobby + race-progress panel. Replaces the previous
 *  PhaseRow + thin player strip combination with one consolidated
 *  card so the user has exactly one place to look for "who am I
 *  racing and how am I doing."
 *
 *  Header carries the phase context (mode + status). Body is a
 *  ledger of racer rows, each with rank, name, a fat progress bar,
 *  WPM, and accuracy. The bar reads at a glance — no need to
 *  parse a number to know who's ahead.
 *
 *  Hidden in queue (no opponents to show) and absorbed by the
 *  RaceResults card once the race finishes (rendered below the
 *  passage in the page tree). */
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
      className="flex flex-col gap-4 rounded-md border border-border bg-card/70 px-5 py-4 backdrop-blur-sm sm:px-6"
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

      <ol className="flex flex-col gap-3.5 sm:gap-4">
        {ordered.map((r, idx) => (
          <RacerRow
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

/* ─── Racer row ───────────────────────────────────────────── */

function RacerRow({
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
  const errorWidth =
    totalChars > 0
      ? Math.min(prog, racer.errors / totalChars) * 100
      : 0;
  return (
    <li
      role="progressbar"
      aria-label={`${racer.name} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        "grid grid-cols-[28px_minmax(100px,200px)_minmax(0,1fr)_72px_56px] items-center gap-3 sm:gap-4",
        disconnected && "opacity-60",
      )}
    >
      {/* Rank — larger so the leader stands out across the room. */}
      <span
        className={cn(
          "text-[14px] font-bold tabular-nums sm:text-[15px]",
          rank === 1 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {rank.toString().padStart(2, "0")}
      </span>

      {/* Handle + status badge. */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "truncate text-[14px] sm:text-[15px]",
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
          <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/80">
            Disconnected
          </span>
        ) : place != null ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Finished · #{place}
          </span>
        ) : null}
      </div>

      {/* Progress bar — h-3.5 (was h-2), rounded-full so the leading
       *  cap reads as a rounded racer head. Inner shadow tint for
       *  depth, player colour fill, destructive overlay flagging
       *  accumulated errors at the leading edge. */}
      <div className="relative h-3.5 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-out",
            !showColors && !racer.isYou && !disconnected && "bg-foreground/65",
            disconnected && "bg-muted-foreground/40",
          )}
          style={{
            width: `${pct}%`,
            backgroundColor:
              !disconnected && (showColors || racer.isYou) ? color : undefined,
          }}
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

      {/* WPM — primary on you, foreground otherwise. Bigger so the
       *  on-the-fly speed read is easy from across the room. */}
      <span
        className={cn(
          "text-right text-[18px] font-bold tabular-nums sm:text-[20px]",
          disconnected
            ? "text-muted-foreground"
            : racer.isYou
              ? "text-primary"
              : "text-foreground",
        )}
      >
        {showWpm ? racer.wpm : ""}
      </span>

      {/* Percent — quiet right-aligned secondary read so the user
       *  can scan the table by % rather than only by bar length. */}
      <span className="text-right text-[11px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground/80">
        {pct}%
      </span>
    </li>
  );
}
