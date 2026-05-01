"use client";

import { Stat } from "@/components/ft";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Mobile: compact single-row readout, hairline-bottomed strip with the
 *  vital stats inline so the user can see them while typing without
 *  surrendering vertical space the passage needs.
 *
 *  Desktop: the existing label-over-value Stat layout, two columns. */
export function Readouts() {
  const { state, elapsedMs, wpm, accuracy } = usePractice();
  const running = state.phase === "running" || state.phase === "done";
  const wordCount = state.words.length;
  const wordIdx = Math.min(state.cursorWord + (running ? 1 : 0), wordCount);

  return (
    <>
      <MobileStrip
        wpm={wpm}
        accuracy={accuracy}
        errs={state.errorWords.size}
        wordIdx={wordIdx}
        wordCount={wordCount}
        elapsedMs={elapsedMs}
        running={running}
      />
      <DesktopStats
        wpm={wpm}
        accuracy={accuracy}
        errs={state.errorWords.size}
        wordIdx={wordIdx}
        wordCount={wordCount}
        elapsedMs={elapsedMs}
        running={running}
      />
    </>
  );
}

type StatsProps = {
  wpm: number;
  accuracy: number;
  errs: number;
  wordIdx: number;
  wordCount: number;
  elapsedMs: number;
  running: boolean;
};

function MobileStrip({
  wpm,
  accuracy,
  errs,
  wordIdx,
  wordCount,
  elapsedMs,
  running,
}: StatsProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ft-line-soft bg-card/60 px-4 py-2 text-[11px] tabular-nums md:hidden">
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "text-base font-bold tracking-tight",
            running ? "text-ft-ember" : "text-ft-ink",
          )}
        >
          {wpm}
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ft-dim">
          wpm
        </span>
      </div>

      <Pip label="acc" value={`${Math.round(accuracy)}%`} />
      <Pip label="err" value={String(errs)} tone={errs > 0 ? "ember" : "ink"} />
      <Pip label="word" value={`${wordIdx}/${wordCount}`} />
      <Pip label="time" value={formatElapsed(elapsedMs)} />
    </div>
  );
}

function Pip({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "ember";
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span
        className={cn(
          "text-sm font-semibold tracking-tight",
          tone === "ember" ? "text-ft-ember" : "text-ft-ink",
        )}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-ft-dim">
        {label}
      </span>
    </div>
  );
}

function DesktopStats({
  wpm,
  accuracy,
  errs,
  wordIdx,
  wordCount,
  elapsedMs,
  running,
}: StatsProps) {
  return (
    <div className="hidden flex-wrap items-end justify-between gap-4 select-none md:flex">
      <div className="flex flex-wrap gap-x-12 gap-y-3">
        <Stat label="ELAPSED" value={formatElapsed(elapsedMs)} size="lg" />
        <Stat label="WORD" value={`${wordIdx}/${wordCount}`} size="lg" />
      </div>
      <div className="flex flex-wrap gap-x-12 gap-y-3">
        <Stat
          label="WPM"
          value={String(wpm)}
          size="lg"
          accent={running}
          align="right"
        />
        <Stat
          label="ACC"
          value={`${Math.round(accuracy)}%`}
          size="lg"
          align="right"
        />
        <Stat label="ERR" value={String(errs)} size="lg" align="right" />
      </div>
    </div>
  );
}
