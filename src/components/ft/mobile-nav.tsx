"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./top-bar";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className="size-5"
      aria-hidden
    >
      {open ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

export function MobileNav({
  nav,
  drawerExtras,
  dark = false,
}: {
  nav?: NavItem[];
  drawerExtras?: React.ReactNode;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape; lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if ((!nav || nav.length === 0) && !drawerExtras) return null;

  const isActive = (href: string) =>
    href === pathname ||
    (href !== "/" && href !== "/app" && pathname?.startsWith(href));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className={cn(
          "-mr-2 flex size-11 items-center justify-center md:hidden",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-ft-ink hover:bg-black/5",
        )}
      >
        <MenuIcon open={open} />
      </button>

      {open ? (
        <div
          className={cn(
            "fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col overflow-y-auto md:hidden",
            "animate-in slide-in-from-top-2 fade-in duration-150",
            dark
              ? "border-t border-[#221F1A] bg-ft-ink text-ft-paper"
              : "border-t border-ft-line-soft bg-ft-paper text-ft-ink",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {nav && nav.length > 0 ? (
            <nav className="flex flex-col">
              {nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between border-b px-5 py-5 text-sm uppercase tracking-[0.14em] transition-colors",
                      dark
                        ? "border-[#221F1A] hover:bg-white/5"
                        : "border-ft-line-soft hover:bg-black/[0.02]",
                      active && "text-ft-ember",
                    )}
                  >
                    <span>{item.label}</span>
                    {active ? (
                      <span className="size-1.5 bg-ft-ember" aria-hidden />
                    ) : (
                      <span
                        className={cn(
                          "text-xs",
                          dark ? "text-[#6E695F]" : "text-ft-dim",
                        )}
                      >
                        →
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {drawerExtras ? (
            <div
              className={cn(
                "mt-auto flex flex-col gap-3 p-5",
                dark ? "border-t border-[#221F1A]" : "border-t border-ft-line-soft",
              )}
            >
              {drawerExtras}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
