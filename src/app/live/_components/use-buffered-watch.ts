"use client";

import { useEffect, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import type { WatchOutput } from "@/types/live";

const POLL_MS = 600;
/** Hold incoming snapshots ~1s before showing them. Polls are jittery
 *  and a hair apart; replaying them a beat behind, in arrival order, on
 *  a steady ticker makes the spectated screen advance smoothly instead
 *  of stuttering whenever a poll lands late. Latency we trade for calm. */
const BUFFER_MS = 1_000;
const TICK_MS = 120;

type Queued = { out: WatchOutput; at: number };

/** Polls `live.watch` and plays the results through a ~1s buffer, so the
 *  spectated screen updates in a smooth, consistent cadence rather than
 *  in time with raw network jitter. Returns the buffered snapshot to
 *  render (null until the first one clears the buffer). */
export function useBufferedWatch(
  userId: string,
  enabled: boolean,
): WatchOutput | null {
  const backend = useBackend();
  const [display, setDisplay] = useState<WatchOutput | null>(null);
  const queueRef = useRef<Queued[]>([]);
  const seenRef = useRef(0);
  const lastKindRef = useRef<"live" | "off" | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    queueRef.current = [];
    seenRef.current = 0;
    lastKindRef.current = null;

    const poll = () => {
      backend.live
        .watch({ userId })
        .then((s) => {
          if (cancelled) return;
          if (s.live) {
            // Enqueue only genuinely new frames (dedupe by push time).
            if (s.updatedAtMs > seenRef.current) {
              seenRef.current = s.updatedAtMs;
              queueRef.current.push({ out: s, at: Date.now() });
              lastKindRef.current = "live";
            }
          } else if (lastKindRef.current !== "off") {
            // Buffer the live → not-live transition too, so it lands a
            // beat later in step with everything else.
            queueRef.current.push({ out: s, at: Date.now() });
            lastKindRef.current = "off";
          }
        })
        .catch(() => {});
    };

    const tick = () => {
      const cutoff = Date.now() - BUFFER_MS;
      let picked: Queued | null = null;
      while (queueRef.current.length && queueRef.current[0].at <= cutoff) {
        picked = queueRef.current.shift() ?? null;
      }
      if (picked) setDisplay(picked.out);
    };

    poll();
    const pollId = window.setInterval(poll, POLL_MS);
    const tickId = window.setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [backend, userId, enabled]);

  return display;
}
