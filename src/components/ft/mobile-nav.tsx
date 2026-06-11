"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { NavItem } from "./top-bar";

/** Hamburger ↔ X morphing icon. Three lines that translate together to form
 *  a stack at rest, and rotate around the centre into an X when open. */
function MorphIcon({ open }: { open: boolean }) {
  const transition = "transition-transform duration-200 ease-out";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-6"
      aria-hidden
    >
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className={transition}
        style={{
          transformOrigin: "center",
          transform: open ? "rotate(45deg)" : "translateY(-5px)",
        }}
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className="transition-opacity duration-150 ease-out"
        style={{ opacity: open ? 0 : 1 }}
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className={transition}
        style={{
          transformOrigin: "center",
          transform: open ? "rotate(-45deg)" : "translateY(5px)",
        }}
      />
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal needs document — only available after mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + close on Escape while open.
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
    (href !== "/" && pathname?.startsWith(href));

  // Drawer sits below the 56 px topbar so the existing header stays visible.
  // No enter/exit animation per request — instant show/hide.
  const drawer = open ? (
    <div
      className={cn(
        "fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col overflow-y-auto md:hidden",
        dark
          ? "bg-foreground text-background"
          : "bg-background text-foreground",
      )}
      id="mobile-nav-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      {nav && nav.length > 0 ? (
        <nav className="flex flex-col px-5 py-6 sm:px-7">
          <ul className="flex flex-col">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block py-3 text-2xl font-bold tracking-tight transition-colors sm:text-3xl",
                      active
                        ? "text-primary"
                        : dark
                          ? "text-ft-paper hover:text-ft-ember"
                          : "text-foreground hover:text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {drawerExtras ? (
        <div
          className={cn(
            "mt-auto shrink-0 border-t px-5 py-5 sm:px-7",
            dark ? "border-ft-ink-line" : "border-border",
          )}
        >
          {drawerExtras}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className={cn(
          "-mr-2 flex size-11 items-center justify-center rounded-md transition-colors md:hidden",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-foreground hover:bg-foreground/5",
        )}
      >
        <MorphIcon open={open} />
      </button>

      {/* Portal the drawer to document.body so it escapes the topbar's
          stacking context. The TopBar is `sticky z-30` which creates a new
          stacking context — without portal, <main> (later in DOM, no z-index)
          would paint on top of the drawer despite a higher z-index. */}
      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
