"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRace } from "./race-state";

/** Top race strip, sibling of practice's `<ModeBar>`. Phase-aware:
 *
 *    queue    → nothing. The idle screen is the centred
 *               `<RaceLauncher>` in the body (mode switch, Find race,
 *               Create private lobby), so there's no setup strip.
 *    in a room (matching / lobby / countdown / racing) → a single quiet
 *               "Leave race" button, both the exit and the back button.
 *    finished → nothing; the results card owns Rematch + Leave. */
export function RaceControls() {
  const { state, abandon } = useRace();
  const router = useRouter();
  const phase = state.phase;

  if (phase === "queue" || phase === "finished") return null;

  // In a room: drop the seat and return to /race. The leave-guard
  // whitelists /race navigation, so this never stacks a confirm dialog.
  return (
    <div className="flex shrink-0 items-center pt-3 sm:pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          abandon();
          router.push("/race");
        }}
        className="-ml-3 text-muted-foreground"
      >
        <LogOut aria-hidden />
        Leave race
      </Button>
    </div>
  );
}
