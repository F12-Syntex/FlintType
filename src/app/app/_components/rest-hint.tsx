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
  const { state, restart, wpm, accuracy } = usePractice();
  const wordCount = state.words.length;

  if (state.phase === "done") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]">
        <div className="flex flex-wrap items-center gap-3 text-primary">
          <span className="size-1.5 bg-primary" aria-hidden />
          <span className="font-semibold">complete</span>
          <span className="text-muted-foreground/80">·</span>
          <span className="text-foreground">{wpm} wpm</span>
          <span className="text-muted-foreground/80">·</span>
          <span className="text-foreground">{Math.round(accuracy)}% acc</span>
        </div>
        <RestartControl onRestart={() => restart()} />
      </div>
    );
  }

  if (state.phase === "running") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="text-foreground">
          {state.cursorWord}/{wordCount}
        </span>
        <CancelControl onCancel={() => restart()} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      <span>start typing to begin</span>
      <RestartControl onRestart={() => restart()} label="new passage" />
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
      <div className="hidden items-center gap-2 text-muted-foreground md:flex">
        <Kbd>tab</Kbd>
        <span>{label}</span>
      </div>
      {/* Mobile — a real button */}
      <button
        type="button"
        onClick={onRestart}
        className={cn(
          "inline-flex h-11 min-w-[112px] items-center justify-center md:hidden",
          "rounded-md border border-border bg-card px-4",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground",
          "transition-colors hover:border-primary hover:text-primary",
          "active:bg-accent",
        )}
      >
        {label}
      </button>
    </>
  );
}

function CancelControl({ onCancel }: { onCancel: () => void }) {
  // Mobile-only: the running-phase row that hosts this is hidden at md+.
  return (
    <button
      type="button"
      onClick={onCancel}
      className={cn(
        "inline-flex h-11 min-w-[112px] items-center justify-center",
        "rounded-md border border-border bg-card px-4",
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground",
        "transition-colors hover:border-primary hover:text-primary",
        "active:bg-accent",
      )}
    >
      cancel
    </button>
  );
}
