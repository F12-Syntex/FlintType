"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppVersionLabel } from "@/lib/version-context";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

export type NavItem = {
  href: string;
  label: string;
};

/** Top app chrome.
 *
 *  Layout, lg+:
 *
 *      ┌──────────────────────────────────────────────────────────────────┐
 *      │  ◇ FLINTTYPE 6.6.0   PRACTICE  RACE  …  RIGHT-SLOT   GH↗   ☰    │
 *      └──────────────────────────────────────────────────────────────────┘
 *
 *  - Logo + version sit on the left, version-label muted so it doesn't
 *    compete with the brand mark.
 *  - Nav links (md+): caps-tracked, foreground/65 base, primary on
 *    active. Active item gets a 2-px primary underline aligned to the
 *    text baseline (no animated reveal — the editorial brand is
 *    confident, not coy).
 *  - Hover state: simple foreground-100 swap; no animated underline.
 *    The previous animated reveal made the bar feel busy.
 *  - "Open source ↗" badge moved into the right cluster — fewer
 *    things competing along the centre baseline. Hidden < md.
 *  - Right slot stays for caller-supplied actions (sign-in, profile,
 *    notifications). We constrain it to a flex row so multiple chips
 *    line up without each call site re-wrapping.
 *  - Mobile: only the logo + hamburger render; the rest goes into
 *    the drawer. */
export function TopBar({
  nav,
  right,
  drawerExtras,
  version,
  dark = false,
  sticky = true,
  className,
}: {
  nav?: NavItem[];
  /** Right-side slot — caller controls responsive visibility. */
  right?: React.ReactNode;
  /** Extra content shown only inside the mobile drawer (below nav). */
  drawerExtras?: React.ReactNode;
  /** Override the version pill. When omitted, falls back to the
   *  request-time VERSION read via <VersionProvider>, then to the
   *  build-time env var snapshot. */
  version?: string;
  dark?: boolean;
  sticky?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const ctxVersion = useAppVersionLabel();
  const resolvedVersion = version ?? ctxVersion;
  const isActive = (href: string) =>
    href === pathname || (href !== "/" && pathname?.startsWith(href));

  return (
    <header
      data-ft-topbar
      className={cn(
        // h-14 keeps parity with the existing 56px chrome height that
        // the rest of the layout reserves room for.
        "safe-pt z-30 flex h-14 items-center gap-5 border-b px-4 backdrop-blur-md sm:px-6 lg:gap-7 lg:px-8",
        sticky && "sticky top-0",
        dark
          ? "border-ft-ink-line bg-ft-ink/85 text-ft-paper"
          : "border-border bg-background/85 text-foreground",
        className,
      )}
    >
      <Logo dark={dark} version={resolvedVersion} />

      {nav && nav.length > 0 ? (
        <div className="ml-3 hidden flex-1 md:flex lg:ml-4">
          <nav
            aria-label="Main"
            className={cn(
              // Wrap the nav in the same surface treatment as the
              // ModeSwitcher: rounded card with a hairline border and
              // tight inner padding, so the nav reads as one
              // discrete control next to the right-cluster pill.
              "inline-flex items-center gap-0.5 overflow-hidden rounded-md border p-0.5",
              dark
                ? "border-white/10 bg-white/[0.04]"
                : "border-border bg-card",
            )}
          >
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // Active link picks up a subtle tint so it reads
                    // as the selected segment within the card; the
                    // weight + colour cue is still the dominant
                    // signal so the nav stays editorial-calm.
                    "rounded-[5px] px-3 py-1.5 text-[13px] tracking-tight outline-none transition-colors",
                    active
                      ? dark
                        ? "bg-white/[0.06] font-semibold text-ft-paper"
                        : "bg-foreground/[0.06] font-semibold text-foreground"
                      : dark
                        ? "font-normal text-ft-warm-2 hover:bg-white/[0.04] hover:text-ft-paper focus-visible:text-ft-paper"
                        : "font-normal text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground focus-visible:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : (
        <span className="flex-1" />
      )}

      {/* Right cluster — caller-supplied actions + the mobile
       *  hamburger. The OSS link was redundant chrome (the GitHub
       *  link lives in the footer + about page); dropped to keep
       *  the bar quieter. */}
      <div className="flex items-center gap-3 lg:gap-4">
        {right ? (
          <div className="hidden items-center gap-2 md:flex">{right}</div>
        ) : null}
        <MobileNav nav={nav} drawerExtras={drawerExtras} dark={dark} />
      </div>
    </header>
  );
}

/** Identity slot for the right-hand side of the topbar. Wraps inline
 *  text so the right cluster keeps a uniform baseline with the nav
 *  links above. The deprecated `emberDot` prop is retained as a
 *  no-op so existing callers compile until they're migrated. */
export function IdentDot({
  children,
}: {
  children: React.ReactNode;
  /** @deprecated retained so existing callers compile; the indicator dot was removed. */
  emberDot?: boolean;
}) {
  return (
    <span className="hidden items-center text-[11px] uppercase tracking-[0.14em] md:flex">
      {children}
    </span>
  );
}
