"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useBackend } from "@/lib/backend";

const HEARTBEAT_MS = 30_000;

/** Global presence heartbeat. While a signed-in tab is visible, posts
 *  `presence.heartbeat` every 30s (and immediately on mount / when the
 *  tab becomes visible again) so friends see the user as online.
 *  Self-mounting; renders nothing. Failures are swallowed — presence is
 *  best-effort and must never surface an error. */
export function PresenceHeartbeat() {
  const { isSignedIn, isLoaded } = useUser();
  const backend = useBackend();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const beat = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      backend.presence.heartbeat({}).catch(() => {});
    };
    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [backend, isLoaded, isSignedIn]);

  return null;
}
