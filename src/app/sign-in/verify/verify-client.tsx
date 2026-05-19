"use client";

import { useClerk } from "@clerk/nextjs";
import { EmailLinkErrorCode } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useEffect, useState } from "react";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        {status.kind === "verifying" ? (
          <>
            <span
              aria-hidden
              className="size-3 animate-pulse rounded-full bg-primary"
            />
            <h1 className="text-2xl font-bold tracking-[-0.02em]">
              Verifying your link…
            </h1>
            <p className="text-sm text-muted-foreground">
              Hang tight, this takes a second.
            </p>
          </>
        ) : null}

        {status.kind === "ok" ? (
          <>
            <h1 className="text-2xl font-bold tracking-[-0.02em]">
              You're verified.
            </h1>
            <p className="text-sm text-muted-foreground">
              If you started sign-in on another device, head back to that
              tab — it's already signed in. You can close this one.
            </p>
            <Link
              href="/"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Go to flinttype →
            </Link>
          </>
        ) : null}

        {status.kind === "error" ? (
          <>
            <h1 className="text-2xl font-bold tracking-[-0.02em]">
              That link didn't work.
            </h1>
            <p className="text-sm text-muted-foreground">{status.message}</p>
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Try signing in again →
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
    return "This link was opened on a different device or browser than the one that started sign-in. Open it on the original device, or start over from /sign-in.";
  if (err && typeof err === "object" && "errors" in err) {
    const first = (err as { errors?: { longMessage?: string; message?: string }[] })
      .errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong verifying the link.";
}
