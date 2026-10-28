"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** The settings scroller (see `customise/layout.tsx`). */
const SCROLLER_SELECTOR = "[data-customise-scroller]";

/** Start every settings page at the top. The settings shell keeps one
 *  scroller across pages, so without this a page switch keeps the old
 *  page's offset, and Next's "scroll the new segment into view" leaves
 *  the new h1 under the sticky mobile header. Hash navigations
 *  (`/customise/theme#colors`) are left alone so anchors still land. */
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash) return;
    const scroller = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
    if (!scroller) return;
    scroller.scrollTop = 0;
    // Next may scroll the segment into view after this commit; settle
    // it again on the next frame.
    const raf = requestAnimationFrame(() => {
      if (!window.location.hash) scroller.scrollTop = 0;
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
