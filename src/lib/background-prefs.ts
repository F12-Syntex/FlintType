"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

// ─── enums ────────────────────────────────────────────────────────────

/** Background sizing strategy.
 *   - cover:   fill the area, crop overflow (default — looks good for
 *              most photos)
 *   - contain: fit inside without cropping
 *   - auto:    use the image's natural size (no scaling)
 *   - tile:    repeat at natural size                                  */
export type BgFit = "cover" | "contain" | "auto" | "tile";

/** Where the image renders.
 *   - page:    full viewport (current behaviour)
 *   - content: only inside the main content area, not under the topbar
 *              or sidebars                                              */
export type BgScope = "page" | "content";

// ─── DB slice ─────────────────────────────────────────────────────────

export type BackgroundPrefs = {
  /** Remote image URL the user pasted. Cross-device. */
  imageUrl: string;
  fit: BgFit;
  scope: BgScope;
  /** 0..1 — visible opacity of the image. */
  opacity: number;
  /** Blur radius in px (0..30). */
  blur: number;
  /** 0..1 — overlay darken strength (black scrim on top of the image). */
  darken: number;
};

export const DEFAULT_BACKGROUND: BackgroundPrefs = {
  imageUrl: "",
  fit: "cover",
  scope: "page",
  opacity: 1,
  blur: 0,
  darken: 0,
};

// ─── Local-only image (browser storage, never sent to the server) ────

const LOCAL_IMAGE_KEY = "ft-bg-local-image";
const LOCAL_IMAGE_EVENT = "ft-bg-local-image-changed";

function readLocalImage(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LOCAL_IMAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeLocalImage(dataUrl: string) {
  if (typeof window === "undefined") return;
  try {
    if (!dataUrl) {
      window.localStorage.removeItem(LOCAL_IMAGE_KEY);
    } else {
      window.localStorage.setItem(LOCAL_IMAGE_KEY, dataUrl);
    }
  } catch {
    /* quota — image too large, swallow; the user gets a session-only
       background which still works while the page stays open */
  }
  window.dispatchEvent(new CustomEvent(LOCAL_IMAGE_EVENT));
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useBackgroundPrefs() {
  const { value: prefs, update: updateRaw, reset } = useRemotePrefs(
    "background",
    DEFAULT_BACKGROUND,
  );
  const [localImage, setLocalImageState] = useState("");

  useEffect(() => {
    setLocalImageState(readLocalImage());
    const reread = () => setLocalImageState(readLocalImage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_IMAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_IMAGE_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_IMAGE_EVENT, reread);
    };
  }, []);

  // Local upload wins on this device; the remote URL is the
  // cross-device fallback.
  const effectiveImage = useMemo(
    () => localImage || prefs.imageUrl || "",
    [localImage, prefs.imageUrl],
  );

  const update = useCallback(
    <K extends keyof BackgroundPrefs>(key: K, value: BackgroundPrefs[K]) => {
      updateRaw({ [key]: value } as Partial<BackgroundPrefs>);
    },
    [updateRaw],
  );

  const setLocalImage = useCallback((dataUrl: string) => {
    writeLocalImage(dataUrl);
    setLocalImageState(dataUrl);
  }, []);

  const clearLocalImage = useCallback(() => {
    writeLocalImage("");
    setLocalImageState("");
  }, []);

  const isCustomised = useMemo(
    () =>
      effectiveImage !== "" ||
      prefs.fit !== DEFAULT_BACKGROUND.fit ||
      prefs.scope !== DEFAULT_BACKGROUND.scope ||
      prefs.opacity !== DEFAULT_BACKGROUND.opacity ||
      prefs.blur !== DEFAULT_BACKGROUND.blur ||
      prefs.darken !== DEFAULT_BACKGROUND.darken,
    [prefs, effectiveImage],
  );

  return {
    prefs,
    /** The image URL actually rendered — local upload first, else URL. */
    effectiveImage,
    /** True when a local browser-only upload is active. */
    hasLocalImage: localImage !== "",
    update,
    setLocalImage,
    clearLocalImage,
    reset,
    isCustomised,
  } as const;
}
