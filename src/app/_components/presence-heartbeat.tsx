"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useBackend } from "@/lib/backend";
import { getActivity, subscribeActivity } from "@/lib/presence-activity";

const HEARTBEAT_MS = 30_000;

/** Global presence heartbeat. While a signed-in tab is visible, posts
 *  `presence.heartbeat` every 30s (and immediately on mount / when the
 *  tab becomes visible again) so friends see the user as online. The
 *  beat carries the current activity (`getActivity()` — "online" by
 *  default, "practicing" / "racing" while one of those surfaces is
 *  mounted), and an activity change fires an immediate beat so friends
 *  see the switch within a second rather than on the next ~30s tick.
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
      backend.presence.heartbeat({ status: getActivity() }).catch(() => {});
    };
    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    const unsubscribe = subscribeActivity(beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
    };
  }, [backend, isLoaded, isSignedIn]);

  return null;
}
