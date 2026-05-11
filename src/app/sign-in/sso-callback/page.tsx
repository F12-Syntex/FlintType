"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/** Lands here after Clerk completes the OAuth round-trip. The
 *  built-in callback finalises the session, then redirects to the
 *  redirectUrlComplete passed at sign-in / sign-up time (we set
 *  '/' for both). The visible spinner is just a safety net for
 *  the brief moment Clerk takes to flip into the active session. */
export default function SsoCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <AuthenticateWithRedirectCallback />
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Finishing sign-in…
      </p>
    </main>
  );
}
