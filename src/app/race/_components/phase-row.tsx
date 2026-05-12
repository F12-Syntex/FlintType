"use client";

import { cn } from "@/lib/utils";

/** Single slim row that sits above the passage and swaps content per
 *  phase. Replaces the old blurred overlay panels — the passage stays
 *  visible at all times, the phase signal lives here.
 *
 *    queue     → "Press Find race to begin"
 *    matching  → "Finding racers · N/M"
 *    lobby     → "Lobby full · starting…"
 *    countdown → big primary number (3 / 2 / 1) → "GO"
 *    racing    → standard readouts (words / wpm / acc / live)
 *    finished  → readouts with FINISHED tag
 *
 *  Hidden on mobile (md+) for the same reason practice's `<Readouts>`
 *  hides — the small viewport leads with the passage. The countdown
 *  is the one exception: too important to skip on mobile, so it shows
 *  on every viewport. */
export type ReadoutMetric = {
  label: string;
  value: string;
  /** When true the value paints in the brand primary (e.g. live WPM
   *  on the race screen). Most metrics stay muted. */
  accent?: boolean;
};

export type RacingReadout = {
  /** Left-side caption, e.g. "12/25 WORDS" or "ITEM 3/5". */
  left: string;
  /** Right-side metric chips, displayed in order. */
  metrics: readonly ReadoutMetric[];
};

export function PhaseRow({
  phase,
  countdownNumber,
  joinedOpponents,
  totalOpponents,
  racingReadout,
}: {
  phase: string;
  countdownNumber: number | null;
  joinedOpponents: number;
  totalOpponents: number;
  racingReadout?: RacingReadout;
}) {
  if (phase === "countdown" && countdownNumber != null) {
    // Countdown stays loud — the user needs the cue across the room.
    // No backdrop blur, no card panel; just a primary-coloured number
    // centred in the slot. `min-h-12` reserves space so the row doesn't
    // jump in height between phases.
    return (
      <div
        aria-live="polite"
        className="flex min-h-12 items-center justify-center"
      >
        <span className="font-mono text-5xl font-extrabold tabular-nums text-primary sm:text-6xl">
          {countdownNumber === 0 ? "GO" : countdownNumber}
        </span>
      </div>
    );
  }
  if (racingReadout && (phase === "racing" || phase === "finished")) {
    return (
      <div className="hidden flex-wrap items-baseline justify-between gap-x-8 gap-y-1 md:flex">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {racingReadout.left}
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {racingReadout.metrics.map((m) => (
            <span
              key={m.label}
              className={cn(
                "tabular-nums",
                m.accent && "text-primary",
              )}
            >
              {m.label} {m.value}
            </span>
          ))}
        </div>
      </div>
    );
  }
  // Pre-race phases — one short hint line. Centred, muted, no panel,
  // no blur. The passage remains visible underneath so the user can
  // preview the words while waiting.
  let hint: string;
  let accent = false;
  if (phase === "queue") {
    hint = "Press Find race to begin";
  } else if (phase === "matching") {
    hint = `Finding racers · ${joinedOpponents}/${totalOpponents}`;
    accent = true;
  } else if (phase === "lobby") {
    hint = "Lobby full · starting…";
    accent = true;
  } else {
    return null;
  }
  return (
    <div className="flex min-h-12 items-center justify-center">
      <div className="flex items-center gap-2">
        {accent ? (
          <span
            aria-hidden
            className="size-1.5 rounded-sm bg-primary motion-safe:animate-pulse"
          />
        ) : null}
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.22em]",
            accent ? "text-primary" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      </div>
    </div>
  );
}
