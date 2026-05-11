"use client";

import { Kbd } from "@/components/ft";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";
import { MobileReadouts } from "./readouts";

/** Single footer row below the passage on mobile — three states.
 *  Stats sit on the left (via <MobileReadouts />) and the
 *  cancel/restart affordance sits on the right, all on the page bg
 *  with no card chrome. Desktop ignores this file entirely (the rest
 *  hint there lives via the keycap hint inside <RestartControl>).
 *
 *  showReadouts mirrors the typing-surface flag — when stats are off
 *  the row falls back to the previous "0/25 words" / "complete"
 *  summary so the footer is never empty. */
export function RestHint({ showReadouts = true }: { showReadouts?: boolean }) {
  const { state, restart, wpm, accuracy } = usePractice();

  if (state.phase === "done") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {showReadouts ? (
          <MobileReadouts />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            <span className="font-semibold text-primary">complete</span>
            <span aria-hidden className="text-muted-foreground/60">·</span>
            <span className="text-foreground">{wpm} wpm</span>
            <span aria-hidden className="text-muted-foreground/60">·</span>
            <span className="text-foreground">{Math.round(accuracy)}% acc</span>
          </div>
        )}
        <RestartControl onRestart={() => restart()} />
      </div>
    );
  }

  if (state.phase === "running") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {showReadouts ? <MobileReadouts /> : <span aria-hidden />}
        <CancelControl onCancel={() => restart()} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {showReadouts ? <MobileReadouts /> : <span>start typing to begin</span>}
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
      {/* Mobile — ghost text button matching the cancel control so the
          footer row reads as one borderless rail. */}
      <button
        type="button"
        onClick={onRestart}
        className={cn(
          "inline-flex h-11 items-center justify-center px-2 md:hidden",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
          "transition-colors hover:text-primary",
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
