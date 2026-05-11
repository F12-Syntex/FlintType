"use client";

import { Button } from "@/components/ui/button";

/** Google OAuth button — fires Clerk's authenticateWithRedirect.
 *  Used by both the sign-in and sign-up forms; on success, Clerk
 *  redirects through /sign-in/sso-callback (handled by its own
 *  page) and finally lands at /. If Google isn't enabled in the
 *  Clerk dashboard, the click surfaces an error in the parent
 *  form's error slot. */
export function GoogleButton({
  onStart,
  disabled,
}: {
  onStart: () => Promise<void> | void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      disabled={disabled}
      onClick={() => void onStart()}
      className="w-full justify-center gap-3"
    >
      <GoogleGlyph />
      Continue with Google
    </Button>
  );
}

function GoogleGlyph() {
  // Static G mark — flat, mono-style so it sits cleanly inside our
  // outline button without competing with the project's coral accent.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 18"
      aria-hidden
      className="shrink-0"
    >
      <path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"
      />
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#FBBC05"
        d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"
      />
    </svg>
  );
}
