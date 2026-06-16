"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { setClientSignedIn } from "@/lib/client-auth";
import { requestSyncIfDirty } from "@/lib/prefs-store";

/** Mirrors Clerk's resolved auth state into the module-level
 *  `client-auth` store so non-React singletons (the prefs store) can
 *  skip the guaranteed-401 `/api/prefs/{get,set}` calls for anonymous
 *  visitors. On a sign-in it also nudges the prefs store to push any
 *  edits the user made while signed out, so settings still carry across
 *  the auth boundary. Renders nothing. */
export function ClientAuthSync() {
  const { isSignedIn, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    const signed = isSignedIn === true;
    setClientSignedIn(signed);
    if (signed) requestSyncIfDirty();
  }, [isLoaded, isSignedIn]);
  return null;
}
