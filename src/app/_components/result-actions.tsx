"use client";

import { Download, Play, RotateCcw } from "lucide-react";
import { type RefObject, useCallback, useState } from "react";
import { Kbd } from "@/components/ft";
import { ShareRunButton } from "@/components/share-run-button";
import { Button } from "@/components/ui/button";

/** The result screen's action row: one filled "Next test" (the page's
 *  primary action, with the Tab shortcut shown beside it), then quiet
 *  ghost actions for replay, saving an image and sharing. Excluded from
 *  the exported screenshot via data-no-export. */
export function ResultActions({
  onNext,
  onReplay,
  canReplay,
  captureRef,
  share,
}: {
  onNext: () => void;
  onReplay: () => void;
  canReplay: boolean;
  /** The result body; the save-image export walks up from it to the
   *  page's screenshot root. */
  captureRef: RefObject<HTMLDivElement | null>;
  /** Present only when the run was saved and has a shareable link. */
  share: { testId: string; handle: string; wpm: number } | null;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  const onDownload = useCallback(async () => {
    // Capture the page-level content area (data-screenshot-root on
    // AppChrome's scroller): everything between the top bar and footer.
    // Falls back to the result body for preview / embedded uses.
    const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
      await import("@/lib/screenshot");
    const node = findScreenshotRoot(captureRef.current);
    if (!node || exporting) return;
    setExporting(true);
    setExportFailed(false);
    try {
      const { toPng } = await import("html-to-image");
      const bg = pickScreenshotBg(node);
      const { width, height } = naturalScreenshotSize(node);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: bg,
        width,
        height,
        filter: (n) => !(n instanceof HTMLElement && n.dataset.noExport === "true"),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-result-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[result-actions] screenshot failed", err);
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }, [captureRef, exporting]);

  return (
    <div
      data-no-export="true"
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
    >
      <Button size="lg" onClick={onNext} className="w-full sm:w-auto">
        <RotateCcw aria-hidden />
        Next test
        <Kbd className="ml-1 hidden border-white/30 bg-white/15 text-primary-foreground sm:inline-flex">
          tab
        </Kbd>
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {canReplay ? (
          <Button variant="ghost" onClick={onReplay}>
            <Play aria-hidden />
            Replay
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onClick={onDownload}
          disabled={exporting}
          aria-label="Save results as an image"
          className={exportFailed ? "text-destructive hover:text-destructive" : undefined}
        >
          <Download aria-hidden />
          {exporting ? "Saving…" : exportFailed ? "Couldn't save" : "Save image"}
        </Button>
        {share ? (
          <ShareRunButton
            testId={share.testId}
            handle={share.handle}
            wpm={share.wpm}
            variant="labelled"
          />
        ) : null}
      </div>
    </div>
  );
}
