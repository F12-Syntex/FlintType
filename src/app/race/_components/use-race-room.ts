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
    errors: number,
    accuracy: number,
  ) => void;
  leave: () => void;
  /** Cast a rematch-ready vote for the current round. Resolves to
   *  `started=true` when this vote met threshold and the new round
   *  has already kicked off server-side. `force` is the host's
   *  override that starts the next round immediately (challenge rooms). */
  rematch: (force?: boolean) => Promise<{ started: boolean }>;
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
    errors: number;
    accuracy: number;
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
    // When NEXT_PUBLIC_RACE_SERVICE_URL is set (production hybrid:
    // Vercel front, Railway race authority), the EventSource opens
    // cross-origin against the authority. Unset in local dev →
    // relative URL → same-origin same as today.
    const base = process.env.NEXT_PUBLIC_RACE_SERVICE_URL?.replace(/\/$/, "") ?? "";
    const url = `${base}/api/race/stream/${encodeURIComponent(roomId)}`;
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
      errors: data.errors,
      accuracy: data.accuracy,
    });
  }, [backend]);

  const sendProgress = useCallback(
    (
      progressChars: number,
      wpm: number,
      finished: boolean,
      errors: number,
      accuracy: number,
    ) => {
      latestProgressRef.current = {
        progressChars,
        wpm,
        finished,
        errors,
        accuracy,
      };
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

  const rematch = useCallback(async (force = false) => {
    const room = roomRef.current;
    const token = tokenRef.current;
    if (!room || !token) return { started: false };
    try {
      const res = await backend.race.rematch({
        roomId: room,
        sessionToken: token,
        force,
      });
      return { started: res.started };
    } catch {
      // Soft-fail — the SSE snapshot is still the source of truth
      // for whether a new round actually started; a network glitch
      // on the vote just means the user re-clicks.
      return { started: false };
    }
  }, [backend]);

  // No auto-leave on unmount. React strict-mode and dev fast-refresh
  // both double-invoke effect cleanups, which would call `race.leave`
  // during a transient unmount-then-remount. The server treats a
  // matchmaking room with no real players left as disposable, so a
  // strict-mode unmount would dispose the room the user just queued
  // for and the remount's SSE stream would 404. The room's own 5-min
  // idle GC + the explicit `abandon` callback handle real-leave
  // cases; we only flush the debounce timer here.
  //
  // Page-unload, however, IS a genuine leave — the user is gone, and
  // dragging the server's room around for the full 5-min GC means the
  // matchmaking queue advertises a phantom slot. Fire `race.leave`
  // through navigator.sendBeacon on `pagehide` so the cleanup hits
  // even when the browser is in the middle of unloading us. We use
  // pagehide (not beforeunload) because Safari ignores beforeunload
  // beacons and Chromium fires pagehide on bfcache enter too.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageHide = (e: PageTransitionEvent) => {
      // `event.persisted === true` means the page is being put into
      // the back-forward cache rather than truly unloading. iOS
      // Safari and modern Chromium often fire pagehide on tab-switch
      // or browser-backgrounded states where the user IS coming
      // back. Firing leave there marks them disconnected mid-race,
      // freezes their progress for everyone else, and orphans the
      // SSE stream that the resumed page re-opens. Only fire leave
      // on genuine unloads (persisted=false).
      if (e.persisted) return;
      const room = roomRef.current;
      const token = tokenRef.current;
      // Spectators receive an empty `sessionToken` — they never
      // occupied a server-side seat, so there's nothing to free.
      // Skip the beacon for them entirely.
      if (!room || !token) return;
      const url = "/api/race/leave";
      const body = JSON.stringify({ roomId: room, sessionToken: token });
      // Some browsers reject sendBeacon for application/json — wrap in
      // a Blob with that mime so the dispatcher's JSON-body parser
      // still picks it up cleanly.
      try {
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon(
            url,
            new Blob([body], { type: "application/json" }),
          );
        } else {
          void fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          });
        }
      } catch {
        // Best-effort — the server's 5-min idle GC catches anything
        // we miss here.
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  return { snapshot, ready, state, sendProgress, leave, rematch };
}
