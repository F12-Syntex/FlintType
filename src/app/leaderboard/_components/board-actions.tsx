"use client";

import { Download, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

/** Icon-only Refresh + Save image pills at the right of the toolbar.
 *  44px on phones (touch floor), 40px from md to match the switches.
 *  Marked `data-no-export` so the saved PNG never shows them. */
const ICON_BTN = "size-11 md:size-10 text-muted-foreground hover:text-foreground";

export function BoardActions({
  onRefresh,
  refreshing,
  generatedAt,
  className,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  generatedAt: number | null;
  className?: string;
}) {
  const age = generatedAt ? `Updated ${relativeTime(generatedAt)}` : "Refresh";
  return (
    <div
      data-no-export="true"
      className={cn("flex shrink-0 items-center gap-2", className)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing leaderboard" : `Refresh leaderboard. ${age}`}
            className={ICON_BTN}
          >
            <RefreshCw
              aria-hidden
              className={cn(refreshing && "motion-safe:animate-spin")}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{refreshing ? "Refreshing…" : age}</TooltipContent>
      </Tooltip>
      <SaveImageButton />
    </div>
  );
}

/** Captures the page's screenshot root (header, filters and board) as a
 *  PNG. Elements marked `data-no-export` are left out. */
function SaveImageButton() {
  const [exporting, setExporting] = useState(false);
  const [failed, setFailed] = useState(false);

  const onDownload = useCallback(async () => {
    if (exporting) return;
    const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
      await import("@/lib/screenshot");
    const node = findScreenshotRoot();
    if (!node) return;
    setExporting(true);
    setFailed(false);
    try {
      const { toPng } = await import("html-to-image");
      const { width, height } = naturalScreenshotSize(node);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: pickScreenshotBg(node),
        width,
        height,
        filter: (n) =>
          !(n instanceof HTMLElement && n.dataset.noExport === "true"),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-leaderboard-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[leaderboard] screenshot failed", err);
      setFailed(true);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const label = exporting
    ? "Saving image…"
    : failed
      ? "Couldn't save the image. Try again."
      : "Save as image";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDownload}
          disabled={exporting}
          aria-label={label}
          className={cn(ICON_BTN, failed && "text-destructive")}
        >
          {exporting ? (
            <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
          ) : (
            <Download aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
