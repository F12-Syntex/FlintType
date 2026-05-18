"use client";

import { Check, Loader2, Share2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildShareSlug } from "@/lib/share-slug";
import { cn } from "@/lib/utils";

type Variant = "icon" | "labelled";

/** Three terminal states the share action can land in. `shared`
 *  fires when the OS share sheet swallows the call (we don't get to
 *  read which app the user picked); `copied` and `saved` mark the
 *  desktop fallbacks. All three flash the same brief check tick. */
type ShareResult = "shared" | "copied" | "saved";

/** One-stop share affordance for a completed run.
 *
 *  The shared artifact is the run's dynamic OG image, not a URL —
 *  social posts surface the image inline rather than a link card the
 *  platform has to scrape and render. Three transports, tried in
 *  order based on what the browser supports:
 *
 *    1. `navigator.share({ files })` — preferred on mobile (iOS
 *       Safari, Android Chrome). The OS share sheet opens with the
 *       PNG attached; the user picks Messages, Twitter, Discord, …
 *       and the image lands inline in whatever target accepts it.
 *    2. `navigator.clipboard.write({ ClipboardItem })` — desktop
 *       fallback. The user can paste the image directly into any
 *       Slack / Discord / Twitter / iMessage composer.
 *    3. Download — last resort. Drops a `flinttype-<slug>.png` into
 *       the user's downloads so they can attach it manually.
 *
 *  Visual: a small Share icon with hover/focus tooltip in `icon`
 *  variant (row surfaces), or a labelled "share image" button in
 *  `labelled` variant (post-test summary toolbar). While the fetch
 *  is in flight the icon swaps to a spinner so back-to-back clicks
 *  don't issue parallel fetches against the OG renderer. */
export function ShareRunButton({
  testId,
  handle,
  wpm,
  variant = "icon",
  className,
}: {
  testId: string;
  /** Runner's handle — `@name` or raw. Used to make the slug read as
   *  the runner's artifact, not a UUID. Loose to a fault: anything
   *  empty falls back to `run` in the slug. */
  handle: string;
  /** Run's WPM. Rounded into the slug for the at-a-glance read
   *  ("Saif's 92 wpm run"). */
  wpm: number;
  variant?: Variant;
  className?: string;
}) {
  const [result, setResult] = useState<ShareResult | null>(null);
  const [busy, setBusy] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const slug = buildShareSlug({ handle, wpm, testId });
      const imageUrl = `${window.location.origin}/r/${slug}/opengraph-image`;
      const blob = await fetch(imageUrl).then((r) => {
        if (!r.ok) throw new Error(`OG fetch failed: ${r.status}`);
        return r.blob();
      });
      const file = new File([blob], `flinttype-${slug}.png`, {
        type: "image/png",
      });

      // 1) OS share sheet with file payload. canShare gates because
      //    `navigator.share` exists on desktop Chrome but rejects
      //    files there — and the rejection promise leaks an unhandled
      //    error if we don't check first.
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });
      if (canShareFiles && navigator.share) {
        try {
          await navigator.share({ files: [file], title: "flinttype run" });
          flashResult("shared");
          return;
        } catch (err) {
          // User dismissed the share sheet — that's a graceful exit,
          // not an error. Anything else, fall through to clipboard.
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      // 2) Clipboard image — works on desktop Chromium / Edge / Safari
      //    (Tech Preview). Pastes as an inline image into any target
      //    that accepts an image clipboard payload (Slack, Discord,
      //    Twitter composer, iMessage, …).
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof window.ClipboardItem === "function"
      ) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          flashResult("copied");
          return;
        } catch {
          // Fall through to download.
        }
      }

      // 3) Download — final fallback. Same artifact, just hands it to
      //    the user instead of staging it in the clipboard.
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      flashResult("saved");
    } catch (err) {
      console.error("[share-run-button] failed", err);
    } finally {
      setBusy(false);
    }

    function flashResult(r: ShareResult) {
      setResult(r);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setResult(null), 1_800);
    }
  }, [busy, handle, testId, wpm]);

  const labelMap: Record<ShareResult, string> = {
    shared: "shared",
    copied: "copied",
    saved: "saved",
  };
  const tooltipMap: Record<ShareResult, string> = {
    shared: "Shared",
    copied: "Image copied — paste anywhere",
    saved: "Image saved",
  };

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        aria-label="Share this run as an image"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60",
          className,
        )}
      >
        {busy ? (
          <Loader2 size={13} className="shrink-0 animate-spin" aria-hidden />
        ) : result ? (
          <Check size={13} className="shrink-0 text-primary" aria-hidden />
        ) : (
          <Share2 size={13} className="shrink-0" aria-hidden />
        )}
        {result ? labelMap[result] : "share image"}
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            void onShare();
          }}
          disabled={busy}
          aria-label="Share this run as an image"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-none disabled:opacity-60",
            result && "text-primary hover:text-primary",
            className,
          )}
        >
          {busy ? (
            <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden />
          ) : result ? (
            <Check size={14} className="shrink-0" aria-hidden />
          ) : (
            <Share2 size={14} className="shrink-0" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {result ? tooltipMap[result] : "Share image"}
      </TooltipContent>
    </Tooltip>
  );
}
