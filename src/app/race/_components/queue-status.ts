"use client";

import { createContext, useContext } from "react";

/** Status of the shell's "Find race" request (`race.queue`). The shell
 *  owns the request (it has to re-key PracticeProvider with the words
 *  the server returns), so it publishes pending + error here for the
 *  launcher to render: a disabled "Finding race…" button while the
 *  request is in flight, and a visible error line when it fails
 *  (ui-law §6.3) instead of a silent no-op. */
export type QueueStatus = {
  pending: boolean;
  error: string | null;
  /** True while the shell re-joins the same room for a rematch round
   *  (round > 1). The re-mounted subtree has no snapshot for a moment,
   *  which would otherwise route the body back to the launcher. */
  rematching?: boolean;
};

export const IDLE_QUEUE_STATUS: QueueStatus = { pending: false, error: null };

export const QueueStatusContext = createContext<QueueStatus>(IDLE_QUEUE_STATUS);

export function useQueueStatus(): QueueStatus {
  return useContext(QueueStatusContext);
}
