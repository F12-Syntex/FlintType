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
      // On narrow viewports the centred pill is wide enough to reach the
      // right edge and collide with the friends dock (also bottom-anchored,
      // z-40). Raise the launcher to stack above the dock's h-11 pill there
      // (still bottom-centre, ui-law §12.8); from sm+ the centred pill no
      // longer reaches the corner dock, so fall back to the normal gap.
      // `--ft-ai-footer` carries the dynamic footer height so `bottom` can
      // stay a responsive class (inline style would override the breakpoint).
      className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 bottom-[calc(var(--ft-ai-footer)_+_3.75rem_+_env(safe-area-inset-bottom))] sm:bottom-[calc(var(--ft-ai-footer)_+_0.75rem_+_env(safe-area-inset-bottom))]"
      style={{ ["--ft-ai-footer" as string]: `${footerH}px` }}
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
