"use client";

import { Kbd } from "@/components/ft";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

/** A single quiet line below the passage — three states.
 *  No cards, no callouts, no "today's target" interruption.
 *
 *  Mobile: a tappable RESTART button replaces the Tab/Esc keycap hints
 *  (those keys don't exist on virtual keyboards). On desktop the keycap
 *  hints stay visible — they're how power users restart fastest. */
export function RestHint() {
  const { state, dispatch, wpm, accuracy } = usePractice();
  const wordCount = state.words.length;
  const restart = () => dispatch({ type: "RESTART" });

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
        <RestartControl onRestart={restart} />
      </div>
    );
  }

  if (state.phase === "running") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-ft-dim">
        <span className="text-ft-ink">
          {state.cursorWord}/{wordCount}
        </span>
        <CancelControl onCancel={restart} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-ft-dim">
      <span>start typing to begin</span>
      <RestartControl onRestart={restart} label="new passage" />
    </div>
  );
}

/** Restart affordance — keycap hint on desktop, tappable button on mobile. */
function RestartControl({
  onRestart,
  label = "restart",
}: {
  onRestart: () => void;
  label?: string;
}) {
  return (
    <>
      {/* Desktop — keep the keycap hint */}
      <div className="hidden items-center gap-2 text-ft-dim md:flex">
        <Kbd>tab</Kbd>
        <span>{label}</span>
      </div>
      {/* Mobile — a real button */}
      <button
        type="button"
        onClick={onRestart}
        className={cn(
          "inline-flex h-11 min-w-[112px] items-center justify-center md:hidden",
          "rounded-md border border-ft-line-soft bg-white px-4",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-ft-ink",
          "transition-colors hover:border-ft-ember hover:text-ft-ember",
          "active:bg-ft-spark",
        )}
      >
        {label}
      </button>
    </>
  );
}

function CancelControl({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <Kbd>esc</Kbd>
        <span>cancel</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className={cn(
          "inline-flex h-11 min-w-[112px] items-center justify-center md:hidden",
          "rounded-md border border-ft-line-soft bg-white px-4",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-ft-ink",
          "transition-colors hover:border-ft-ember hover:text-ft-ember",
          "active:bg-ft-spark",
        )}
      >
        cancel
      </button>
    </>
  );
}
