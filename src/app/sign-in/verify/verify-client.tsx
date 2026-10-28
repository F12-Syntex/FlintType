"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  explainLinkError,
  precheck,
  statusAfterVerify,
  type VerifyStatus,
} from "./verify-status";

/** Runs Clerk's handleEmailLinkVerification once Clerk has loaded.
 *
 *  - Same-device flow: the link was opened in the browser that asked
 *    for it. Clerk activates the new session and sends the user to
 *    redirectUrlComplete ("/").
 *  - Cross-device flow: the link was opened somewhere else. The
 *    verification still completes server-side, which is what unblocks
 *    the original tab's startEmailLinkFlow polling, so this tab only
 *    says where to go back to.
 *  - Expired, failed or wrong-device links reject with Clerk's
 *    EmailLinkError and show its plain explanation. */
export function VerifyEmailLink() {
  const clerk = useClerk();
  // useClerk re-renders on every load-status change, so these stay live.
  const loaded = clerk.loaded;
  const clerkStatus = clerk.status;
  const [status, setStatus] = useState<VerifyStatus>({ kind: "verifying" });
  // One verification per visit, including React's dev double-mount.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const search = window.location.search;
    const blocked = precheck(search, clerkStatus);
    // Before clerk-js loads, Clerk only queues the call and resolves at
    // once; the queued call's real error is then dropped. Wait for it.
    if (!blocked && !loaded) return;
    started.current = true;
    (async () => {
      if (blocked) {
        setStatus(blocked);
        return;
      }
      try {
        await clerk.handleEmailLinkVerification({ redirectUrlComplete: "/" });
        setStatus(statusAfterVerify(search, clerk.session?.id));
      } catch (err) {
        setStatus({ kind: "error", message: explainLinkError(err) });
      }
    })();
  }, [clerk, loaded, clerkStatus]);

  return (
    <main className="safe-pt safe-pb flex min-h-dvh items-center justify-center px-4 text-foreground">
      <div
        role="status"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-card sm:px-8"
      >
        {status.kind === "verifying" ? (
          <>
            <span
              aria-hidden
              className="size-3 rounded-full bg-primary motion-safe:animate-pulse"
            />
            <h1 className="text-2xl font-bold tracking-tight">
              Verifying your link…
            </h1>
            <p className="text-sm text-muted-foreground">
              Hang tight, this takes a second.
            </p>
          </>
        ) : null}

        {status.kind === "signed-in" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              You&apos;re signed in
            </h1>
            <p className="text-sm text-muted-foreground">
              Taking you to practice…
            </p>
            <Link href="/" className={buttonVariants({ size: "lg", className: "mt-2" })}>
              Go to practice
            </Link>
          </>
        ) : null}

        {status.kind === "elsewhere" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              You&apos;re verified
            </h1>
            <p className="text-sm text-muted-foreground">
              Go back to the tab where you started signing in to carry on.
              You can close this one.
            </p>
            <Link href="/" className={buttonVariants({ size: "lg", className: "mt-2" })}>
              Go to practice
            </Link>
          </>
        ) : null}

        {status.kind === "error" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              That link didn&apos;t work
            </h1>
            <p className="text-sm text-muted-foreground">{status.message}</p>
            <Link
              href="/sign-in"
              className={buttonVariants({ size: "lg", className: "mt-2" })}
            >
              Sign in again
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}
