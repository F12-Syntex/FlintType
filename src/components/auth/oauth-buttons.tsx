"use client";

import { Button } from "@/components/ui/button";

/** Discord OAuth button — fires Clerk's authenticateWithRedirect.
 *  Used by both the sign-in and sign-up forms; on success, Clerk
 *  redirects through /sign-in/sso-callback (handled by its own
 *  page) and finally lands at /. If Discord isn't enabled in the
 *  Clerk dashboard, the click surfaces an error in the parent
 *  form's error slot. */
export function DiscordButton({
  onStart,
  disabled,
}: {
  onStart: () => Promise<void> | void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="default"
      size="default"
      disabled={disabled}
      onClick={() => void onStart()}
      className="w-full justify-center gap-3 bg-[#5865F2] text-white hover:bg-[#4752C4]"
    >
      <DiscordGlyph />
      Continue with Discord
    </Button>
  );
}

function DiscordGlyph() {
  // Discord's brand mark — single-colour so it inherits text-white
  // from the button and reads clean against the brand-blurple fill.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      className="shrink-0"
      fill="currentColor"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.7 14.7 0 0 0-.62 1.275 18.27 18.27 0 0 0-5.487 0A14.7 14.7 0 0 0 9.831 3 19.79 19.79 0 0 0 6.07 4.369C2.49 9.74 1.51 14.974 2 20.135a19.91 19.91 0 0 0 6.078 3.075 14.6 14.6 0 0 0 1.296-2.111 12.84 12.84 0 0 1-2.04-.984c.171-.126.339-.258.5-.394a14.213 14.213 0 0 0 12.332 0c.163.136.33.268.501.394a12.86 12.86 0 0 1-2.043.985 14.6 14.6 0 0 0 1.296 2.11 19.92 19.92 0 0 0 6.082-3.074c.575-6.041-.984-11.227-4.685-15.766ZM9.347 16.961c-1.218 0-2.222-1.118-2.222-2.487 0-1.37.978-2.488 2.222-2.488 1.245 0 2.246 1.128 2.222 2.488 0 1.369-.985 2.487-2.222 2.487Zm5.31 0c-1.219 0-2.221-1.118-2.221-2.487 0-1.37.977-2.488 2.221-2.488 1.246 0 2.246 1.128 2.222 2.488 0 1.369-.976 2.487-2.222 2.487Z" />
    </svg>
  );
}
