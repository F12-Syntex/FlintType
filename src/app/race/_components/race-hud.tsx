"use client";

import { cn } from "@/lib/utils";
import { ModePicker } from "./mode-picker";
import { useRace } from "./race-state";

/** Single compact strip above the race surface. Replaces the previous
 *  RaceControls + RaceSidebar + RaceLanes chrome so the page reads as
 *  a passage with one row of head-up info, not a config-style panel.
 *
 *  Layout per phase:
 *    - mode chip (drops a dropdown to swap modes)
 *    - status word + elapsed time + your live WPM
 *    - one phase-aware action button on the right
 *
 *  Everything else (placement, opponents' WPM, leader changes) moved
 *  into the lower-density opponent strip inside the surface itself,
 *  or into the post-race results panel. */
export function RaceHud() {
  const { state, modeId, setModeId, enterQueue, restart, abandon, elapsedSeconds } =
    useRace();
  const you = state.racers.find((r) => r.isYou)!;
  const allowSwitch =
    state.phase === "queue" ||
    state.phase === "lobby" ||
    state.phase === "finished";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <ModePicker modeId={modeId} onPick={setModeId} disabled={!allowSwitch} />
        <StatusPill phase={state.phase} />
      </div>

      <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Stat label="WPM" value={String(you.wpm)} accent />
        <Stat label="Time" value={formatT(elapsedSeconds)} />
      </div>

      <ActionButton
        phase={state.phase}
        onEnter={enterQueue}
        onRestart={restart}
        onAbandon={abandon}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-[13px] font-bold tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function StatusPill({ phase }: { phase: string }) {
  // Tiny phase chip — no full status line, just one word so the user
  // knows where they are in the race loop. Same colour as the rest of
  // the HUD; the dot before it pulses while racing so peripheral
  // vision picks up the live state.
  const label =
    phase === "queue"
      ? "QUEUE"
      : phase === "matching"
        ? "MATCHING"
        : phase === "lobby"
          ? "READY"
          : phase === "countdown"
            ? "STARTING"
            : phase === "finished"
              ? "DONE"
              : "LIVE";
  const live = phase === "racing";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-sm bg-primary",
          live && "motion-safe:animate-pulse",
        )}
      />
      <span className={cn(live && "text-primary")}>{label}</span>
    </span>
  );
}

function ActionButton({
  phase,
  onEnter,
  onRestart,
  onAbandon,
}: {
  phase: string;
  onEnter: () => void;
  onRestart: () => void;
  onAbandon: () => void;
}) {
  if (phase === "queue") {
    return <PrimaryButton onClick={onEnter}>Find race</PrimaryButton>;
  }
  if (phase === "matching") {
    return (
      <GhostButton onClick={() => undefined} disabled>
        Matching…
      </GhostButton>
    );
  }
  if (phase === "lobby" || phase === "countdown") {
    return (
      <GhostButton onClick={() => undefined} disabled>
        {phase === "lobby" ? "Starting…" : "Get ready…"}
      </GhostButton>
    );
  }
  if (phase === "finished") {
    return <PrimaryButton onClick={onRestart}>Race again</PrimaryButton>;
  }
  return <GhostButton onClick={onAbandon}>Abandon</GhostButton>;
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
        "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
        "transition-colors hover:bg-primary/90 active:translate-y-[1px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-foreground/30 hover:text-foreground",
      )}
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
