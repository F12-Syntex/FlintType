"use client";

import { Stat } from "@/components/ft";
import { usePractice } from "./practice-state";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Readouts() {
  const { state, elapsedMs, wpm, accuracy } = usePractice();
  const running = state.phase === "running" || state.phase === "done";
  const wordCount = state.words.length;
  const wordIdx = Math.min(state.cursorWord + (running ? 1 : 0), wordCount);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ft-line-soft pb-5">
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Stat label="WPM" value={String(wpm)} accent={running} />
        <Stat label="ACC" value={`${Math.round(accuracy)}%`} />
        <Stat label="ERR" value={String(state.errorWords.size)} />
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Stat label="WORD" value={`${wordIdx}/${wordCount}`} align="right" />
        <Stat
          label="ELAPSED"
          value={formatElapsed(elapsedMs)}
          align="right"
        />
      </div>
    </div>
  );
}
