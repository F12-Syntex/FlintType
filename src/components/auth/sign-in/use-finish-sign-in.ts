"use client";

// /legacy path — see ./index for why the custom flow uses the
// resource-based hook rather than the default "signals" export.
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { redirectFromSearch } from "@/lib/auth-redirect";

type Attempt = { status: string | null; createdSessionId: string | null };

/** Returns `finish(attempt)`: when a Clerk attempt is complete it
 *  activates the new session and sends the user on (to the page's safe
 *  `redirect_url`, else home), resolving true;
 *  otherwise it does nothing and resolves false so the caller can show
 *  its own "didn't complete" message. */
export function useFinishSignIn() {
  const { setActive } = useSignIn();
  const router = useRouter();
  return useCallback(
    async (attempt: Attempt): Promise<boolean> => {
      if (attempt.status !== "complete" || !attempt.createdSessionId) {
        return false;
      }
      await setActive?.({ session: attempt.createdSessionId });
      router.push(redirectFromSearch(window.location.search, window.location.origin));
      router.refresh();
      return true;
    },
    [setActive, router],
  );
}
