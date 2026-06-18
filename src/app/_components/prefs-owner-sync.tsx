"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { syncPrefsOwner } from "@/lib/prefs-store";

/** Keeps the prefs store's owner in lockstep with the signed-in user.
 *  Mounted once high in the tree (inside ClerkProvider, before any
 *  practice / customise surface calls loadPrefs) so a sign-in, sign-out,
 *  or account switch reconciles the store BEFORE stale values can bleed
 *  across users on a shared browser (ui-law isolation; see prefs-store.ts
 *  `syncPrefsOwner`). Renders nothing. */
export function PrefsOwnerSync() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    syncPrefsOwner(userId ?? null);
  }, [isLoaded, userId]);

  return null;
}
