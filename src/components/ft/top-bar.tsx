"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/version";
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
        <nav
          aria-label="Main"
          className={cn(
            "ml-2 hidden flex-1 items-baseline gap-5 text-[11px] font-medium uppercase tracking-[0.16em] md:flex lg:gap-7",
            dark ? "text-ft-warm-2" : "text-muted-foreground",
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
                  // Underline is the active marker — sit it tight to
                  // the text baseline, primary in light, ember in dark.
                  "relative py-1 outline-none transition-colors",
                  active
                    ? cn(
                        dark ? "text-ft-paper" : "text-foreground",
                        "before:absolute before:right-0 before:bottom-0 before:left-0 before:h-[2px]",
                        dark ? "before:bg-ft-ember" : "before:bg-primary",
                      )
                    : cn(
                        dark
                          ? "hover:text-ft-paper focus-visible:text-ft-paper"
                          : "hover:text-foreground focus-visible:text-foreground",
                      ),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <span className="flex-1" />
      )}

      {/* Right cluster — caller actions + open-source badge.
       *  ml-auto isn't needed because <nav> is flex-1; the
       *  unconditional gap puts spacing between actions and hamburger. */}
      <div className="flex items-center gap-3 lg:gap-4">
        {right ? (
          <div className="hidden items-center gap-2 md:flex">{right}</div>
        ) : null}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="flinttype on GitHub (opens in new tab)"
          className={cn(
            "hidden items-baseline gap-1 text-[10px] uppercase tracking-[0.18em] outline-none transition-colors md:inline-flex",
            dark
              ? "text-ft-warm-3 hover:text-ft-paper focus-visible:text-ft-paper"
              : "text-muted-foreground/80 hover:text-foreground focus-visible:text-foreground",
          )}
        >
          <span>OSS</span>
          <span aria-hidden className="text-[9px]">
            ↗
          </span>
        </a>
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
