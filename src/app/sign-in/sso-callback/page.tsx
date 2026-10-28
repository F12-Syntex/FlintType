"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/** Lands here after Clerk completes the OAuth round-trip. The
 *  built-in callback finalises the session, then redirects to the
 *  redirectUrlComplete passed at sign-in / sign-up time (we set
 *  '/' for both). The visible spinner is just a safety net for
 *  the brief moment Clerk takes to flip into the active session. */
export default function SsoCallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center gap-3 text-foreground">
      {/* Explicit URLs so a stale or cancelled round-trip lands on our
          own pages, never Clerk's hosted portal. */}
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      />
      <span
        aria-hidden
        className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
      />
      <p role="status" className="text-sm text-muted-foreground">
        Finishing sign-in…
      </p>
    </main>
  );
}
