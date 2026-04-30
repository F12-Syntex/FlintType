"use client";

import { Kbd } from "@/components/ft";
import { usePractice } from "./practice-state";

/** A single quiet line below the passage — three states.
 *  No cards, no callouts, no "today's target" interruption. */
export function RestHint() {
  const { state, wpm, accuracy } = usePractice();
  const wordCount = state.words.length;

  if (state.phase === "done") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]">
        <div className="flex flex-wrap items-center gap-3 text-ft-ember">
          <span className="size-1.5 bg-ft-ember" aria-hidden />
          <span className="font-semibold">complete</span>
          <span className="text-ft-dim-2">·</span>
          <span className="text-ft-ink">{wpm} wpm</span>
          <span className="text-ft-dim-2">·</span>
          <span className="text-ft-ink">{Math.round(accuracy)}% acc</span>
        </div>
        <div className="flex items-center gap-2 text-ft-dim">
          <Kbd>tab</Kbd>
          <span>restart</span>
        </div>
      </div>
    );
  }

  if (state.phase === "running") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-ft-dim">
        <span className="text-ft-ink">
          {state.cursorWord}/{wordCount}
        </span>
        <div className="flex items-center gap-2">
          <Kbd>esc</Kbd>
          <span>cancel</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-ft-dim">
      <span>start typing to begin</span>
      <div className="flex items-center gap-2">
        <Kbd>tab</Kbd>
        <span>new passage</span>
      </div>
    </div>
  );
}
