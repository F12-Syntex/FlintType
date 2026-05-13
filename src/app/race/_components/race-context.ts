"use client";

import { createContext, useContext } from "react";
import type { RoomSnapshot } from "@/types/race";
import type { RaceModeId } from "./race-data";
import type { RaceState } from "./race-types";

/** Shared race context populated by the online provider. */
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
   *  redirects to /race. */
  cancelLobby: () => Promise<void> | void;
  /** True when the local user is the host of the current challenge
   *  room. Used to gate the host-only Cancel button. Always false for
   *  matchmaking races. */
  isHost: boolean;
  countdownNumber: number | null;
  elapsedSeconds: number;
  /** Connected room handle, populated by the online provider. Null
   *  while the user is still on the queue surface. */
  onlineRoomId?: string | null;
  onlineSessionToken?: string | null;
  onlineSnapshot?: RoomSnapshot | null;
  /** True when the provider was mounted from a challenge slug
   *  (`/race/c/<slug>`) rather than the matchmaking queue. The slug
   *  itself is exposed for the share-link UI. */
  isChallenge?: boolean;
  challengeSlug?: string | null;
  /** Session tokens of real players who've cast a rematch-ready vote
   *  on the current finished round. Empty until at least one user
   *  clicks Rematch; cleared the moment the new round starts.
   *  Drives the post-race "Ready · waiting for opponent" status. */
  rematchReady?: readonly string[];
  /** 1-indexed round counter inside the current room. Increments
   *  when a rematch starts. Surfaced so the UI can label "Round 2",
   *  "Round 3" if it wants. */
  roundNumber?: number;
};

export const RaceContext = createContext<RaceCtx | null>(null);

export function useRace(): RaceCtx {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRace must be used inside a RaceProvider");
  return ctx;
}
