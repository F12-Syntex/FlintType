"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

export type NavItem = {
  href: string;
  label: string;
};

/** Top app chrome.
 *
 *  Three-column grid `[1fr auto 1fr]`:
 *
 *      ┌──────────────┬──────────────────────────────┬──────────────┐
 *      │ ◆ flinttype  │ ( Practice  Drills  Races … ) │  ☼ ⚙ ◯  ☰  │
 *      └──────────────┴──────────────────────────────┴──────────────┘
 *
 *  - The nav is a floating pill capsule centred on the page (lg+). The
 *    active route is a filled brand-orange pill (the logo's colour).
 *  - The right cluster always lives in column 3 and hugs the right edge.
 *    Below lg the nav column is empty, so the cluster can't slide into
 *    the middle of the bar (it used to, when the hidden nav dropped out
 *    of the grid).
 *  - The version moved to the footer; the bar carries the mark only. */
export function TopBar({
  nav,
  right,
  drawerExtras,
  sticky = true,
  className,
}: {
  nav?: NavItem[];
  /** Right-side slot — caller controls responsive visibility. */
  right?: React.ReactNode;
  /** Extra content shown only inside the mobile drawer (below nav). */
  drawerExtras?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === pathname || (href !== "/" && pathname?.startsWith(href));

  return (
    <header
      data-ft-topbar
      className={cn(
        "safe-pt z-30 grid h-[calc(4rem+env(safe-area-inset-top))] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/50 bg-background/60 px-4 text-foreground backdrop-blur-xl sm:px-6",
        sticky && "sticky top-0",
        className,
      )}
    >
      <Logo className="justify-self-start" />

      {nav && nav.length > 0 ? (
        <nav
          data-ft-topbar-pill
          aria-label="Main"
          className="hidden items-center gap-0.5 rounded-pill border border-border bg-card/80 p-1 shadow-card lg:flex"
        >
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-pill px-4 py-1.5 text-[13px] font-medium outline-none transition-[color,background-color] duration-200",
                  "focus-visible:ring-2 focus-visible:ring-ring/40",
                  active
                    ? "brand-surface text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <span aria-hidden />
      )}

      <div className="col-start-3 flex items-center gap-2 justify-self-end">
        {right}
        <MobileNav nav={nav} drawerExtras={drawerExtras} />
      </div>
    </header>
  );
}
