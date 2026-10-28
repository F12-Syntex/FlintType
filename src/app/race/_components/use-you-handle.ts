"use client";

import { useUser } from "@clerk/nextjs";

/** Pull a short, race-feed-friendly handle from the Clerk session.
 *  Mirrors the `firstName ?? username ?? email-localpart ?? "you"`
 *  fallback chain used in the topbar. Always prefixed with `@`. */
export function useYouHandle(): string {
  const { user, isSignedIn } = useUser();
  if (!isSignedIn || !user) return "@you";
  const raw =
    user.firstName ??
    user.username ??
    user.emailAddresses[0]?.emailAddress.split("@")[0] ??
    "you";
  return raw.startsWith("@") ? raw : `@${raw}`;
}
