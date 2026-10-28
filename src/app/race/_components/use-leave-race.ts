"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearHostStorage } from "../c/[slug]/_components/challenge-shell";
import { useRace } from "./race-state";

/** The one "leave this race" action, shared by the in-room "Leave race"
 *  strip and the results card: drop the seat, forget a private lobby's
 *  cached host handle (so reloading the old link doesn't silently re-join
 *  a dead room), and land on /race. The leave-guard whitelists /race
 *  navigation, so this never stacks a confirm dialog. */
export function useLeaveRace(): () => void {
  const { abandon, challengeSlug } = useRace();
  const router = useRouter();
  return useCallback(() => {
    abandon();
    if (challengeSlug) clearHostStorage(challengeSlug);
    router.push("/race");
  }, [abandon, challengeSlug, router]);
}
