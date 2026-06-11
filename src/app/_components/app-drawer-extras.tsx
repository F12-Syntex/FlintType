"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISCORD_URL, GITHUB_URL } from "@/lib/version";
import { SignOutLink } from "./sign-out-link";

type Item = { href: string; label: string; external?: boolean };

// Account / utility links — primary product nav already lives in the
// drawer body above. PROFILE and SETTINGS are here (not in the main nav)
// because they're account/config entries the user only opens
// occasionally; on desktop the same destinations live behind the gear /
// avatar icons in the topbar. PROFILE is signed-in only (guests have no
// profile); SETTINGS works for everyone.
const ACCOUNT_GUEST: Item[] = [{ href: "/customise", label: "SETTINGS" }];
const ACCOUNT_SIGNED_IN: Item[] = [
  { href: "/profile", label: "PROFILE" },
  { href: "/customise", label: "SETTINGS" },
];

const META: Item[] = [
  { href: DISCORD_URL, label: "DISCORD", external: true },
  { href: GITHUB_URL, label: "GITHUB", external: true },
  { href: "/privacy", label: "PRIVACY" },
  { href: "/terms", label: "TERMS" },
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
  const { isSignedIn } = useUser();
  const linkClass = cn(
    "uppercase tracking-[0.16em] transition-colors",
    dark ? "text-ft-warm-2 hover:text-ft-paper" : "text-ft-dim hover:text-ft-ink",
  );
  const account = isSignedIn ? ACCOUNT_SIGNED_IN : ACCOUNT_GUEST;

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {account.map((item) => (
          <FooterLink key={item.label} item={item} className={linkClass} />
        ))}
        {isSignedIn ? (
          <SignOutLink dark={dark} />
        ) : (
          <FooterLink
            item={{ href: "/sign-in", label: "SIGN IN" }}
            className={linkClass}
          />
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
