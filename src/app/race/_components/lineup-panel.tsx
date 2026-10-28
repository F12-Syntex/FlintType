"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { Lane } from "./lineup-lane";
import { playerColorFor } from "./race-data";
import type { Racer, RacePhase } from "./race-types";

/** Race roster + live racetrack, the TypeRacer way: ONE horizontal lane
 *  per racer, inside one rounded card (ui-law §21). Each lane reads left
 *  to right —
 *
 *    [ ✓  name ]   ( ·····🔥············· | )   [ status / wpm ]
 *
 *  the flint stone glides along its own rounded track toward the finish
 *  post on the right (see `<Lane>`). Sits ABOVE the typing surface and
 *  is the single "who am I racing and how am I doing" surface for every
 *  pre-finish phase:
 *
 *    - lobby / countdown — stones rest at the start line; the left mark
 *      is a round check so ready vs not-ready reads down the column at a
 *      glance (the host is implicitly ready).
 *    - racing — stones glide by progress; the right column shows WPM and
 *      the left mark becomes the racer's colour dot.
 *
 *  The local user is the lone orange spark (glowing stone + an orange
 *  trail and tinted track); opponents stay neutral ink, or their
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
  showStats = true,
  showReady = false,
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
  /** False for a watcher with no seat: the header's Words / WPM / Acc
   *  strip describes YOUR run, so a spectator never sees it (it read as
   *  a phantom racer's "WPM 0" in orange). */
  showStats?: boolean;
  /** True for a private lobby (challenge room): lanes show ready checks
   *  during the lobby phase. Public races never show readiness. */
  showReady?: boolean;
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
      className="flex shrink-0 flex-col gap-3 rounded-2xl border border-border bg-card px-3 py-3.5 shadow-card sm:gap-4 sm:px-5 sm:py-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">{modeName}</span>
          <PhaseLabel
            phase={phase}
            joinedOpponents={joinedOpponents}
            totalOpponents={totalOpponents}
          />
        </div>
        {racing && showStats ? (
          <dl className="flex items-baseline gap-x-5 text-xs text-muted-foreground">
            <LiveStat label="Words">
              {wordsDone}/{totalWords}
            </LiveStat>
            <LiveStat label="WPM" accent>
              {wpm}
            </LiveStat>
            <LiveStat label="Acc">{accuracy.toFixed(1)}%</LiveStat>
          </dl>
        ) : null}
      </header>

      {/* Cap the lane stack and scroll past ~6 racers so a big FFA lobby
       *  can't grow tall enough to crowd the passage below. You are
       *  always lane 1 (top), so your own lane stays visible regardless. */}
      <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {lanes.map((r) => (
          <Lane
            key={r.id}
            racer={r}
            totalChars={totalChars}
            racing={racing}
            showReady={showReady && phase === "lobby"}
            accent={accentFor(r)}
            showWpm={showOpponentWpm || r.isYou}
          />
        ))}
      </ol>
    </section>
  );
}

/* ─── Header pieces ─────────────────────────────────────────── */

/** One live stat in the header while racing. Your WPM is the orange
 *  spark; words and accuracy stay ink. */
function LiveStat({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** Where the room is, as a small status pill beside the mode name. */
function PhaseLabel({
  phase,
  joinedOpponents,
  totalOpponents,
}: {
  phase: RacePhase;
  joinedOpponents: number;
  totalOpponents: number;
}) {
  const label =
    phase === "matching"
      ? // The count only says something while seats are still filling.
        joinedOpponents < totalOpponents
        ? `Finding racers ${joinedOpponents}/${totalOpponents}`
        : "Finding racers"
      : phase === "lobby"
        ? "Lobby"
        : phase === "countdown"
          ? "Starting"
          : phase === "racing"
            ? "Live"
            : phase === "finished"
              ? "Finished"
              : null;
  if (!label) return null;
  const active = phase !== "finished";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium tabular-nums",
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        phase === "matching" && "motion-safe:animate-pulse",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-primary" : "bg-muted-foreground/60",
        )}
      />
      {label}
    </span>
  );
}
