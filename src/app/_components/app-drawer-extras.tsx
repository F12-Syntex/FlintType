"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { DISCORD_URL, GITHUB_URL } from "@/lib/version";
import { SignOutLink } from "./sign-out-link";

type Item = { href: string; label: string; external?: boolean };

// Settings (/customise) works anonymously, so it shows in both auth
// states. Profile and Sign out are signed-in-only (gated below); a
// signed-out user gets the Sign in link instead.
const SETTINGS_ITEM: Item = { href: "/customise", label: "Settings" };
const PROFILE_ITEM: Item = { href: "/profile", label: "Profile" };
const SIGN_IN_ITEM: Item = { href: "/sign-in", label: "Sign in" };

// Mirrors the footer's meta links (app-footer.tsx).
const META: Item[] = [
  { href: DISCORD_URL, label: "Discord", external: true },
  { href: GITHUB_URL, label: "GitHub", external: true },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
];

// 44px-tall rows: the drawer is a phone surface (ui-law §7).
const LINK_CLASS =
  "inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground";

function DrawerLink({ item }: { item: Item }) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={LINK_CLASS}>
      {item.label}
    </Link>
  );
}

/** Mobile drawer's bottom utility section — theme mode, account links
 *  and meta links. Page nav lives in the drawer body above. Branches on
 *  the resolved Clerk session and waits for `isLoaded` so the drawer
 *  never flashes the wrong auth affordance. */
export function AppDrawerExtras() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-muted-foreground">Theme</span>
        <ModeSwitcher />
      </div>
      <div className="flex flex-wrap gap-x-5">
        {isLoaded && isSignedIn ? <DrawerLink item={PROFILE_ITEM} /> : null}
        <DrawerLink item={SETTINGS_ITEM} />
        {!isLoaded ? null : isSignedIn ? (
          <SignOutLink className={LINK_CLASS} />
        ) : (
          <DrawerLink item={SIGN_IN_ITEM} />
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 text-[13px]">
        {META.map((item) => (
          <DrawerLink key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}
