"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Resets scroll to (0, 0) on every pathname change. Belt-and-suspenders
 *  alongside Next.js's default scroll-on-navigate — guards against the
 *  mobile-drawer body-scroll-lock interfering with the default behavior. */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
