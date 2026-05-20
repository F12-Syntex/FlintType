"use client";

import { useEffect, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import { watchPollDelay } from "@/lib/live-cadence";
import type { WatchOutput } from "@/types/live";

/** Hold incoming snapshots ~1s before showing them, so the mirrored
 *  screen advances smoothly instead of stuttering with network jitter. */
const BUFFER_MS = 1_000;
const TICK_MS = 150;

type Queued = { out: WatchOutput; at: number };

/** Polls `live.watch` and plays results through a ~1s buffer for smooth
 *  playback. Self-throttling + tab-aware: fast while the target is live,
 *  a slow backoff when they're not, and **paused entirely while the tab
 *  is hidden** — a backgrounded watch tab makes zero requests. */
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
    let pollTimer = 0;
    let live = false;
    queueRef.current = [];
    seenRef.current = 0;
    lastKindRef.current = null;

    const poll = () => {
      if (cancelled) return;
      // Don't poll a backgrounded tab — re-check cheaply until it's
      // foregrounded again (the visibilitychange listener wakes it sooner).
      if (typeof document !== "undefined" && document.hidden) {
        pollTimer = window.setTimeout(poll, 1_000);
        return;
      }
      backend.live
        .watch({ userId })
        .then((s) => {
          if (cancelled) return;
          live = s.live;
          if (s.live) {
            if (s.updatedAtMs > seenRef.current) {
              seenRef.current = s.updatedAtMs;
              queueRef.current.push({ out: s, at: Date.now() });
              lastKindRef.current = "live";
            }
          } else if (lastKindRef.current !== "off") {
            queueRef.current.push({ out: s, at: Date.now() });
            lastKindRef.current = "off";
          }
        })
        .catch(() => {})
        .finally(() => {
          if (cancelled) return;
          pollTimer = window.setTimeout(poll, watchPollDelay(live));
        });
    };

    const tick = () => {
      const cutoff = Date.now() - BUFFER_MS;
      let picked: Queued | null = null;
      while (queueRef.current.length && queueRef.current[0].at <= cutoff) {
        picked = queueRef.current.shift() ?? null;
      }
      if (picked) setDisplay(picked.out);
    };

    const onVisible = () => {
      if (!cancelled && !document.hidden) {
        window.clearTimeout(pollTimer);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    poll();
    const tickId = window.setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
      window.clearInterval(tickId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [backend, userId, enabled]);

  return display;
}
