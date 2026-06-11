"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Float the launcher just above the page footer (or a corner gap when
 *  there isn't one), mirroring the friends dock. */
function useFooterHeight(routeKey: string): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-ft-footer]");
      if (!el) return setH(0);
      const visible = getComputedStyle(el).display !== "none";
      setH(visible ? el.getBoundingClientRect().height : 0);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [routeKey]);
  return h;
}

/** A bottom-centre launcher for the Design with AI studio. Pressing it
 *  navigates to the studio page (no inline chat any more); it hides on the
 *  studio itself and on the themes explorer. */
export function CustomiseAiDock() {
  const pathname = usePathname();
  const footerH = useFooterHeight(pathname);

  if (
    pathname.startsWith("/customise/appearance/ai") ||
    pathname === "/customise/appearance/themes"
  ) {
    return null;
  }

  return (
    <div
      // Bottom-left on mobile so it never collides with the bottom-right
      // friends-dock pill; bottom-centre once there's room (sm+), where the
      // dock sits far enough to the right to clear it.
      className="pointer-events-none fixed left-4 z-40 sm:left-1/2 sm:-translate-x-1/2"
      style={{
        bottom: `calc(${footerH}px + 0.75rem + env(safe-area-inset-bottom))`,
      }}
    >
      <Link
        href="/customise/appearance/ai"
        className="pointer-events-auto flex h-11 items-center rounded-full bg-card px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-lg transition-colors hover:bg-accent"
      >
        Design with AI
      </Link>
    </div>
  );
}
