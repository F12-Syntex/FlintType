"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useMounted } from "@/lib/use-mounted";
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

/** Window event that closes the drawer (see closeMobileNav). */
const CLOSE_MOBILE_NAV_EVENT = "ft:close-mobile-nav";

/** Closes the hamburger drawer if it's open. For a top-bar control
 *  that opens its own overlay (the Friends panel): the drawer sits
 *  above the page at z-50, so that overlay would otherwise open, and
 *  take keyboard focus, underneath it. */
export function closeMobileNav() {
  window.dispatchEvent(new Event(CLOSE_MOBILE_NAV_EVENT));
}

export function MobileNav({
  nav,
  drawerExtras,
}: {
  nav?: NavItem[];
  drawerExtras?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Portal needs document — only available after mount.
  const mounted = useMounted();
  const pathname = usePathname();

  // Close on route change. Adjusted during render (React's "adjust
  // state when a prop changes" pattern) rather than in an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Lock body scroll + close on Escape (or closeMobileNav) while open.
  // The lock is the shared counted one, so an overlay that overlaps the
  // drawer and closes after it can't restore a stale "hidden". An
  // Escape something on top already handled (that overlay's own close)
  // leaves the drawer open.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(CLOSE_MOBILE_NAV_EVENT, close);
    const unlock = lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(CLOSE_MOBILE_NAV_EVENT, close);
      unlock();
    };
  }, [open]);

  if ((!nav || nav.length === 0) && !drawerExtras) return null;

  const isActive = (href: string) =>
    href === pathname ||
    (href !== "/" && pathname?.startsWith(href));

  // Drawer sits below the 64px topbar (plus the notch inset) so the
  // header stays visible. No enter/exit animation — instant show/hide.
  const drawer = open ? (
    <div
      id="mobile-nav-drawer"
      className="safe-pb fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 z-50 flex flex-col overflow-y-auto bg-background text-foreground lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      {nav && nav.length > 0 ? (
        <nav className="flex flex-col px-4 py-4 sm:px-6">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded-2xl px-4 text-xl font-semibold tracking-tight transition-colors",
                      active
                        ? "brand-surface text-primary-foreground"
                        : "text-foreground hover:bg-accent",
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
        // Same inset as the nav rows' text (px-4 + px-4), so every
        // left edge in the drawer lines up.
        <div className="mt-auto shrink-0 border-t border-border px-8 py-4 sm:px-10">
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
        className="-mr-1.5 flex size-11 items-center justify-center rounded-pill text-foreground transition-colors hover:bg-accent lg:hidden"
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
