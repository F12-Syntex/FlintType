"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { setCacheOwner } from "@/lib/cache-owner";
import { reconcileUser } from "@/lib/prefs-store";

/** Keeps the browser-local caches (the prefs blob, the PB-crown cache,
 *  the BURST rolling-average cache) tied to the signed-in account, so one
 *  user's data never bleeds into the next account on a shared browser
 *  (FT-017 / FT-041). Runs as early as Clerk resolves the user and on
 *  every sign-in / sign-out / account switch. Renders nothing. */
export function ClientCacheGate() {
  const { isLoaded, user } = useUser();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!isLoaded) return;
    setCacheOwner(userId);
    reconcileUser(userId);
  }, [isLoaded, userId]);
  return null;
}
