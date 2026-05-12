"use client";

import { cn } from "@/lib/utils";
import { useRace } from "./race-state";

/** Compact control strip rendered at the top of the race surface,
 *  right below the AppChrome top bar. Owns the elapsed clock, the
 *  start / restart CTA, and the results overlay trigger.
 *
 *  Three visible states:
 *    lobby      — "Start race" CTA + tagline
 *    countdown  — small "Starting..." pill (the countdown number
 *                 itself paints over the passage)
 *    racing     — "● RACE LIVE · M:SS ELAPSED" + abandon link
 *    finished   — placement summary + "Race again" CTA */
export function RaceControls() {
  const { state, startCountdown, restart, elapsedSeconds } = useRace();
  const you = state.racers.find((r) => r.isYou)!;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ft-ink-line px-5 py-3.5 sm:px-14">
      <div className="flex flex-wrap items-baseline gap-3 sm:gap-8">
        <StatusLine
          phase={state.phase}
          elapsed={elapsedSeconds}
          place={you.place}
          totalRacers={state.racers.length}
        />
        <span className="text-[11px] tracking-wide text-ft-warm-1">
          {state.phase === "lobby"
            ? "1v3 ranked race · 50 words"
            : state.phase === "countdown"
              ? "type the moment the count hits GO"
              : state.phase === "finished"
                ? "review your run or queue another"
                : "every keystroke logged · finish to lock the result"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {state.phase === "lobby" ? (
          <PrimaryButton onClick={startCountdown}>Start race</PrimaryButton>
        ) : state.phase === "finished" ? (
          <PrimaryButton onClick={restart}>Race again</PrimaryButton>
        ) : (
          <GhostButton onClick={restart}>Abandon</GhostButton>
        )}
      </div>
    </div>
  );
}

function StatusLine({
  phase,
  elapsed,
  place,
  totalRacers,
}: {
  phase: string;
  elapsed: number;
  place: number | null;
  totalRacers: number;
}) {
  const label =
    phase === "lobby"
      ? "● LOBBY"
      : phase === "countdown"
        ? "● STARTING"
        : phase === "finished"
          ? `● FINISHED · PLACE ${place ?? "?"}/${totalRacers}`
          : `● RACE LIVE · ${formatT(elapsed)} ELAPSED`;
  return (
    <span className="text-[10px] uppercase tracking-[0.18em] text-ft-ember">
      {label}
    </span>
  );
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-ft-ember px-4 py-2",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ft-ink",
        "transition-colors hover:bg-ft-ember/85 active:translate-y-[1px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ft-ember/50",
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border border-ft-ink-line px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ft-warm-2 transition-colors hover:border-ft-warm-3 hover:text-ft-paper"
    >
      {children}
    </button>
  );
}

function formatT(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
