"use client";

import { useEffect, useMemo } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { htmlAttrsFor } from "@/lib/bootstrap";

/** Mirrors the appearance prefs that drive *global* visual rules onto
 *  `<html data-ft-…>` attributes: the Surface + Chrome knobs (§15) and
 *  the Style knobs (§21: control shape, depth, glow, page aura,
 *  interface font and size). globals.css reads each one and rewires
 *  the cascade.
 *
 *  The pref → attribute table (`HTML_ATTR_RULES`) is shared with the
 *  pre-paint bootstrap script, so a refresh paints the same attributes
 *  before hydration that this writes after it.
 *
 *  Sits inside <Providers> next to BordersApplier. Re-runs only when a
 *  mirrored value changes, so non-visual pref edits (e.g. typing speed
 *  unit) don't touch the DOM.
 *
 *  Per-component knobs that don't need a global rule (statStripSurface,
 *  caretIdle, quoteAttribution) read appearance prefs directly from
 *  inside the component — they're not mirrored here. Same for
 *  `autoHide`'s runtime companion `data-ft-running`, which is driven
 *  from PracticeContext via <AutoHideApplier>. */
export function AppearanceApplier() {
  const { prefs, loaded } = useAppearancePrefs();
  const attrs = useMemo(
    () => htmlAttrsFor(prefs as unknown as Record<string, unknown>),
    [prefs],
  );
  // A stable string key so the effect only re-runs when an attribute
  // actually changes, not on every prefs object identity change.
  const key = JSON.stringify(attrs);

  useEffect(() => {
    // Until the stored prefs load, `prefs` are the bare defaults. The
    // pre-paint bootstrap has already written the stored attributes
    // (defaults included), so writing now would repaint the default App
    // size, shape and font for a frame or more on every load.
    if (!loaded) return;
    const root = document.documentElement;
    const next = JSON.parse(key) as Record<string, string | null>;
    for (const [attr, value] of Object.entries(next)) {
      if (value === null) root.removeAttribute(attr);
      else root.setAttribute(attr, value);
    }
  }, [key, loaded]);

  return null;
}
