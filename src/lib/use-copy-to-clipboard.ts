"use client";

import { useCallback, useRef, useState } from "react";

/** Copy text to the clipboard and flash a `copied` flag for `resetMs`,
 *  then auto-clear it. Falls back to a `window.prompt` when the
 *  Clipboard API is unavailable (older browsers, non-secure contexts,
 *  some iframes) so the user can still grab the text manually.
 *
 *  Replaces the per-component copy/`setCopied`/`setTimeout` boilerplate
 *  that several share-link surfaces hand-rolled identically. */
export function useCopyToClipboard(resetMs = 1500): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        window.prompt("Copy this", text);
      }
    },
    [resetMs],
  );

  return { copied, copy };
}
