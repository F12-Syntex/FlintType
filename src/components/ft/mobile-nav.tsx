"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HiOutlineBars3, HiOutlineXMark } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import type { NavItem } from "./top-bar";

export function MobileNav({
  nav,
  drawerExtras,
  version,
  dark = false,
}: {
  nav?: NavItem[];
  drawerExtras?: React.ReactNode;
  version?: string;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + close on Escape while open
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
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={cn(
          "-mr-2 flex size-11 items-center justify-center transition-colors md:hidden",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-ft-ink hover:bg-black/5",
        )}
      >
        <HiOutlineBars3 className="size-6" aria-hidden />
      </button>

      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-50 flex flex-col md:hidden",
            "animate-in fade-in slide-in-from-top-4 duration-200",
            dark ? "bg-ft-ink text-ft-paper" : "bg-ft-paper text-ft-ink",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Drawer header — mirrors the topbar layout */}
          <div
            className={cn(
              "flex h-14 shrink-0 items-center justify-between border-b px-5 sm:px-7",
              dark ? "border-[#221F1A]" : "border-ft-line-soft",
            )}
          >
            <Logo dark={dark} version={version} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className={cn(
                "-mr-2 flex size-11 items-center justify-center transition-colors",
                dark
                  ? "text-ft-paper hover:bg-white/5"
                  : "text-ft-ink hover:bg-black/5",
              )}
            >
              <HiOutlineXMark className="size-6" aria-hidden />
            </button>
          </div>

          {/* Nav links — large, centered vertically */}
          {nav && nav.length > 0 ? (
            <nav className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-7">
              <ul className="flex flex-col gap-1">
                {nav.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center justify-between gap-3 px-2 py-4 text-2xl font-bold tracking-tight transition-colors sm:text-3xl",
                          active && "text-ft-ember",
                          !active &&
                            (dark
                              ? "text-ft-paper hover:text-ft-ember"
                              : "text-ft-ink hover:text-ft-ember"),
                        )}
                      >
                        <span>{item.label}</span>
                        <span
                          className={cn(
                            "text-base transition-transform group-hover:translate-x-1",
                            active
                              ? "text-ft-ember"
                              : dark
                                ? "text-[#6E695F]"
                                : "text-ft-dim",
                          )}
                          aria-hidden
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          {/* Drawer extras (auth CTAs etc.) pinned to the bottom */}
          {drawerExtras ? (
            <div
              className={cn(
                "shrink-0 border-t px-5 py-6 sm:px-7",
                dark ? "border-[#221F1A]" : "border-ft-line-soft",
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
