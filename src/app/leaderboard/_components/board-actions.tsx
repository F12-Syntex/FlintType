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

export type SaveImageState = {
  save: () => void;
  exporting: boolean;
  failed: boolean;
};

/** Captures the page's screenshot root (header, filters and board) as a
 *  PNG. Elements marked `data-no-export` are left out. The state lives
 *  in a hook so the board can show a visible failure line, not only a
 *  tooltip touch users never see. */
export function useSaveBoardImage(): SaveImageState {
  const [exporting, setExporting] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setFailed(false);
    try {
      const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
        await import("@/lib/screenshot");
      const node = findScreenshotRoot();
      if (!node) throw new Error("no screenshot root");
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

  return { save: () => void save(), exporting, failed };
}

export function BoardActions({
  onRefresh,
  refreshing,
  generatedAt,
  image,
  className,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  generatedAt: number | null;
  image: SaveImageState;
  className?: string;
}) {
  const age = generatedAt ? `Updated ${relativeTime(generatedAt)}` : "Refresh";
  const saveLabel = image.exporting
    ? "Saving image…"
    : image.failed
      ? "Couldn't save the image. Try again."
      : "Save as image";
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={image.save}
            disabled={image.exporting}
            aria-label={saveLabel}
            className={cn(ICON_BTN, image.failed && "text-destructive")}
          >
            {image.exporting ? (
              <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
            ) : (
              <Download aria-hidden />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{saveLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** One-line failure notice under the toolbar (ui-law §6.3), with a
 *  retry. Left out of the saved image. */
export function BoardNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <p
      role="status"
      data-no-export="true"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-destructive"
    >
      <span>{message}</span>
      <Button
        type="button"
        variant="link"
        onClick={onRetry}
        className="h-auto p-0 text-sm font-medium text-foreground underline underline-offset-4"
      >
        Try again
      </Button>
    </p>
  );
}
