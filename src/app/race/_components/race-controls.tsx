"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRace } from "./race-state";
import { useLeaveRace } from "./use-leave-race";

/** Top race strip, sibling of practice's `<ModeBar>`. Phase-aware:
 *
 *    queue    → nothing. The idle screen is the centred
 *               `<RaceLauncher>` in the body (mode switch, Find race,
 *               Create private lobby), so there's no setup strip.
 *    in a room (matching / lobby / countdown / racing) → a single quiet
 *               "Leave race" button, both the exit and the back button.
 *    finished → nothing; the results card owns Rematch + Leave. */
export function RaceControls() {
  const { state } = useRace();
  const leave = useLeaveRace();
  const phase = state.phase;

  if (phase === "queue" || phase === "finished") return null;

  // h-11 on phones clears the 44px touch floor (ui-law §7); the compact
  // h-8 returns from sm where a pointer is likely.
  return (
    <div className="flex shrink-0 items-center pt-2 sm:pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={leave}
        className="-ml-3 h-11 text-muted-foreground sm:h-8"
      >
        <LogOut aria-hidden />
        Leave race
      </Button>
    </div>
  );
}
