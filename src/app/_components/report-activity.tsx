"use client";

import { useEffect } from "react";
import { setActivity } from "@/lib/presence-activity";
import type { PresenceStatus } from "@/types/presence";

/** Declares the local user's current presence activity while mounted, so
 *  the global heartbeat reports it to friends, then resets to "online"
 *  on unmount. Renders nothing. Mount one per activity surface:
 *  `<ReportActivity status="practicing" />` on the practice/drill
 *  surfaces, `<ReportActivity status="racing" />` on the race screen. */
export function ReportActivity({ status }: { status: PresenceStatus }) {
  useEffect(() => {
    setActivity(status);
    return () => setActivity("online");
  }, [status]);
  return null;
}
