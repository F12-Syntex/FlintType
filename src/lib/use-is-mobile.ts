"use client";

import { useEffect, useState } from "react";

/** Tailwind's `md` breakpoint mirrored as a runtime value so JS-side
 *  branching (e.g. mount-as-bottom-sheet vs. mount-as-popover) stays in
 *  lockstep with the CSS rules elsewhere in the app. Keep these in sync
 *  with `tailwind.config` / the `@theme` block in `globals.css` when
 *  either changes. */
const MOBILE_QUERY = "(max-width: 767px)";

/** Reactive viewport-class hook — returns `true` while the viewport is
 *  below `md`. SSR-safe: starts as `false` on the server (assumes
 *  desktop) and resyncs after mount to avoid layout flashes inside
 *  hydration. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return mobile;
}
