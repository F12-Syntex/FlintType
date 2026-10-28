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
} from "../controls";
import { SettingsRow } from "../row";
import { BgFitSample, BgScopeSample } from "./chip-previews";

const MAX_DIM = 1920;
const JPEG_QUALITY = 0.82;

const FIT_OPTIONS: readonly {
  id: BgFit;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "cover", label: "Cover", preview: <BgFitSample fit="cover" /> },
  { id: "contain", label: "Contain", preview: <BgFitSample fit="contain" /> },
  { id: "auto", label: "Auto", preview: <BgFitSample fit="auto" /> },
  { id: "tile", label: "Tile", preview: <BgFitSample fit="tile" /> },
];

const SCOPE_OPTIONS: readonly {
  id: BgScope;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "page", label: "Page", preview: <BgScopeSample scope="page" /> },
  { id: "content", label: "Content", preview: <BgScopeSample scope="content" /> },
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

  const hasImage = effectiveImage !== "";

  return (
    <>
      {/* Image link — synced across devices. */}
      <SettingsRow
        label={
          <LabelWithDesc
            title="Image link"
            desc="Paste an image link; it follows you to other devices."
          />
        }
        control={
          <div className="flex w-full items-center gap-2 sm:w-72">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={prefs.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              aria-label="Background image link"
              className="h-11 text-base sm:h-9 sm:text-sm"
            />
            {prefs.imageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => update("imageUrl", "")}
                aria-label="Clear image link"
                className="size-11 shrink-0 sm:size-9"
              >
                <X size={14} aria-hidden />
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Local upload — browser-only, never leaves the device. */}
      <SettingsRow
        inline
        label={
          <LabelWithDesc
            title="Upload an image"
            desc="Kept on this device only, and used instead of the link."
          />
        }
        control={
          <div className="flex items-center gap-2">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectiveImage}
                alt=""
                className="hidden h-9 w-14 rounded-lg border border-border object-cover sm:block"
              />
            ) : null}
            {hasLocalImage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearLocalImage}
                className="h-11 sm:h-8"
              >
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="h-11 gap-2 sm:h-8"
            >
              <Upload size={14} aria-hidden />
              {busy ? "Uploading…" : hasLocalImage ? "Replace" : "Choose"}
            </Button>
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
        <p role="alert" className="px-4 py-3 text-sm text-destructive sm:px-5">
          {error}
        </p>
      ) : null}

      {/* The rest only does something once there is an image. */}
      {hasImage ? (
        <>
          <SettingsRow
            label={
              <LabelWithDesc title="Fit" desc="How the image fills the screen." />
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
                title="Cover"
                desc="The whole page, or only the area under the top bar."
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
                desc="Fade the image so text stays easy to read."
              />
            }
            control={
              <SliderRow
                value={prefs.opacity}
                min={0}
                max={1}
                step={0.05}
                ariaLabel="Background opacity"
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => update("opacity", v)}
              />
            }
          />

          <SettingsRow
            label={
              <LabelWithDesc
                title="Blur"
                desc="Soften the image behind the text."
              />
            }
            control={
              <SliderRow
                value={prefs.blur}
                min={0}
                max={30}
                step={1}
                ariaLabel="Background blur"
                format={(v) => `${v}px`}
                onChange={(v) => update("blur", v)}
              />
            }
          />

          <SettingsRow
            label={
              <LabelWithDesc
                title="Darken"
                desc="Dim the image for more contrast."
              />
            }
            control={
              <SliderRow
                value={prefs.darken}
                min={0}
                max={1}
                step={0.05}
                ariaLabel="Background darken"
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => update("darken", v)}
              />
            }
          />
        </>
      ) : null}
    </>
  );
}
