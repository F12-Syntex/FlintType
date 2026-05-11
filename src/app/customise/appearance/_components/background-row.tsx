"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type BgFit,
  type BgScope,
  useBackgroundPrefs,
} from "@/lib/background-prefs";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const MAX_DIM = 1920;
const JPEG_QUALITY = 0.82;

const FIT_OPTIONS: readonly { id: BgFit; label: string }[] = [
  { id: "cover", label: "Cover" },
  { id: "contain", label: "Contain" },
  { id: "auto", label: "Auto" },
  { id: "tile", label: "Tile" },
];

const SCOPE_OPTIONS: readonly { id: BgScope; label: string }[] = [
  { id: "page", label: "Page" },
  { id: "content", label: "Content only" },
];

/** Read a File into an HTMLImageElement off a temporary object URL. */
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
 *  JPEG. Phone photos are routinely 5-15 MB which busts localStorage's
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

export function BackgroundRow() {
  const {
    prefs,
    effectiveImage,
    hasLocalImage,
    update,
    setLocalImage,
    clearLocalImage,
  } = useBackgroundPrefs();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await shrinkToDataUrl(file);
      setLocalImage(dataUrl);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "QuotaExceededError"
          ? "Image is still too large after resizing — try a smaller crop."
          : "Could not load that image. Try a different file.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Live preview — shows whatever's currently effective. */}
      {effectiveImage ? (
        <div className="relative h-40 overflow-hidden rounded-md border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={effectiveImage}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
          No background image
        </div>
      )}

      {/* Image URL — synced across devices. */}
      <SettingsRow
        label={
          <LabelWithDesc
            title="Image URL"
            desc="Paste a remote image link. Synced across devices."
          />
        }
        control={
          <div className="flex w-full items-center gap-2 sm:w-72">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={prefs.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              className="h-8 text-xs"
            />
            {prefs.imageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => update("imageUrl", "")}
                aria-label="Clear image URL"
              >
                <X size={14} />
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Local upload — browser-only, never leaves the device. */}
      <SettingsRow
        label={
          <LabelWithDesc
            title="Or upload"
            desc="Stored on this device only. Overrides the URL while set."
          />
        }
        control={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="gap-2"
            >
              <Upload size={14} />
              {busy ? "Uploading…" : hasLocalImage ? "Replace" : "Choose"}
            </Button>
            {hasLocalImage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearLocalImage}
              >
                Remove
              </Button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        }
      />

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      <SettingsRow
        label={
          <LabelWithDesc
            title="Fit"
            desc="How the image scales to the area."
          />
        }
        control={
          <SelectChips
            value={prefs.fit}
            options={FIT_OPTIONS}
            onChange={(v) => update("fit", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Scope"
            desc="Page covers the full viewport; Content only paints inside the main area."
          />
        }
        control={
          <SelectChips
            value={prefs.scope}
            options={SCOPE_OPTIONS}
            onChange={(v) => update("scope", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Opacity"
            desc="Fade the image so foreground text stays readable."
          />
        }
        control={
          <SliderRow
            value={prefs.opacity}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => update("opacity", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Blur"
            desc="Soften the image so it doesn't fight the typing surface."
          />
        }
        control={
          <SliderRow
            value={prefs.blur}
            min={0}
            max={30}
            step={1}
            format={(v) => `${v}px`}
            onChange={(v) => update("blur", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Darken"
            desc="Black overlay strength on top of the image."
          />
        }
        control={
          <SliderRow
            value={prefs.darken}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => update("darken", v)}
          />
        }
      />
    </div>
  );
}
