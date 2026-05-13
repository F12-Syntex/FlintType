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
  /** Challenge host action — destroys the lobby for everyone. The
   *  cancel cascades via SSE: every connected client (host included)
   *  receives a final snapshot with `cancelled: true` and the shell
   *  redirects to /race. Offline providers wire this to a no-op since
   *  there's no server room to cancel. */
  cancelLobby: () => Promise<void> | void;
  /** True when the local user is the host of the current challenge
   *  room. Used to gate the host-only Cancel button. Always false for
   *  matchmaking races and for offline providers. */
  isHost: boolean;
  dispatch: (action: Action) => void;
  countdownNumber: number | null;
  elapsedSeconds: number;
  /** Online providers expose the connected room handle here for the
   *  challenge UI (share link, host start). Offline providers leave
   *  these `null`. */
  onlineRoomId?: string | null;
  onlineSessionToken?: string | null;
  onlineSnapshot?: RoomSnapshot | null;
  /** True when the provider was mounted from a challenge slug
   *  (`/race/c/<slug>`) rather than the matchmaking queue. Used by
   *  offline-burst challenge lobbies that need to suppress the
   *  auto-countdown and wait for the host to click Start. The slug
   *  itself is exposed for the share-link UI. */
  isChallenge?: boolean;
  challengeSlug?: string | null;
};

export const RaceContext = createContext<RaceCtx | null>(null);

export function useRace(): RaceCtx {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRace must be used inside a RaceProvider");
  return ctx;
}
