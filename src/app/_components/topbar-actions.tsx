"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Check, LogOut, Plus, Settings, User as UserIcon, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isFriendsDockRoute,
  OPEN_FRIENDS_EVENT,
  useFriendsDockOpen,
} from "@/components/friends-dock";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { clearUserScopedStorage } from "@/lib/sign-out-cleanup";
import { cn } from "@/lib/utils";
import { AccountAvatar } from "./account-avatar";
import { NotificationsPopover } from "./notifications-popover";

/** Right-side cluster shown in the AppChrome topbar:
 *  theme, notifications, settings, avatar (or Sign in).
 *
 *  Mobile (<md): the bell and the avatar / Sign in stay; theme and
 *  settings move into the hamburger drawer (<AppDrawerExtras>) so the
 *  bar never crowds the logo on a 375px viewport. */
export function TopbarActions() {
  return (
    <div className="flex items-center gap-1">
      <ThemeToggle className="hidden md:inline-flex" />
      <FriendsButton />
      <NotificationsPopover />
      <Link
        href="/customise"
        aria-label="Settings"
        title="Settings"
        className="hidden size-9 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
      >
        <GearIcon />
      </Link>
      <ProfileLink />
    </div>
  );
}

/** Toggles the friends dock below 2xl: the bottom sheet on phones, a
 *  panel under the bar from md. At 2xl+ the dock's own corner pill
 *  takes over (it sits in the page gutter there). The dock moves focus
 *  into the panel and back here when it closes; aria-expanded mirrors
 *  its open state. */
function FriendsButton() {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const open = useFriendsDockOpen();
  if (!isLoaded || !isSignedIn || !isFriendsDockRoute(pathname)) return null;
  return (
    <button
      type="button"
      aria-label="Friends"
      title="Friends"
      aria-haspopup="dialog"
      aria-expanded={open}
      data-friends-trigger
      onClick={() => window.dispatchEvent(new Event(OPEN_FRIENDS_EVENT))}
      className="flex size-11 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:size-9 2xl:hidden"
    >
      <Users className="size-[18px]" aria-hidden />
    </button>
  );
}

/** Avatar + name dropdown trigger. Clicking opens a menu with profile
 *  shortcuts, the list of all currently signed-in accounts (Clerk
 *  multi-session — switching is one tap, no re-auth), an "Add another
 *  account" link to the sign-in flow, and sign-out.
 *
 *  Display name comes from Clerk: firstName, then username, then the
 *  local-part of the primary email — whatever's defined first.
 *
 *  Anonymous (no Clerk session): swap to a 'Sign in' pill that
 *  routes to /sign-in. /app + /customise work without a session
 *  now (settings save to localStorage), so the topbar should never
 *  pretend the user is signed in when they aren't. */
function ProfileLink() {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  // The Clerk client object isn't a React Hook input, but its
  // .sessions array is mutated rather than replaced on session
  // changes. Mirror it into local state so the dropdown re-renders
  // when sign-in / sign-out / setActive runs.
  const [sessions, setSessions] = useState(() => clerk?.client?.sessions ?? []);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  useEffect(() => {
    // Clerk's client emits a `client:update` event on session
    // mutations; we re-snapshot the array on every emission.
    // Falling back to a polling listener would be wrong — Clerk's
    // public API exposes the event explicitly.
    //
    // `useClerk()` can transiently hand back an unready instance during
    // hydration (Next 16 / Turbopack), so guard before touching it —
    // a bare `clerk.addListener` then throws "Cannot read properties of
    // undefined (reading 'addListener')". The effect re-runs once Clerk
    // is ready (clerk is in the dep array).
    if (!clerk?.addListener) return;
    const sync = () => setSessions(clerk.client?.sessions ?? []);
    sync();
    const unsub = clerk.addListener((event) => {
      if (event.client) sync();
    });
    return () => unsub();
  }, [clerk]);

  if (isLoaded && !isSignedIn) {
    // Visible at every width — the drawer used to be the only way in
    // for a signed-out phone user.
    return (
      <Link
        href="/sign-in"
        // h-9 like every top-bar control (ui-law §11); touch-hit grows
        // the tap area to 44px on phones without a taller pill.
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "relative ml-1 h-9 px-3.5 touch-hit",
        )}
      >
        Sign in
      </Link>
    );
  }

  const displayName = !isLoaded
    ? "…"
    : (user?.firstName ??
        user?.username ??
        user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
        "Profile");
  // "" while Clerk loads (or with no name), which shows a person glyph.
  const initial = isLoaded ? displayName.charAt(0).toUpperCase() : "";
  const imageUrl = user?.hasImage ? user.imageUrl : null;
  const activeSessionId = clerk.session?.id ?? null;

  const handleSwitch = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    void clerk.setActive({ session: sessionId }).then(() => {
      // Force a router refresh so server components (profile route,
      // backend prefs fetch keyed on Clerk userId) repaint against
      // the freshly active session. Without this the page would
      // keep rendering for the previous user until next nav.
      router.refresh();
    });
  };

  const handleAddAccount = () => {
    // Stub for now: real multi-session add requires flipping the
    // Clerk dashboard toggle (User & Authentication → Multi-session
    // applications → On) AND swapping this for clerk.openSignIn().
    // Until that ships, surface a "coming soon" dialog so the menu
    // item doesn't read as broken.
    setComingSoonOpen(true);
  };

  const handleSignOut = () => {
    clearUserScopedStorage();
    void clerk.signOut().then(() => router.push("/"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={initial ? `Account menu for ${displayName}` : "Account menu"}
        className="flex size-11 items-center justify-center rounded-pill outline-none transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ring/40 md:ml-1 md:size-9"
      >
        <AccountAvatar initial={initial} src={imageUrl} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[15rem]">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          {user?.username ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              @{user.username}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span>View profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/customise")}>
          <Settings className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span>Settings</span>
        </DropdownMenuItem>

        {sessions.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Accounts</DropdownMenuLabel>
            {sessions.map((s) => {
              const u = s.user;
              if (!u) return null;
              const label =
                u.firstName ??
                u.username ??
                u.emailAddresses[0]?.emailAddress ??
                u.id;
              const isActive = s.id === activeSessionId;
              return (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => handleSwitch(s.id)}
                  className={isActive ? "text-primary" : undefined}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center">
                    {isActive ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </span>
                  <span className="truncate">{label}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}

        <DropdownMenuItem onSelect={handleAddAccount}>
          <Plus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="flex-1">Add another account</span>
          <span className="ml-auto rounded-pill border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Soon
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmDialog
        open={comingSoonOpen}
        onOpenChange={setComingSoonOpen}
        title="Multi-account support is coming soon"
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setComingSoonOpen(false)}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          We're wiring true multi-account so you can stay signed into more
          than one flinttype account on the same device and flip between
          them without re-auth. Until that ships, sign out and sign back in
          with the other account to use it.
        </p>
      </ConfirmDialog>
    </DropdownMenu>
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
