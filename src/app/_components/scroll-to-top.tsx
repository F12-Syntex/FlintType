"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** The app's page scroller (`<AppChrome>`). The window itself doesn't
 *  scroll on chrome pages, so resetting only the window did nothing. */
const SCROLLER_SELECTOR = "[data-ft-scroller]";

/** Start every page at the top on a pathname change (FT-067). Next's own
 *  scroll-on-navigate targets the window, and the mobile drawer's scroll
 *  lock can get in its way. Hash navigations (`/faq#races`) are left
 *  alone so anchors still land. Settings pages have their own scroller
 *  and `ScrollReset`. */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.location.hash) return;
    const reset = () => {
      window.scrollTo(0, 0);
      const scroller = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
      if (scroller) scroller.scrollTop = 0;
    };
    reset();
    // Next may scroll the new segment into view after this commit;
    // settle it again on the next frame.
    const raf = requestAnimationFrame(() => {
      if (!window.location.hash) reset();
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);
  return null;
}
