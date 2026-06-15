"use client";

import { useEffect } from "react";

/** Mount on a standalone full-page surface (the 404 / error pages) to hide
 *  the globally-mounted friends dock while that surface is shown. Those
 *  pages own the bottom-right corner with their own footer and have no
 *  fixed pathname for the dock's prefix list to match, so they raise
 *  `<html data-ft-no-dock="1">` for the dock to read (FT-052 / ui-law
 *  §17.5). Cleared on unmount so the dock returns on the next route. */
export function HideFriendsDock() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-ft-no-dock", "1");
    return () => root.removeAttribute("data-ft-no-dock");
  }, []);
  return null;
}
