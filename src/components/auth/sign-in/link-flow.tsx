"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { extractClerkError } from "../clerk-error";
import { ErrorLine, UtilityButton, UtilityRow } from "../form-controls";
import { SigningInAs } from "./stages";
import { useFinishSignIn } from "./use-finish-sign-in";

export type LinkStatus =
  | { kind: "waiting" }
  | { kind: "failed"; message: string };

/** Drives Clerk's magic-link flow. `start` is called from a click
 *  handler (never an effect, so React's dev double-mount can't send two
 *  emails); it polls until the link is opened, then finishes sign-in.
 *  `cancel` stops polling; it also runs on unmount. */
export function useEmailLinkFlow() {
  const { signIn } = useSignIn();
  const finish = useFinishSignIn();
  const cancelRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<LinkStatus>({ kind: "waiting" });

  const cancel = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = useCallback(
    async (emailAddressId: string) => {
      if (!signIn) return;
      cancel();
      const flow = signIn.createEmailLinkFlow();
      cancelRef.current = () => {
        try {
          flow.cancelEmailLinkFlow();
        } catch {
          /* already cancelled */
        }
      };
      setStatus({ kind: "waiting" });
      try {
        const completed = await flow.startEmailLinkFlow({
          emailAddressId,
          redirectUrl: `${window.location.origin}/sign-in/verify`,
        });
        if (!(await finish(completed))) {
          setStatus({
            kind: "failed",
            message: "Sign-in didn't complete. Try another way in.",
          });
        }
      } catch (err) {
        // Cancelling throws without a message; only surface real errors.
        const message = extractClerkError(err);
        if (message) setStatus({ kind: "failed", message });
      } finally {
        cancelRef.current = null;
      }
    },
    [signIn, cancel, finish],
  );

  return { status, start, cancel };
}

export function LinkStage({
  email,
  status,
  onChangeEmail,
  onBack,
}: {
  email: string;
  status: LinkStatus;
  onChangeEmail: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SigningInAs email={email} onChange={onChangeEmail} />
      <p className="text-sm text-muted-foreground">
        We emailed you a sign-in link. Open it on this device and
        you&apos;ll be signed in here automatically.
      </p>
      {status.kind === "waiting" ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
          />
          Waiting for you to open the link…
        </div>
      ) : (
        <ErrorLine message={status.message} />
      )}
      <UtilityRow>
        <UtilityButton onClick={onBack}>Try another way</UtilityButton>
        <span />
      </UtilityRow>
    </div>
  );
}
