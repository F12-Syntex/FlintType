"use client";

import { createContext, useContext } from "react";
import type { RoomSnapshot } from "@/types/race";
import type { RaceModeId } from "./race-data";
import type { Action, RaceState } from "./race-types";

/** Shared race context. Both the offline (burst) and online (passage)
 *  providers populate this same object so `useRace()` consumers don't
 *  have to branch on which provider is mounted upstream. */
export type RaceCtx = {
  state: RaceState;
  modeId: RaceModeId;
  setModeId: (modeId: RaceModeId) => void;
  enterQueue: () => void;
  startCountdown: () => void;
  restart: () => void;
  abandon: () => void;
  rematch: () => void;
  dispatch: (action: Action) => void;
  countdownNumber: number | null;
  elapsedSeconds: number;
  /** Online providers expose the connected room handle here for the
   *  challenge UI (share link, host start). Offline providers leave
   *  these `null`. */
  onlineRoomId?: string | null;
  onlineSessionToken?: string | null;
  onlineSnapshot?: RoomSnapshot | null;
};

export const RaceContext = createContext<RaceCtx | null>(null);

export function useRace(): RaceCtx {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRace must be used inside a RaceProvider");
  return ctx;
}
