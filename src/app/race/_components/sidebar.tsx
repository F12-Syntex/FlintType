"use client";

import { cn } from "@/lib/utils";
import {
  progressOf,
  RACE_MODES,
  RACE_MODE_ORDER,
  type RaceModeId,
} from "./race-data";
import { useRace } from "./race-state";

/** Right-rail sidebar. Two live sections:
 *    YOUR RUN    — your placement, wpm, accuracy, completion
 *    RACE MODES  — every mode is selectable; clicking swaps the
 *                  passage + bot lineup and resets to lobby. */
export function RaceSidebar() {
  const { state, modeId, setModeId, elapsedSeconds } = useRace();
  const racers = [...state.racers].sort(
    (a, b) => b.correctChars - a.correctChars,
  );
  const you = state.racers.find((r) => r.isYou)!;
  const yourLivePlace =
    you.place ?? racers.findIndex((r) => r.id === "you") + 1;
  const pct = Math.round(progressOf(you.correctChars, state.totalChars) * 100);
  const allowSwitch =
    state.phase === "queue" ||
    state.phase === "lobby" ||
    state.phase === "finished";

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-md border border-border bg-card/40 lg:w-[20rem] lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent">
      <Section title="YOUR RUN">
        <div className="flex flex-col gap-2.5 text-[11px]">
          <Row
            label="placement"
            value={`#${yourLivePlace} of ${state.racers.length}`}
            accent={yourLivePlace === 1}
          />
          <Row label="wpm" value={String(you.wpm)} accent />
          <Row label="progress" value={`${pct}%`} />
          <Row label="elapsed" value={formatT(elapsedSeconds)} />
        </div>
      </Section>

      <Section
        title="RACE MODES"
        rightHint={allowSwitch ? "" : "FINISH TO SWAP"}
      >
        <div className="flex flex-col gap-2">
          {RACE_MODE_ORDER.map((id) => (
            <ModeChip
              key={id}
              id={id}
              active={id === modeId}
              disabled={!allowSwitch}
              onSelect={() => setModeId(id)}
            />
          ))}
        </div>
      </Section>
    </aside>
  );
}

function Section({
  title,
  rightHint,
  children,
}: {
  title: string;
  rightHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border px-6 py-5">
      <div className="mb-3.5 flex justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-foreground">
          {title}
        </span>
        {rightHint ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {rightHint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ModeChip({
  id,
  active,
  disabled,
  onSelect,
}: {
  id: RaceModeId;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const mode = RACE_MODES[id];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        active
          ? "border-primary/50 bg-primary/[0.06]"
          : "border-border hover:bg-accent/40",
        disabled && !active && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <div>
        <div
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em]",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {mode.name}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {mode.detail}
        </div>
      </div>
      {active ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
          active
        </span>
      ) : null}
    </button>
  );
}

function formatT(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
