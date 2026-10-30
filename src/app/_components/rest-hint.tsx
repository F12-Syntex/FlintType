"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePractice } from "./practice-state";
import { MobileReadouts } from "./readouts";

/** The mobile footer row under the passage: live readouts (or the
 *  "Tap the text to start" hint at rest) on the left, one restart icon
 *  button on the right. Desktop ignores this file entirely; its hint
 *  lives in the readouts row above the passage.
 *
 *  `showReadouts` mirrors the typing-surface flag. With stats off the
 *  left side falls back to a plain status line so the row is never
 *  empty. */
export function RestHint({ showReadouts = true }: { showReadouts?: boolean }) {
  const { state, restart } = usePractice();
  const phase = state.phase;

  // typing-surface mounts this row only before and during a run (the
  // result screen replaces it), so there is no after-the-run state here.
  const fallback =
    phase === "running" ? (
      <span aria-hidden />
    ) : (
      <p className="truncate text-sm text-muted-foreground">
        Tap the text to start
      </p>
    );

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        {showReadouts ? <MobileReadouts /> : fallback}
      </div>
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={() => restart()}
        aria-label={phase === "rest" ? "New passage" : "Restart test"}
        className="-mr-2 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw aria-hidden className="size-5" />
      </Button>
    </div>
  );
}
