"use client";

import { AlertCircle, Check, Loader2, Share2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildShareSlug } from "@/lib/share-slug";
import { cn } from "@/lib/utils";

type Variant = "icon" | "labelled";

/** Terminal states the share action can land in. `shared` fires when
 *  the OS share sheet swallowed the file (mobile primary path);
 *  `copied` fires when an image landed on the clipboard; `saved`
 *  fires when the file downloaded; `failed` flashes when every
 *  transport gave up. The tooltip + icon track state so the user
 *  always knows what just happened. */
type ShareResult = "shared" | "copied" | "saved" | "failed";

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
    const flashResult = (r: ShareResult) => {
      setResult(r);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(
        () => setResult(null),
        r === "failed" ? 3_000 : 2_000,
      );
    };
    try {
      const slug = buildShareSlug({ handle, wpm, testId });
      const imageUrl = `${window.location.origin}/share/${slug}/opengraph-image`;
      // Cache-bust on each click so a stale 24h OG cache (the render
      // can take seconds on cold) doesn't leak between runs while
      // the user is iterating during dev.
      const res = await fetch(imageUrl, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`OG fetch failed: ${res.status}`);
      }
      const blob = await res.blob();
      const file = new File([blob], `flinttype-${slug}.png`, {
        type: "image/png",
      });

      // 1) Mobile / supporting desktop: OS share sheet with the file
      //    attached. The user picks Messages / Twitter / Discord / …
      //    and the PNG lands inline.
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
          // User dismissed the share sheet — that's a graceful exit
          // (no further fallback needed). Anything else, fall through.
          if (err instanceof Error && err.name === "AbortError") {
            setResult(null);
            return;
          }
        }
      }

      // 2) Desktop preferred: clipboard image. Pastes inline into any
      //    composer that accepts an image (Slack, Discord, iMessage,
      //    Twitter web). Browser support is uneven — wrapped so a
      //    silent rejection falls through to the download path
      //    instead of leaving the user without any artifact.
      let clipboardOk = false;
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof window.ClipboardItem === "function"
      ) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          clipboardOk = true;
        } catch {
          // Falls through to download.
        }
      }
      if (clipboardOk) {
        flashResult("copied");
        return;
      }

      // 3) Reliable last resort: download the PNG. The user gets a
      //    real file they can attach anywhere. Never silent — the
      //    OS download bar is its own confirmation.
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
      flashResult("failed");
    } finally {
      setBusy(false);
    }
  }, [busy, handle, testId, wpm]);

  const labelMap: Record<ShareResult, string> = {
    shared: "shared",
    copied: "copied",
    saved: "saved",
    failed: "failed",
  };
  const tooltipMap: Record<ShareResult, string> = {
    shared: "Shared",
    copied: "Image copied — paste anywhere",
    saved: "Image saved to downloads",
    failed: "Couldn't share — try again",
  };

  const StatusIcon = ({ size }: { size: number }) => {
    if (busy) return <Loader2 size={size} className="shrink-0 animate-spin" aria-hidden />;
    if (result === "failed")
      return <AlertCircle size={size} className="shrink-0 text-destructive" aria-hidden />;
    if (result)
      return <Check size={size} className="shrink-0 text-primary" aria-hidden />;
    return <Share2 size={size} className="shrink-0" aria-hidden />;
  };

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        aria-label="Share this run as an image"
        aria-live="polite"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60",
          result === "failed" && "text-destructive hover:text-destructive",
          className,
        )}
      >
        <StatusIcon size={13} />
        {busy ? "preparing" : result ? labelMap[result] : "share image"}
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
          aria-live="polite"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-none disabled:opacity-60",
            result === "failed" && "text-destructive hover:text-destructive",
            result && result !== "failed" && "text-primary hover:text-primary",
            className,
          )}
        >
          <StatusIcon size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {result ? tooltipMap[result] : "Share image"}
      </TooltipContent>
    </Tooltip>
  );
}
