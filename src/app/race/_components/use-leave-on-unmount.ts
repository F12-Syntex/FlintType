"use client";

import { useEffect, useRef } from "react";
import { useBackend } from "@/lib/backend";

/** Drop the race seat when the race surface unmounts by a soft
 *  navigation. Extracted from `<RaceShell>`; behaviour unchanged. */
export function useLeaveOnUnmount(
  online: { roomId: string; sessionToken: string } | null,
): void {
  const backend = useBackend();
  // Leave the room when the race surface is torn down by a soft
  // client-side navigation (browser back, a router push to another
  // route). Without this, a player who leaves a lobby this way lingers
  // in the roster for everyone else until the room's idle GC fires —
  // they "still appear in the room." Hard navigations and tab-close are
  // already covered by the pagehide beacon in `useRaceRoom`; this closes
  // the soft-nav gap.
  //
  // Deferred + cancel-on-remount: React strict-mode's dev double-mount
  // (unmount→remount in the same tick) would otherwise fire a spurious
  // leave that drops the user from the room they're still in. The
  // remount's setup clears the pending timer; a genuine navigation away
  // has no remount, so the leave fires a tick later. The shell itself is
  // NOT re-keyed on rematch (only its children are), so this never fires
  // mid-session. `online` is read through a ref so the cleanup sees the
  // live room handle, and spectators (empty token) are skipped.
  const onlineRef = useRef(online);
  const backendRef = useRef(backend);
  // Keep the refs current after every commit (not during render), so
  // the unmount cleanup below reads the live room handle.
  useEffect(() => {
    onlineRef.current = online;
    backendRef.current = backend;
  });
  const pendingLeaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (pendingLeaveRef.current) {
      clearTimeout(pendingLeaveRef.current);
      pendingLeaveRef.current = null;
    }
    return () => {
      const cur = onlineRef.current;
      if (!cur || !cur.sessionToken) return;
      pendingLeaveRef.current = setTimeout(() => {
        pendingLeaveRef.current = null;
        void backendRef.current.race.leave({
          roomId: cur.roomId,
          sessionToken: cur.sessionToken,
        });
      }, 200);
    };
  }, []);
}
