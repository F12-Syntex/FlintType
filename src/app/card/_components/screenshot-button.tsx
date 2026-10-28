"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

/** Sits in the toolbar above the card. Resolves `[data-screenshot-target=
 *  "og-card"]` and exports it via html-to-image at the card's natural
 *  1500×787 footprint × 2x device pixels — the result is a crisp
 *  PNG suitable for portfolio embeds, Twitter / Discord previews, or
 *  manual paste into a deck. Filename includes a sortable timestamp
 *  so successive grabs don't overwrite each other in Downloads. */
export function ScreenshotButton() {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const onClick = useCallback(async () => {
    if (saving) return;
    const node = document.querySelector<HTMLElement>(
      '[data-screenshot-target="og-card"]',
    );
    if (!node) return;
    setSaving(true);
    setFailed(false);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: "#0a0a09",
        width: 1500,
        height: 787,
        pixelRatio: 2,
      });
      const stamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-card-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[card] screenshot failed", err);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <Button
        type="button"
        onClick={onClick}
        disabled={saving}
        variant="outline"
        aria-label="Download card as PNG"
        className="w-full sm:w-auto"
      >
        {saving ? (
          <Loader2 aria-hidden className="motion-safe:animate-spin" />
        ) : (
          <Download aria-hidden />
        )}
        {saving ? "Saving…" : "Download PNG"}
      </Button>
      {failed ? (
        <p role="alert" className="text-xs text-destructive">
          Couldn&apos;t save the image. Try again.
        </p>
      ) : null}
    </div>
  );
}
