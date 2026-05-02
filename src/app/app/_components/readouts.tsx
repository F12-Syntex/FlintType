"use client";

import { Stat } from "@/components/ft";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
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
  const { prefs } = useBehaviourPrefs();
  const running = state.phase === "running" || state.phase === "done";
  const wordCount = state.words.length;
  const wordIdx = Math.min(state.cursorWord + (running ? 1 : 0), wordCount);

  // TIME mode shows the time-left as the progress signal — word count is
  // meaningless when the buffer is intentionally oversized.
  const isTime = state.mode === "TIME";
  const remainingMs = isTime
    ? Math.max(0, state.length * 1000 - elapsedMs)
    : 0;

  const blind = prefs.blindMode;
  const showWpm = !blind && prefs.liveWpm;
  const showAccuracy = !blind && prefs.liveAccuracy;
  const showErrs = !blind;

  const props: StatsProps = {
    wpm,
    accuracy,
    errs: state.errorWords.size,
    wordIdx,
    wordCount,
    elapsedMs,
    running,
    showWpm,
    showAccuracy,
    showErrs,
    isTime,
    remainingMs,
  };

  return (
    <>
      <MobileStrip {...props} />
      <DesktopStats {...props} />
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
  showWpm: boolean;
  showAccuracy: boolean;
  showErrs: boolean;
  isTime: boolean;
  remainingMs: number;
};

function MobileStrip({
  wpm,
  accuracy,
  errs,
  wordIdx,
  wordCount,
  elapsedMs,
  running,
  showWpm,
  showAccuracy,
  showErrs,
  isTime,
  remainingMs,
}: StatsProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-2 text-[11px] tabular-nums md:hidden">
      {showWpm ? (
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-base font-bold tracking-tight",
              running ? "text-primary" : "text-foreground",
            )}
          >
            {wpm}
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            wpm
          </span>
        </div>
      ) : null}

      {showAccuracy ? (
        <Pip label="acc" value={`${Math.round(accuracy)}%`} />
      ) : null}
      {showErrs ? (
        <Pip label="err" value={String(errs)} tone={errs > 0 ? "ember" : "ink"} />
      ) : null}
      {isTime ? (
        <Pip label="left" value={formatElapsed(remainingMs)} />
      ) : (
        <Pip label="word" value={`${wordIdx}/${wordCount}`} />
      )}
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
          tone === "ember" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
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
  showWpm,
  showAccuracy,
  showErrs,
  isTime,
  remainingMs,
}: StatsProps) {
  return (
    <div className="hidden flex-wrap items-end justify-between gap-4 select-none md:flex">
      <div className="flex flex-wrap gap-x-12 gap-y-3">
        <Stat label="ELAPSED" value={formatElapsed(elapsedMs)} size="lg" />
        {isTime ? (
          <Stat
            label="REMAINING"
            value={formatElapsed(remainingMs)}
            size="lg"
            accent={running}
          />
        ) : (
          <Stat label="WORD" value={`${wordIdx}/${wordCount}`} size="lg" />
        )}
      </div>
      <div className="flex flex-wrap gap-x-12 gap-y-3">
        {showWpm ? (
          <Stat
            label="WPM"
            value={String(wpm)}
            size="lg"
            accent={running}
            align="right"
          />
        ) : null}
        {showAccuracy ? (
          <Stat
            label="ACC"
            value={`${Math.round(accuracy)}%`}
            size="lg"
            align="right"
          />
        ) : null}
        {showErrs ? (
          <Stat label="ERR" value={String(errs)} size="lg" align="right" />
        ) : null}
      </div>
    </div>
  );
}
