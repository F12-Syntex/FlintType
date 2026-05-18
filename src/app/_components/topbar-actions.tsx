"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Check, LogOut, Plus, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
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
    <div className="flex items-center gap-2">
      {/* Hide mode switch on the always-dark race surface so it can't
          fight the screen's intentional fixed presentation. */}
      {dark ? null : <ModeSwitcher className="hidden md:inline-flex" />}
      <NotificationsPopover dark={dark} />
      <Link
        href="/customise"
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
function ProfileLink({ dark }: { dark: boolean }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  // The Clerk client object isn't a React Hook input, but its
  // .sessions array is mutated rather than replaced on session
  // changes. Mirror it into local state so the dropdown re-renders
  // when sign-in / sign-out / setActive runs.
  const [sessions, setSessions] = useState(() => clerk.client?.sessions ?? []);
  useEffect(() => {
    // Clerk's client emits a `client:update` event on session
    // mutations; we re-snapshot the array on every emission.
    // Falling back to a polling listener would be wrong — Clerk's
    // public API exposes the event explicitly.
    const sync = () => setSessions(clerk.client?.sessions ?? []);
    sync();
    const unsub = clerk.addListener((event) => {
      if (event.client) sync();
    });
    return () => unsub();
  }, [clerk]);

  if (isLoaded && !isSignedIn) {
    return (
      <Link
        href="/sign-in"
        aria-label="Sign in"
        className={cn(
          "hidden items-center gap-2 rounded-md px-3 py-1 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors md:flex",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-foreground hover:bg-foreground/5",
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
  const initial = (displayName.charAt(0) || "·").toUpperCase();
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
    // `openSignIn` opens Clerk's embedded sign-in modal in the
    // "add session" flow when multi-session is enabled in the
    // Clerk dashboard. When it isn't enabled, Clerk shows its
    // standard "already signed in" surface inside the modal,
    // which at least keeps the user on-page instead of routing
    // to a /sign-in URL that can't satisfy the request (the
    // ?session=add query we used to send was a guess Clerk
    // doesn't honour).
    clerk.openSignIn();
  };

  const handleSignOut = () => {
    void clerk.signOut().then(() => router.push("/"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Profile · ${displayName}`}
        className={cn(
          "hidden items-center gap-2 rounded-md px-2 py-1 outline-none transition-colors md:flex",
          "focus-visible:ring-1 focus-visible:ring-ring",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-foreground hover:bg-foreground/5",
        )}
      >
        <Avatar initial={initial} dark={dark} />
        <span className="max-w-[120px] truncate text-[11px] font-medium tracking-[0.14em] uppercase">
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-[14rem]">
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span>View profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/customise")}>
          <Settings className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span>Customise</span>
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
          <span>Add another account</span>
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
