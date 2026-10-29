"use client";

import { useEffect, useState } from "react";

/** Reads a `data-*` attribute off <html>, kept in sync with a observer so
 *  the dock can step aside while a run is active (`data-ft-running`) or
 *  focus mode is on (`data-ft-focus`) — the two states where the user
 *  asked the chrome to disappear (ui-law §15). */
export function useHtmlFlag(attr: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setOn(el.getAttribute(attr) === "1" || el.getAttribute(attr) === "on");
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: [attr] });
    return () => obs.disconnect();
  }, [attr]);
  return on;
}
