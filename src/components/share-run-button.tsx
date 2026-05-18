"use client";

import { Check, Share2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Variant = "icon" | "labelled";

/** One-stop share affordance for a completed run.
 *
 *  Behaviour identical across every surface that hosts it (the
 *  end-of-run summary, profile recent-runs, insights recent-tests,
 *  leaderboard rows): builds a `/r/<testId>` URL against the current
 *  origin, prefers the OS share sheet via `navigator.share` when
 *  available, falls back to `navigator.clipboard.writeText` and
 *  flashes a `COPIED` tick for 1.5s.
 *
 *  Two visual modes:
 *    - `icon` (default) — 22×22 ghost icon button for dense row
 *      surfaces. Tooltip describes the action; the icon swaps to a
 *      check on success and the tooltip text follows ("Copied").
 *    - `labelled` — icon + tracked label for use inside the larger
 *      post-test summary toolbar, where the row pattern would read
 *      as too quiet.
 *
 *  Why not pure `<button>` markup at the call site? Three reasons:
 *  (1) the copy/share/clipboard branching is non-trivial and would
 *  drift if each surface forked its own; (2) the COPIED feedback is
 *  load-bearing — users need an acknowledgement when no system
 *  sheet pops up; (3) `navigator.share` consent flow has its own
 *  cancellation path that needs a try/catch shaped exactly so. */
export function ShareRunButton({
  testId,
  variant = "icon",
  className,
}: {
  testId: string;
  variant?: Variant;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  // Track the reset timer so back-to-back clicks don't pile up
  // overlapping "back to share" transitions.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onShare = useCallback(async () => {
    const url = `${window.location.origin}/r/${testId}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "flinttype run" });
        return;
      }
    } catch {
      // User cancelled the OS share sheet — fall through to clipboard
      // so they still get a usable link rather than silent failure.
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1_500);
    } catch (err) {
      console.error("[share-run-button] copy failed", err);
    }
  }, [testId]);

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={onShare}
        aria-label="Copy a shareable link to this run"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        {copied ? (
          <Check size={13} className="shrink-0 text-primary" />
        ) : (
          <Share2 size={13} className="shrink-0" />
        )}
        {copied ? "copied" : "share"}
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            // Defensive: rows that wrap the button in a clickable parent
            // (the profile RunRow is inside a list, the leaderboard row
            // has a handle Link) shouldn't navigate when the user is
            // intentionally hitting share. The same gesture should never
            // produce two actions.
            e.stopPropagation();
            e.preventDefault();
            void onShare();
          }}
          aria-label="Copy a shareable link to this run"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-none",
            copied && "text-primary hover:text-primary",
            className,
          )}
        >
          {copied ? (
            <Check size={14} className="shrink-0" aria-hidden />
          ) : (
            <Share2 size={14} className="shrink-0" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {copied ? "Copied" : "Copy share link"}
      </TooltipContent>
    </Tooltip>
  );
}
