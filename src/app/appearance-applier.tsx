"use client";

import { useEffect } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";

/** Mirrors the appearance prefs that drive *global* visual rules
 *  (collapsing card surfaces, hiding dividers, scaling page padding,
 *  swapping bg fill, monochrome chrome, chrome layer style,
 *  auto-hide and result chrome) onto `<html data-ft-…>` attributes.
 *  globals.css reads each one and rewires the CSS cascade.
 *
 *  Sits inside <Providers> next to BordersApplier. Re-runs only when
 *  the specific pref it watches changes, so non-visual pref edits
 *  (e.g. typing speed unit) don't thrash the DOM.
 *
 *  Per-component knobs that don't need a global rule (statStripSurface,
 *  caretIdle, quoteAttribution) read appearance prefs
 *  directly from inside the component — they're not mirrored here.
 *  Same for `autoHide`'s runtime companion `data-ft-running`, which is
 *  driven from PracticeContext via <AutoHideApplier>. */
export function AppearanceApplier() {
  const { prefs } = useAppearancePrefs();

  useEffect(() => {
    const root = document.documentElement;
    setOrRemove(root, "data-ft-cards", prefs.cardSurfaces, "solid");
    setOrRemove(root, "data-ft-dividers", prefs.dividers, "hairline");
    setOrRemove(root, "data-ft-padding", prefs.pagePadding, "comfortable");
    setOrRemove(root, "data-ft-bg-fill", prefs.backgroundFill, "paper");
    setOrRemove(root, "data-ft-topbar-style", prefs.topbarStyle, "elevated");
    setOrRemove(root, "data-ft-footer-style", prefs.footerStyle, "visible");
    setOrRemove(root, "data-ft-autohide", prefs.autoHide, "off");
    setOrRemove(root, "data-ft-result", prefs.resultChrome, "framed");
    if (prefs.monochromeChrome) {
      root.setAttribute("data-ft-monochrome", "on");
    } else {
      root.removeAttribute("data-ft-monochrome");
    }
  }, [
    prefs.cardSurfaces,
    prefs.dividers,
    prefs.pagePadding,
    prefs.backgroundFill,
    prefs.topbarStyle,
    prefs.footerStyle,
    prefs.autoHide,
    prefs.resultChrome,
    prefs.monochromeChrome,
  ]);

  return null;
}

/** Set the attribute only when the value diverges from the default —
 *  keeps the DOM clean when the user hasn't customised the row. */
function setOrRemove(
  el: HTMLElement,
  attr: string,
  value: string,
  defaultValue: string,
) {
  if (value === defaultValue) {
    el.removeAttribute(attr);
  } else {
    el.setAttribute(attr, value);
  }
}
