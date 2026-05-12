"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import type { RoomSnapshot } from "@/types/race";

/** Client-side connection to a server race room.
 *
 *  - Opens an EventSource against /api/race/stream/<roomId>
 *  - Buffers the latest snapshot in React state for renderers
 *  - Exposes `sendProgress` — debounced wrapper around the keystroke
 *    POST. The debounce coalesces a flurry of keystrokes into at most
 *    one POST every `keystrokeFlushMs` (default ~120ms). The
 *    trailing flush guarantees the latest cursor lands.
 *  - On unmount: closes the stream and fires `race.leave` so the room
 *    bookkeeping is honest (matchmaking rooms dispose when the last
 *    real player exits). */
export type RaceRoomBinding = {
  snapshot: RoomSnapshot | null;
  /** True once the first snapshot from the server has arrived. */
  ready: boolean;
  /** EventSource readyState surfaced for connection-state UI. */
  state: "connecting" | "open" | "closed";
  sendProgress: (
    progressChars: number,
    wpm: number,
    finished: boolean,
  ) => void;
  leave: () => void;
};

export type UseRaceRoomArgs = {
  roomId: string | null;
  sessionToken: string | null;
  keystrokeFlushMs?: number;
};

export function useRaceRoom({
  roomId,
  sessionToken,
  keystrokeFlushMs = 120,
}: UseRaceRoomArgs): RaceRoomBinding {
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [state, setState] = useState<"connecting" | "open" | "closed">(
    roomId ? "connecting" : "closed",
  );
  const ready = snapshot != null;

  const latestProgressRef = useRef<{
    progressChars: number;
    wpm: number;
    finished: boolean;
  } | null>(null);
  const lastSentAtRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SSE subscription. We carry roomId + sessionToken in refs so the
  // leave-on-unmount handler can fire one final POST without re-binding
  // the cleanup callback to every render.
  const roomRef = useRef(roomId);
  roomRef.current = roomId;
  const tokenRef = useRef(sessionToken);
  tokenRef.current = sessionToken;

  useEffect(() => {
    if (!roomId) {
      setState("closed");
      setSnapshot(null);
      return;
    }
    setState("connecting");
    const url = `/api/race/stream/${encodeURIComponent(roomId)}`;
    const es = new EventSource(url);
    es.onopen = () => setState("open");
    es.onerror = () => {
      // SSE retries automatically on transient errors. We only flip
      // to "closed" on hard close.
      if (es.readyState === EventSource.CLOSED) setState("closed");
    };
    es.onmessage = (e) => {
      try {
        const snap = JSON.parse(e.data) as RoomSnapshot;
        setSnapshot(snap);
      } catch {
        // Malformed payload — skip. The next snapshot recovers.
      }
    };
    return () => {
      es.close();
      setState("closed");
    };
  }, [roomId]);

  // Debounced keystroke POST. Strategy:
  //   - If last send was >= keystrokeFlushMs ago, fire immediately
  //   - Otherwise schedule a trailing flush at the next slot
  //   - Trailing flush always sends the latest snapshot, so the
  //     server eventually sees every progress jump even if the user
  //     types faster than the flush rate
  const flush = useCallback(() => {
    const room = roomRef.current;
    const token = tokenRef.current;
    const data = latestProgressRef.current;
    if (!room || !token || !data) return;
    lastSentAtRef.current = Date.now();
    latestProgressRef.current = null;
    // Fire-and-forget; the route always returns ok=true.
    void backend.race.keystroke({
      roomId: room,
      sessionToken: token,
      progressChars: data.progressChars,
      wpm: data.wpm,
      finished: data.finished,
    });
  }, [backend]);

  const sendProgress = useCallback(
    (progressChars: number, wpm: number, finished: boolean) => {
      latestProgressRef.current = { progressChars, wpm, finished };
      const since = Date.now() - lastSentAtRef.current;
      if (since >= keystrokeFlushMs) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flush();
        return;
      }
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flush();
      }, keystrokeFlushMs - since);
    },
    [flush, keystrokeFlushMs],
  );

  const leave = useCallback(() => {
    const room = roomRef.current;
    const token = tokenRef.current;
    if (!room || !token) return;
    void backend.race.leave({ roomId: room, sessionToken: token });
  }, [backend]);

  // Best-effort leave on unmount. Doesn't run on page hard-close
  // (tab close fires beforeunload but the navigator.sendBeacon path
  // would require extra plumbing — for now the room's idle GC kicks
  // in 5 min after the last activity).
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      leave();
    };
  }, [leave]);

  return { snapshot, ready, state, sendProgress, leave };
}
