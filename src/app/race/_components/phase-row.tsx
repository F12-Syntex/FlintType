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
  joinedOpponents,
  totalOpponents,
  racingReadout,
  lobbyHint,
}: {
  phase: string;
  joinedOpponents: number;
  totalOpponents: number;
  racingReadout?: RacingReadout;
  /** Override for the lobby-phase hint. Challenge rooms (which sit
   *  in lobby waiting for the host's Start click) use this to say
   *  "Waiting on the host" instead of the default
   *  "Lobby full · countdown imminent". */
  lobbyHint?: string;
}) {
  const kind = phase as PhaseKind;
  if (kind === "done") return null;

  // No more square tick — the label itself carries the state via its
  // colour. Active phases (matching / lobby / countdown / racing)
  // paint in primary; passive phases (queue / finished) sit in muted.
  // Pulsing reserved for active phases so peripheral vision picks up
  // motion without a separate glyph.
  const tickActive =
    kind === "matching" ||
    kind === "lobby" ||
    kind === "countdown" ||
    kind === "racing";
  const labelText = labelFor(kind);

  return (
    <div className="flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-4">
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.22em]",
          tickActive
            ? "text-primary motion-safe:animate-pulse"
            : "text-muted-foreground",
        )}
      >
        {labelText}
      </span>
      <span
        aria-hidden
        className="hidden h-px flex-1 bg-border sm:block"
      />
      <PhaseContent
        kind={kind}
        joinedOpponents={joinedOpponents}
        totalOpponents={totalOpponents}
        racingReadout={racingReadout}
        lobbyHint={lobbyHint}
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
  joinedOpponents,
  totalOpponents,
  racingReadout,
  lobbyHint,
}: {
  kind: PhaseKind;
  joinedOpponents: number;
  totalOpponents: number;
  racingReadout?: RacingReadout;
  lobbyHint?: string;
}) {
  if (kind === "queue") {
    return <Hint text="Press Find race to begin" />;
  }
  if (kind === "matching") {
    return (
      <span className="text-[11px] tabular-nums text-muted-foreground">
        Finding racers
        <span className="ml-2 text-foreground">
          {joinedOpponents}
          <span className="text-muted-foreground/70"> / {totalOpponents}</span>
        </span>
      </span>
    );
  }
  if (kind === "lobby") {
    return <Hint text={lobbyHint ?? "Lobby full · countdown imminent"} />;
  }
  if (kind === "countdown") {
    // The big countdown digit lives in the passage area (where the
    // typing will happen) so it dominates visually. The PhaseRow
    // contribution stays small — just a short context hint so the
    // top strip doesn't go silent on a key beat.
    return <Hint text="Get ready" />;
  }
  if (racingReadout && (kind === "racing" || kind === "finished")) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
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
    <span className="text-[11px] text-muted-foreground">
      {text}
    </span>
  );
}
