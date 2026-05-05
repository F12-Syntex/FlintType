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

  if (state.phase === "done") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          <span className="font-semibold text-primary">complete</span>
          <span aria-hidden className="text-muted-foreground/60">·</span>
          <span className="text-foreground">{wpm} wpm</span>
          <span aria-hidden className="text-muted-foreground/60">·</span>
          <span className="text-foreground">{Math.round(accuracy)}% acc</span>
        </div>
        <RestartControl onRestart={() => restart()} />
      </div>
    );
  }

  if (state.phase === "running") {
    // Progress (0/25 words, or 0:30 left) already lives in the readouts
    // rail above the passage — duplicating it here just crowded the
    // footer. Render only a quiet right-aligned cancel affordance.
    return (
      <div className="flex items-center justify-end text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
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
  // Mobile-only: ghost button — no chip background so it sits quietly
  // in the bottom-right corner of the reader during typing instead of
  // reading as a second card surface. Padding keeps the touch target
  // ≥ 44 px (UI law §7).
  return (
    <button
      type="button"
      onClick={onCancel}
      className={cn(
        "inline-flex h-11 items-center justify-center px-2",
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        "transition-colors hover:text-primary",
      )}
    >
      cancel
    </button>
  );
}
