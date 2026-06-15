"use client";

import { useEffect, useState } from "react";
import { Kbd } from "@/components/ft";
import { isApplePlatform } from "@/lib/platform";

/** Platform-aware command/control keycap for the "⌘ / Ctrl + K" palette hint.
 *  Renders ⌘ on macOS / iOS and "Ctrl" everywhere else, matching the command
 *  palette's binding (it fires on `metaKey || ctrlKey`). SSR and the first
 *  client render show the Ctrl form so the markup is stable; Apple clients
 *  swap to ⌘ after mount, so there's no hydration mismatch. */
export function ModKey({ className }: { className?: string }) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(isApplePlatform(navigator.platform || navigator.userAgent));
  }, []);

  return <Kbd className={className}>{isMac ? "⌘" : "Ctrl"}</Kbd>;
}
