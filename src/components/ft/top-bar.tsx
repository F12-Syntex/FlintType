"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
};

export function TopBar({
  nav,
  ident,
  version = "v0.4",
  dark = false,
  className,
}: {
  nav?: NavItem[];
  ident?: React.ReactNode;
  version?: string;
  dark?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === pathname || (href !== "/app" && pathname?.startsWith(href));

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between gap-4 border-b px-5 sm:px-7",
        dark
          ? "border-[#221F1A] bg-ft-ink text-ft-paper"
          : "border-ft-line-soft bg-ft-paper text-ft-ink",
        className,
      )}
    >
      <Link
        href={dark ? "/app" : "/"}
        className="flex shrink-0 items-baseline gap-2 text-sm font-bold tracking-wide"
      >
        <span
          className="inline-block size-2.5 rotate-45 bg-ft-ember"
          aria-hidden
        />
        <span className="tracking-[0.04em]">FLINTTYPE</span>
        <span
          className={cn(
            "hidden text-[11px] tracking-[0.06em] sm:inline",
            dark ? "text-[#6E695F]" : "text-ft-dim",
          )}
        >
          {version}
        </span>
      </Link>

      {nav && nav.length > 0 ? (
        <nav
          className={cn(
            "hidden items-center gap-5 text-[11px] uppercase tracking-[0.14em] md:flex",
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
                  "transition-colors",
                  active && "border-b border-ft-ember pb-1",
                  active && (dark ? "text-ft-paper" : "text-ft-ink"),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div
        className={cn(
          "flex shrink-0 items-center gap-3 text-[11px] uppercase tracking-[0.14em]",
          dark ? "text-[#B5AF9F]" : "text-ft-dim",
        )}
      >
        {ident}
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
    <span className="flex items-center gap-3">
      <span className="hidden sm:inline">{children}</span>
      <span
        className={cn("size-1.5", emberDot ? "bg-ft-ember" : "bg-ft-ok")}
        aria-hidden
      />
    </span>
  );
}
