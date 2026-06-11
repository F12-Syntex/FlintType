"use client";

import { useEffect } from "react";

/** Suppresses the globally-mounted friends dock on chromeless surfaces
 *  that have no stable pathname to match (the 404 `not-found` page and the
 *  `error` boundary render at whatever URL the user hit). Sets
 *  `data-ft-no-dock` on <html> while mounted; the dock reads it via the
 *  same `useHtmlFlag` mechanism it uses for run / focus state. Routes with
 *  a known prefix (`/updates`, `/race`, …) stay in the dock's
 *  HIDDEN_PREFIXES list instead. */
export function HideFriendsDock() {
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-ft-no-dock", "on");
    return () => el.removeAttribute("data-ft-no-dock");
  }, []);
  return null;
}
