"use client";

import { cn } from "@/lib/utils";

/** Editorial status row above the passage. One layout, six phases:
 *
 *      ▪  STATUS    ─────  CONTENT
 *
 *  Left cluster pairs the project's 6 × 6 severity-square tick (per
 *  ui-law §11) with a small-caps phase label. Right cluster carries
 *  whatever is appropriate for the phase: a soft hint, a metric
 *  ledger, or the live countdown count. Single hairline rule between
 *  the two clusters keeps the eye anchored on the same baseline as
 *  the passage below.
 *
 *  Shapes per phase:
 *    queue      → "press Find race to begin"
 *    matching   → "finding racers · 2/3"  (tick pulses)
 *    lobby      → "lobby full · starting…"  (tick pulses)
 *    countdown  → tabular-nums "3" / "2" / "1" / "GO" inline
 *    racing     → ledger metrics (12/25 · WPM 64 · ACC 95.0%)
 *    finished   → ledger metrics with FINISHED tag
 *
 *  Mobile: the whole row stays visible — small text, no truncation.
 *  Practice's `<Readouts>` hides on mobile because it duplicates the
 *  RestHint footer; the race row has nothing duplicating it, so it
 *  stays. */
export type ReadoutMetric = {
  label: string;
  value: string;
  /** Paint the value in the brand primary. Most metrics stay
   *  foreground; only the live WPM and the FINISHED stamp accent. */
  accent?: boolean;
};

export type RacingReadout = {
  /** Left-side caption sitting in the same slot as the phase label
   *  (e.g. "12/25 WORDS" or "ITEM 3/5"). */
  left: string;
  /** Right-side metric chips, displayed in order. */
  metrics: readonly ReadoutMetric[];
};

type PhaseKind = "queue" | "matching" | "lobby" | "countdown" | "racing" | "finished" | "done";

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
  const kind = phase as PhaseKind;
  if (kind === "done") return null;

  // The tick is a 6 × 6 square (project's severity-dot pattern). It
  // pulses while the lobby is live (matching / lobby / countdown /
  // racing) so the eye picks up activity even peripheral. Steady when
  // queue / finished — those phases are static states, not in-motion.
  const tickActive =
    kind === "matching" ||
    kind === "lobby" ||
    kind === "countdown" ||
    kind === "racing";
  const tickMuted = kind === "queue" || kind === "finished";
  const labelText = labelFor(kind);

  return (
    <div className="flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-4">
      <div className="flex items-baseline gap-2">
        <span
          aria-hidden
          className={cn(
            "inline-block size-1.5 translate-y-[1px] rounded-[1px]",
            tickActive && "bg-primary motion-safe:animate-pulse",
            tickMuted && "bg-muted-foreground/60",
          )}
        />
        <span
          className={cn(
            "font-mono text-[10px] font-medium uppercase tracking-[0.2em]",
            tickActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {labelText}
        </span>
      </div>
      <span
        aria-hidden
        className="hidden h-px flex-1 bg-border sm:block"
      />
      <PhaseContent
        kind={kind}
        countdownNumber={countdownNumber}
        joinedOpponents={joinedOpponents}
        totalOpponents={totalOpponents}
        racingReadout={racingReadout}
      />
    </div>
  );
}

/** Stable per-phase title used in the left cluster. Keep these short
 *  — the whole row sits on one baseline and a long word forces a wrap
 *  on mobile. */
function labelFor(kind: PhaseKind): string {
  switch (kind) {
    case "queue":
      return "Queue";
    case "matching":
      return "Matching";
    case "lobby":
      return "Lobby";
    case "countdown":
      return "Starting";
    case "racing":
      return "Live";
    case "finished":
      return "Finished";
    case "done":
      return "";
  }
}

function PhaseContent({
  kind,
  countdownNumber,
  joinedOpponents,
  totalOpponents,
  racingReadout,
}: {
  kind: PhaseKind;
  countdownNumber: number | null;
  joinedOpponents: number;
  totalOpponents: number;
  racingReadout?: RacingReadout;
}) {
  if (kind === "queue") {
    return <Hint text="Press Find race to begin" />;
  }
  if (kind === "matching") {
    return (
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        Finding racers
        <span className="ml-2 text-foreground">
          {joinedOpponents}
          <span className="text-muted-foreground/70"> / {totalOpponents}</span>
        </span>
      </span>
    );
  }
  if (kind === "lobby") {
    return <Hint text="Lobby full · countdown imminent" />;
  }
  if (kind === "countdown" && countdownNumber != null) {
    // The "moment" of the race start lives here. Inline, tabular,
    // primary-coloured — the number changes every second so the eye
    // tracks it without any extra chrome. Larger than other rows so
    // it earns its weight, but nowhere near the old text-6xl panel.
    return (
      <span
        aria-live="polite"
        className="font-mono text-2xl font-extrabold tabular-nums leading-none text-primary"
      >
        {countdownNumber === 0 ? "GO" : countdownNumber}
      </span>
    );
  }
  if (racingReadout && (kind === "racing" || kind === "finished")) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
        <span>{racingReadout.left}</span>
        {racingReadout.metrics.map((m) => (
          <span key={m.label || m.value} className="flex items-baseline gap-1">
            {m.label ? (
              <span className="text-muted-foreground/70">{m.label}</span>
            ) : null}
            <span
              className={cn(
                "text-foreground",
                m.accent && "text-primary",
              )}
            >
              {m.value}
            </span>
          </span>
        ))}
      </div>
    );
  }
  return null;
}

function Hint({ text }: { text: string }) {
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      {text}
    </span>
  );
}
