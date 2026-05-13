"use client";

import { type ReactNode } from "react";
import { OnlineRaceProvider } from "./race-online";
import { useRace as useRaceShared } from "./race-context";
import type { RaceModeId } from "./race-data";

/** Top-level RaceProvider — every race mode is server-driven (passage
 *  racing against bots + real opponents over SSE). The provider is a
 *  thin wrapper around OnlineRaceProvider; it exists so callers can
 *  import `RaceProvider` from one place even if we ever bring a new
 *  non-online mode back. */
export function RaceProvider(props: {
  modeId: RaceModeId;
  raceSeed: number;
  withQueue: boolean;
  youName: string;
  setModeId: (next: RaceModeId) => void;
  restartShell: () => void;
  enterQueueShell?: () => void;
  /** Optional pre-joined online room — used by challenge pages so the
   *  provider doesn't run its own queue handshake (the page already
   *  has roomId + sessionToken from challenge.create/join). */
  initialOnlineRoom?: { roomId: string; sessionToken: string } | null;
  /** Slug of the challenge room when the provider was mounted from
   *  `/race/c/<slug>`. Surfaced via RaceCtx.challengeSlug so the
   *  share-link UI can render. */
  challengeSlug?: string | null;
  /** Shell-supplied queue-entry callback. The online provider hands
   *  control back to the shell so the shell can fetch words from
   *  the server and re-key PracticeProvider before the racing UI
   *  needs them. */
  onlineEnterQueue?: () => void;
  onlineAbandon?: () => void;
  /** Fires when the host cancels the challenge mid-flight. Shell
   *  clears the slug-side state and bounces to /race. */
  onlineRoomCancelled?: () => void;
  children: ReactNode;
}) {
  return (
    <OnlineRaceProvider
      {...props}
      initialRoom={props.initialOnlineRoom ?? null}
      onEnterQueue={props.onlineEnterQueue}
      onAbandon={props.onlineAbandon}
      onRoomCancelled={props.onlineRoomCancelled}
    >
      {props.children}
    </OnlineRaceProvider>
  );
}

export const useRace = useRaceShared;
