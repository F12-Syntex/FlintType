"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsPopover } from "./notifications-popover";

/** Right-side cluster shown in the AppChrome topbar:
 *  notifications · settings · profile (avatar + name).
 *
 *  Mobile (<md): only the notifications bell stays in the topbar. The
 *  hamburger drawer carries the profile + settings entries via
 *  <AppDrawerExtras> so the topbar doesn't get crowded against the logo +
 *  hamburger on a 375px viewport.
 *
 *  Desktop (md+): full row — bell, gear, profile pill (avatar + name).
 */
export function TopbarActions({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <NotificationsPopover dark={dark} />
      <Link
        href="/app/customise"
        aria-label="Settings"
        className={cn(
          "hidden size-9 items-center justify-center rounded-md transition-colors md:flex",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-foreground hover:bg-foreground/5",
        )}
      >
        <GearIcon />
      </Link>
      <ProfileLink dark={dark} />
    </div>
  );
}

/** Avatar + name in a single Link so the rounded hover surface covers
 *  both as one unit. Display name comes from Clerk: firstName, then
 *  username, then the local-part of the primary email — whatever's
 *  defined first. */
function ProfileLink({ dark }: { dark: boolean }) {
  const { user, isLoaded } = useUser();

  const displayName = !isLoaded
    ? "…"
    : (user?.firstName ??
        user?.username ??
        user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
        "Profile");
  const initial = (displayName.charAt(0) || "·").toUpperCase();

  return (
    <Link
      href="/app/profile"
      aria-label={`Profile · ${displayName}`}
      className={cn(
        "hidden items-center gap-2 rounded-md px-2 py-1 transition-colors md:flex",
        dark
          ? "text-ft-paper hover:bg-white/5"
          : "text-foreground hover:bg-foreground/5",
      )}
    >
      <Avatar initial={initial} dark={dark} />
      <span className="max-w-[120px] truncate text-[11px] font-medium tracking-[0.14em] uppercase">
        {displayName}
      </span>
    </Link>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.07a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.07a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function Avatar({ initial, dark }: { initial: string; dark: boolean }) {
  // Initial-on-circle avatar — placeholder until a real image source is
  // wired through. Uses the ember accent so it reads as the user's mark.
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-[10px] font-bold tracking-wide",
        dark
          ? "bg-ft-paper/10 text-ft-paper"
          : "bg-primary/10 text-primary",
      )}
    >
      {initial}
    </span>
  );
}
