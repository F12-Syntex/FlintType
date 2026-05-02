"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MAX_DIM = 1920;
const JPEG_QUALITY = 0.82;

/** Read a File into an HTMLImageElement off a temporary object URL.
 *  Object URLs need to be revoked to avoid leaking the original blob. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

/** Downscale to fit within MAX_DIM on the longest edge and re-encode as
 *  JPEG. Phone photos are routinely 5–15 MB which busts localStorage's
 *  ~5 MB quota; capping the longest edge at 1920 px brings them under
 *  ~600 KB for the kind of shots people put behind a typing screen. */
async function shrinkToDataUrl(file: File): Promise<string> {
  const img = await loadImage(file);
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_DIM ? MAX_DIM / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function BackgroundRow({
  bgImage,
  onSetImage,
  onClearImage,
}: {
  bgImage: string | undefined;
  onSetImage: (cssValue: string) => void;
  onClearImage: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await shrinkToDataUrl(file);
      // Wrap as a CSS url(...) so body's `background-image: var(...)`
      // resolves to a real image — without the wrapper it's invalid CSS
      // and the bg silently doesn't apply (the bug from before).
      onSetImage(`url("${dataUrl}")`);
    } catch (e) {
      // The most common failure here is localStorage quota, surfaced
      // through onSetImage. Catch QuotaExceededError specifically so
      // we can tell the user, but treat any throw as a load failure.
      setError(
        e instanceof DOMException && e.name === "QuotaExceededError"
          ? "Image is still too large after resizing — try a smaller crop."
          : "Could not load that image. Try a different file.",
      );
    } finally {
      setBusy(false);
    }
  }

  // The CSS value stored in --ft-bg-image is something like
  // `url("data:image/jpeg;base64,…")`. Pull just the URL out for the
  // preview <img> so we can render it cheaply.
  const previewSrc = bgImage?.match(/url\("(.+)"\)/)?.[1] ?? null;

  return (
    <Card className="rounded-md shadow-sm ring-border min-h-16">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Background image
        </CardTitle>
        <CardDescription>
          Add a photo behind every page. Auto-resized to fit (max
          1920&nbsp;px, JPEG&nbsp;82%).
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {previewSrc ? (
          <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
              className="h-full w-full object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClearImage}
              className="absolute top-2 right-2 gap-1"
            >
              <X size={14} />
              Remove
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={20} />
            <span>{busy ? "Uploading…" : "Choose an image"}</span>
            <span className="text-xs text-muted-foreground/80">
              PNG · JPG · WebP
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset so picking the same file twice still fires onChange.
            e.target.value = "";
          }}
        />

        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    </Card>
  );
}
