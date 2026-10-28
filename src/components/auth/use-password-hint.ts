"use client";

import { useClerk } from "@clerk/nextjs";

/** The hint under a new-password field, taken from the Clerk instance's
 *  own password rules so it can never contradict the error Clerk shows
 *  ("Passwords must be 15 characters or more."). Clerk only exposes the
 *  loaded environment through an internal field, so read it defensively
 *  and fall back to wording that carries no number. */
export function usePasswordHint(): string {
  const clerk = useClerk() as unknown as {
    __internal_environment?: {
      userSettings?: { passwordSettings?: { min_length?: unknown } };
    } | null;
  };
  let min: unknown;
  try {
    min = clerk.__internal_environment?.userSettings?.passwordSettings?.min_length;
  } catch {
    min = undefined;
  }
  return typeof min === "number" && Number.isFinite(min) && min > 0
    ? `At least ${min} characters. A short phrase is easy to remember.`
    : "Use a long password or a short phrase.";
}
