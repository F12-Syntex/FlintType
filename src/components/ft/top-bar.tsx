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

export function TopBar({
  nav,
  right,
  drawerExtras,
  version = "v0.4 · OPEN SOURCE",
  dark = false,
  sticky = true,
  className,
}: {
  nav?: NavItem[];
  /** Right-side slot — caller controls responsive visibility (e.g. `hidden sm:flex`). */
  right?: React.ReactNode;
  /** Extra content shown only inside the mobile drawer (below nav links). */
  drawerExtras?: React.ReactNode;
  version?: string;
  dark?: boolean;
  sticky?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === pathname ||
    (href !== "/" && href !== "/app" && pathname?.startsWith(href));

  return (
    <header
      className={cn(
        "z-30 flex h-14 items-center gap-4 border-b px-5 backdrop-blur-md sm:px-7",
        sticky && "sticky top-0",
        dark
          ? "border-[#221F1A] bg-ft-ink/85 text-ft-paper"
          : "border-ft-line-soft bg-ft-paper/85 text-ft-ink",
        className,
      )}
    >
      <Logo dark={dark} version={version} />

      {nav && nav.length > 0 ? (
        <nav
          className={cn(
            "ml-6 hidden flex-1 items-center gap-6 text-[11px] uppercase tracking-[0.14em] md:flex",
            dark ? "text-[#B5AF9F]" : "text-ft-dim-2",
          )}
        >
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-1 transition-colors",
                  "after:absolute after:right-0 after:bottom-0 after:left-0 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-150",
                  "hover:after:scale-x-100",
                  dark ? "hover:text-ft-paper" : "hover:text-ft-ink",
                  active &&
                    cn(
                      "border-b border-ft-ember after:hidden",
                      dark ? "text-ft-paper" : "text-ft-ink",
                    ),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {/* Right group — always pinned to the far right (ml-auto) so the
          hamburger sits on the right edge on mobile. */}
      <div className="ml-auto flex items-center gap-3">
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
        <MobileNav nav={nav} drawerExtras={drawerExtras} dark={dark} />
      </div>
    </header>
  );
}

export function IdentDot({
  children,
  emberDot = false,
}: {
  children: React.ReactNode;
  emberDot?: boolean;
}) {
  return (
    <span className="hidden items-center gap-3 text-[11px] uppercase tracking-[0.14em] md:flex">
      <span>{children}</span>
      <span
        className={cn("size-1.5", emberDot ? "bg-ft-ember" : "bg-ft-ok")}
        aria-hidden
      />
    </span>
  );
}
