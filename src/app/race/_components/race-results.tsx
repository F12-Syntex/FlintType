"use client";

import { cn } from "@/lib/utils";
import { useRace } from "./race-state";

/** Result panel shown over the passage when state.phase === finished.
 *  Reads like a podium card — your placement big, then a row of
 *  every racer with their final WPM / accuracy / time. The "race
 *  again" affordance lives in <RaceControls>; this panel is purely
 *  informational so the user can sit with the result before requeueing. */
export function RaceResults() {
  const { state, yourAccuracy, yourWpm } = useRace();
  if (state.phase !== "finished") return null;
  const you = state.racers.find((r) => r.isYou)!;
  const place = you.place ?? state.racers.length;
  const ordered = [...state.racers].sort(
    (a, b) => (a.place ?? 99) - (b.place ?? 99),
  );
  return (
    <div className="flex flex-col gap-7 border border-ft-ink-line bg-ft-ink-deep px-7 py-8 sm:px-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-ft-warm-3">
            Race finished
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-ft-paper sm:text-[40px]">
            {place === 1
              ? "Race won."
              : place === state.racers.length
                ? "Last across."
                : `Finished ${ordinal(place)}.`}
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-ft-warm-2">
            {summaryLine(place, state.racers.length, you.finishedAt ?? 0)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-2 sm:gap-x-12">
          <Stat label="your wpm" value={String(yourWpm)} accent />
          <Stat label="accuracy" value={`${yourAccuracy.toFixed(1)}%`} />
          <Stat label="time" value={formatT(you.finishedAt ?? 0)} />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_72px_72px_72px] items-baseline gap-3 border-b border-ft-ink-line pb-2 text-[10px] uppercase tracking-[0.18em] text-ft-warm-3">
          <span>#</span>
          <span>racer</span>
          <span className="text-right">wpm</span>
          <span className="text-right">acc</span>
          <span className="text-right">time</span>
        </div>
        {ordered.map((r) => {
          const acc = accuracyOf(r.correctChars, r.errorChars);
          const placedFirst = (r.place ?? 99) === 1;
          return (
            <div
              key={r.id}
              className={cn(
                "grid grid-cols-[28px_minmax(0,1fr)_72px_72px_72px] items-baseline gap-3 border-b border-ft-ink-line py-2.5 text-[13px]",
                r.isYou && "bg-ft-ember/[0.05]",
              )}
            >
              <span
                className={cn(
                  "font-mono tabular-nums",
                  placedFirst ? "text-ft-ember" : "text-ft-warm-3",
                )}
              >
                {r.place ?? "—"}
              </span>
              <span
                className={cn(
                  "truncate font-semibold",
                  r.isYou ? "text-ft-ember" : "text-ft-paper",
                )}
              >
                {r.name}
              </span>
              <span className="text-right tabular-nums text-ft-paper">
                {r.wpm}
              </span>
              <span className="text-right tabular-nums text-ft-warm-1">
                {acc.toFixed(1)}%
              </span>
              <span className="text-right tabular-nums text-ft-warm-1">
                {formatT(r.finishedAt ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
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
    <div className="flex flex-col items-start gap-1">
      <span className="text-[9px] uppercase tracking-[0.22em] text-ft-warm-3">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-2xl font-bold tabular-nums leading-none",
          accent ? "text-ft-ember" : "text-ft-paper",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ordinal(n: number): string {
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function summaryLine(place: number, total: number, time: number): string {
  if (place === 1) {
    return `Cleared the passage in ${formatT(time)} — fastest across the line. Queue another to defend.`;
  }
  if (place === total) {
    return `Bots took the line first this time. Queue another and aim for the next slot up.`;
  }
  return `Solid run — ${formatT(time)} on the clock. The leader's still up the page.`;
}

function accuracyOf(correct: number, errors: number): number {
  const total = correct + errors;
  if (total === 0) return 100;
  return Math.round((correct / total) * 1000) / 10;
}

function formatT(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
