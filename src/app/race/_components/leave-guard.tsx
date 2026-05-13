"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRace } from "./race-state";
import { useLeaveGuard } from "./use-leave-guard";

/** Confirm-before-leave for an in-progress race. Mounts inside the
 *  RaceProvider tree so it can read phase via `useRace()`:
 *   - `phase === "finished"` OR the local user has crossed the line
 *     (`you.finishedAt != null`) → guard silently bypasses; once your
 *     own run is done the results screen is read-only progress and
 *     shouldn't prompt on exit, even if bots are still racing.
 *   - any other phase + `active=true` → beforeunload prompt for tab
 *     close, custom `<ConfirmDialog>` for in-app link clicks.
 *
 *  Replaces the older `window.confirm()` dialog so the prompt now
 *  matches the rest of the app's editorial language and respects
 *  mobile bottom-sheet behaviour out of the box.
 *
 *  `active` is the shell-level signal — true once the user is
 *  connected to a server room. The component decides whether to
 *  attach listeners based on `active && !finished`. */
export function LeaveGuard({ active }: { active: boolean }) {
  const { state } = useRace();
  const youFinished =
    state.racers.find((r) => r.isYou)?.finishedAt != null;
  const bypass = state.phase === "finished" || youFinished;
  const { pendingHref, confirm, cancel } = useLeaveGuard({ active, bypass });

  return (
    <ConfirmDialog
      open={pendingHref != null}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
      title="Leave the race?"
      confirmLabel="Leave"
      cancelLabel="Stay"
      confirmVariant="destructive"
      onConfirm={confirm}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        You&apos;re in a race. Leaving will drop you out — your
        opponents will keep going without you.
      </p>
    </ConfirmDialog>
  );
}
