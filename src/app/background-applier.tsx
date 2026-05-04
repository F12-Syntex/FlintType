"use client";

import { useEffect } from "react";
import { useBackgroundPrefs } from "@/lib/background-prefs";

/** Mounts under the providers tree (one instance, top-level) and
 *  pushes the user's background prefs onto :root as CSS variables.
 *  Toggles `html.ft-bg-content` for content-scope rendering. */
export function BackgroundApplier() {
  const { prefs, effectiveImage } = useBackgroundPrefs();

  useEffect(() => {
    const root = document.documentElement;
    const set = (name: string, value: string | null) => {
      if (value == null) root.style.removeProperty(name);
      else root.style.setProperty(name, value);
    };

    // Image
    set(
      "--ft-bg-image",
      effectiveImage ? `url("${effectiveImage}")` : null,
    );

    // Sizing — `tile` is the only one that needs `repeat`, the rest stay
    // at no-repeat with different background-size values.
    if (prefs.fit === "tile") {
      set("--ft-bg-size", "auto");
      set("--ft-bg-repeat", "repeat");
    } else if (prefs.fit === "contain") {
      set("--ft-bg-size", "contain");
      set("--ft-bg-repeat", "no-repeat");
    } else if (prefs.fit === "auto") {
      set("--ft-bg-size", "auto");
      set("--ft-bg-repeat", "no-repeat");
    } else {
      set("--ft-bg-size", "cover");
      set("--ft-bg-repeat", "no-repeat");
    }

    set("--ft-bg-opacity", String(prefs.opacity));
    set("--ft-bg-blur", `${prefs.blur}px`);
    // Darken only paints over an image — without one, the scrim would
    // just dim the bare app for no reason.
    set("--ft-bg-darken", effectiveImage ? String(prefs.darken) : "0");

    if (prefs.scope === "content") {
      root.classList.add("ft-bg-content");
    } else {
      root.classList.remove("ft-bg-content");
    }
  }, [prefs, effectiveImage]);

  return null;
}
