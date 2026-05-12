"use client";

import { cn } from "@/lib/utils";
import { ModePicker } from "./mode-picker";
import { RACE_MODES } from "./race-data";
import { useRace } from "./race-state";

/** Top race-strip — visually a sibling of practice's `<ModeBar>` so the
 *  two surfaces feel like the same product. Same centred horizontal
 *  flex (`md:flex md:flex-wrap items-end justify-center gap-x-8 gap-y-4
 *  px-7 py-4`), same `<Field>` lockup convention, no border-b.
 *
 *  Phase-aware action slot on the right edge of the row:
 *    queue      — "Find race"
 *    matching   — disabled "Matching…"
 *    lobby      — disabled "Starting…"
 *    countdown  — disabled "Get ready…"
 *    racing     — ghost "Abandon"
 *    finished   — primary "Race again" */
export function RaceControls() {
  const { state, modeId, setModeId, enterQueue, restart, abandon, elapsedSeconds } =
    useRace();
  const mode = RACE_MODES[modeId];
  const you = state.racers.find((r) => r.isYou)!;
  const totalRacers = mode.botIds.length + 1;
  const allowSwitch =
    state.phase === "queue" ||
    state.phase === "lobby" ||
    state.phase === "finished";
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-center gap-x-8 gap-y-4 px-7 py-4">
      <Field label="mode">
        <ModePicker modeId={modeId} onPick={setModeId} disabled={!allowSwitch} />
      </Field>
      <Field label="detail">
        <span className="inline-flex h-8 items-center text-[11px] tracking-wide text-muted-foreground">
          {mode.detail}
        </span>
      </Field>
      <Field label="status">
        <span className="inline-flex h-8 items-center">
          <StatusLine
            phase={state.phase}
            elapsed={elapsedSeconds}
            place={you.place}
            totalRacers={totalRacers}
          />
        </span>
      </Field>
      <Field label="action">
        {state.phase === "queue" ? (
          <PrimaryButton onClick={enterQueue}>Find race</PrimaryButton>
        ) : state.phase === "matching" ? (
          <GhostButton onClick={() => undefined} disabled>
            Matching…
          </GhostButton>
        ) : state.phase === "lobby" ? (
          <GhostButton onClick={() => undefined} disabled>
            Starting…
          </GhostButton>
        ) : state.phase === "countdown" ? (
          <GhostButton onClick={() => undefined} disabled>
            Get ready…
          </GhostButton>
        ) : state.phase === "finished" ? (
          <PrimaryButton onClick={restart}>Race again</PrimaryButton>
        ) : (
          <GhostButton onClick={abandon}>Abandon</GhostButton>
        )}
      </Field>
    </div>
  );
}

/** Label-on-top wrapper — same shape as practice ModeBar's `<Field>`
 *  so the two surfaces line up visually when rendered side-by-side
 *  (e.g. when comparing the two tabs in a screen-cap). */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
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
    phase === "queue"
      ? "● QUEUE"
      : phase === "matching"
        ? "● MATCHING"
        : phase === "lobby"
          ? "● LOBBY"
          : phase === "countdown"
            ? "● STARTING"
            : phase === "finished"
              ? `● FINISHED · ${place ?? "?"}/${totalRacers}`
              : `● LIVE · ${formatT(elapsed)}`;
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
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
        "inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3.5",
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
        "inline-flex h-8 items-center gap-2 rounded-md border border-border px-3",
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
