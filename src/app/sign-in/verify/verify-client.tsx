"use client";

import { useClerk } from "@clerk/nextjs";
import { EmailLinkErrorCode } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";

type Status =
  | { kind: "verifying" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

/** Runs Clerk's handleEmailLinkVerification on mount.
 *
 *  - Same-device flow: the user clicked the link in the same browser
 *    they started in. handleEmailLinkVerification picks up the ticket
 *    in the URL, sets the active session, and Clerk redirects to
 *    redirectUrlComplete ("/").
 *  - Cross-device flow: link clicked from email on another device.
 *    The verification still completes server-side, which is what
 *    unblocks the originating tab's startEmailLinkFlow polling. We
 *    just show a "you can close this tab" screen — Clerk won't have a
 *    session to set on *this* device. */
export function VerifyEmailLink() {
  const clerk = useClerk();
  const [status, setStatus] = useState<Status>({ kind: "verifying" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Clerk's link lands here with `__clerk_status` (or a ticket). A
      // bookmark, a refresh or a mangled link has neither, and must not
      // read as a success.
      const params = new URLSearchParams(window.location.search);
      if (!params.has("__clerk_status") && !params.has("__clerk_ticket")) {
        setStatus({
          kind: "error",
          message: "This link is incomplete. Start signing in again to get a new one.",
        });
        return;
      }
      try {
        await clerk.handleEmailLinkVerification({
          redirectUrl: "/sign-in/verify",
          redirectUrlComplete: "/",
        });
        if (!cancelled) setStatus({ kind: "ok" });
      } catch (err) {
        if (cancelled) return;
        setStatus({ kind: "error", message: explainError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clerk]);

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

        {status.kind === "ok" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              You&apos;re verified
            </h1>
            <p className="text-sm text-muted-foreground">
              If you started sign-in on another device, head back to that
              tab, it&apos;s already signed in. You can close this one.
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

function explainError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code?: string }).code
      : undefined;
  if (code === EmailLinkErrorCode.Expired)
    return "This link has expired. Request a new one.";
  if (code === EmailLinkErrorCode.Failed)
    return "Verification failed. Request a fresh sign-in link.";
  if (code === EmailLinkErrorCode.ClientMismatch)
    return "This link was opened on a different device or browser than the one that started sign-in. Open it on the original device, or start signing in again.";
  if (err && typeof err === "object" && "errors" in err) {
    const first = (err as { errors?: { longMessage?: string; message?: string }[] })
      .errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong verifying the link.";
}
