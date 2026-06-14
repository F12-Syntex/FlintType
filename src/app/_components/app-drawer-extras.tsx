"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISCORD_URL, GITHUB_URL } from "@/lib/version";
import { SignOutLink } from "./sign-out-link";

type Item = { href: string; label: string; external?: boolean };

// Settings (/customise) works anonymously, so it shows in both auth
// states. PROFILE and SIGN OUT are signed-in-only (gated below); a
// signed-out user sees SIGN IN instead. On desktop these destinations
// live behind the gear / avatar / sign-in controls in the topbar.
const SETTINGS_ITEM: Item = { href: "/customise", label: "SETTINGS" };
const PROFILE_ITEM: Item = { href: "/profile", label: "PROFILE" };
const SIGN_IN_ITEM: Item = { href: "/sign-in", label: "SIGN IN" };

const META: Item[] = [
  { href: DISCORD_URL, label: "DISCORD", external: true },
  { href: GITHUB_URL, label: "GITHUB", external: true },
  { href: "#status", label: "STATUS" },
  { href: "#privacy", label: "PRIVACY" },
];

function FooterLink({
  item,
  className,
}: {
  item: Item;
  className: string;
}) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

/** Mobile drawer's bottom utility section — account links + meta links +
 *  sign out. Page nav lives in the drawer body above; no duplication. */
export function AppDrawerExtras({ dark = false }: { dark?: boolean }) {
  // Mirror topbar-actions.tsx: branch on the resolved Clerk session and
  // guard on `isLoaded` so the drawer never flashes the wrong auth
  // affordance. Signed out, the only auth control here used to be a
  // bogus SIGN OUT (and a PROFILE that just bounced to sign-in) — the
  // mobile topbar collapses to logo + hamburger with no Sign in pill, so
  // a signed-out mobile user had no honest way in.
  const { isLoaded, isSignedIn } = useUser();
  const linkClass = cn(
    "uppercase tracking-[0.16em] transition-colors",
    dark ? "text-ft-warm-2 hover:text-ft-paper" : "text-ft-dim hover:text-ft-ink",
  );

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {isLoaded && isSignedIn ? (
          <FooterLink item={PROFILE_ITEM} className={linkClass} />
        ) : null}
        <FooterLink item={SETTINGS_ITEM} className={linkClass} />
        {!isLoaded ? null : isSignedIn ? (
          <SignOutLink dark={dark} />
        ) : (
          <FooterLink item={SIGN_IN_ITEM} className={linkClass} />
        )}
        {META.map((item) => (
          <FooterLink key={item.label} item={item} className={linkClass} />
        ))}
      </div>
      <span
        className={cn(
          "mt-1 text-[10px] uppercase tracking-[0.16em]",
          dark ? "text-ft-warm-3" : "text-ft-dim-2",
        )}
      >
        STRIKE · SPARK · SHARPEN
      </span>
    </div>
  );
}
