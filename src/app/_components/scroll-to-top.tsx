"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Resets scroll to (0, 0) on every pathname change. Belt-and-suspenders
 *  alongside Next.js's default scroll-on-navigate — guards against the
 *  mobile-drawer body-scroll-lock interfering with the default behavior.
 *
 *  The window itself never scrolls inside the app: `AppChrome` is
 *  `h-dvh overflow-hidden` and delegates scrolling to the inner
 *  `[data-screenshot-root]` div. So `window.scrollTo(0, 0)` is a no-op
 *  for in-app surfaces; reset that real scroller too, otherwise a
 *  same-DOM param navigation (e.g. /profile/a → /profile/b) keeps the
 *  stale offset. Window scroll stays as a fallback for any surface that
 *  does scroll the document. */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector("[data-screenshot-root]")?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
