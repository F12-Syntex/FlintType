"use client";

import { Download, Play, RotateCcw } from "lucide-react";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
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
  /** The result body; the save-image export captures it, cropped to
   *  its content and branded (see result-export.ts). */
  captureRef: RefObject<HTMLDivElement | null>;
  /** Present only when the run was saved and has a shareable link. */
  share: { testId: string; handle: string; wpm: number } | null;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // On the result screen focus stays on the hidden typing input so Tab
  // starts the next test. Shift+Tab from there would land in the top bar,
  // leaving Replay / Save image / Share reachable only by tabbing forward
  // through the whole settings capsule. Send it to the last result action
  // instead, so the actions are one keystroke away in both directions.
  useEffect(() => {
    function onShiftTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !e.shiftKey) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const focused = document.activeElement;
      const inTest =
        !focused ||
        focused === document.body ||
        focused === document.documentElement ||
        focused.getAttribute("aria-label") === "Typing input";
      if (!inTest) return;
      const buttons = rowRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href]",
      );
      const last = buttons?.[buttons.length - 1];
      if (!last) return;
      e.preventDefault();
      last.focus();
    }
    window.addEventListener("keydown", onShiftTab, true);
    return () => window.removeEventListener("keydown", onShiftTab, true);
  }, []);

  const onDownload = useCallback(async () => {
    const node = captureRef.current;
    if (!node || exporting) return;
    setExporting(true);
    setExportFailed(false);
    try {
      const { exportResultImage } = await import("./result-export");
      await exportResultImage(node);
    } catch (err) {
      console.error("[result-actions] screenshot failed", err);
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }, [captureRef, exporting]);

  return (
    <div
      ref={rowRef}
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
