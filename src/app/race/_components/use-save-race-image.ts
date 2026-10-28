"use client";

import { useCallback, useState, type RefObject } from "react";

/** "Save image" for the race results card. Captures the whole content
 *  area (data-screenshot-root on AppChrome's main scroller) rather than
 *  just the card, so the PNG reads as a page snapshot (results, chart,
 *  passage) instead of an orphaned card; falls back to the card itself
 *  if it's ever mounted outside the app shell. Elements marked
 *  `data-no-export="true"` (the action buttons) are left out.
 *
 *  `save()` resolves false when the capture failed so the caller can
 *  show a visible error line (ui-law §6.3). */
export function useSaveRaceImage(panelRef: RefObject<HTMLElement | null>) {
  const [exporting, setExporting] = useState(false);
  const save = useCallback(async (): Promise<boolean> => {
    const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
      await import("@/lib/screenshot");
    const node = findScreenshotRoot(panelRef.current);
    if (!node || exporting) return true;
    setExporting(true);
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
      a.download = `flinttype-race-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (err) {
      console.error("[race-results] screenshot failed", err);
      return false;
    } finally {
      setExporting(false);
    }
  }, [exporting, panelRef]);
  return { exporting, save };
}
