"use client";

import { useEffect, useState } from "react";
import { Kbd } from "@/components/ft";

/** Renders the command-palette open hint with the correct platform
 *  modifier key: ⌘ on macOS/iOS, Ctrl everywhere else. The command
 *  palette binds both, but the displayed glyph should match the user's
 *  keyboard. Defaults to ⌘ on the server and corrects after mount to
 *  avoid a hydration mismatch. */
export function CommandKeyHint() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    const platform =
      // navigator.userAgentData is the modern source; platform is the
      // widely-supported fallback.
      (
        navigator as Navigator & { userAgentData?: { platform?: string } }
      ).userAgentData?.platform ||
      navigator.platform ||
      "";
    setIsMac(/mac|iphone|ipad|ipod/i.test(platform));
  }, []);
  return (
    <span>
      tip: press <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>+<Kbd>K</Kbd> to search routes
    </span>
  );
}
