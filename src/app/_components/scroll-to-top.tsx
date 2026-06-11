"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Resets scroll to (0, 0) on every pathname change. Belt-and-suspenders
 *  alongside Next.js's default scroll-on-navigate — guards against the
 *  mobile-drawer body-scroll-lock interfering with the default behavior.
 *
 *  AppChrome is `h-dvh overflow-hidden` and delegates scrolling to its
 *  inner `[data-screenshot-root]` div, so `window.scrollTo` is a no-op on
 *  chromed routes. Reset the real scroller (and the window for the few
 *  routes that scroll the document directly). */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    document
      .querySelector("[data-screenshot-root]")
      ?.scrollTo({ top: 0, left: 0 });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
