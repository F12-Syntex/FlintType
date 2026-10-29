"use client";

import { useEffect } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";

/** Mounts under the providers tree and reflects the user's borders
 *  preference onto `<html data-ft-borders="…">`. Globals.css picks
 *  this up and either softens or hides every hairline in the app
 *  (`soft` → 10% foreground tint, `hidden` → transparent). */
export function BordersApplier() {
  const { prefs, loaded } = useAppearancePrefs();

  useEffect(() => {
    // Until the stored prefs load, `prefs` are the bare defaults. The
    // pre-paint bootstrap (src/lib/bootstrap.ts) has already written
    // the stored value, so writing now would flash the default
    // Outlines (e.g. hidden → soft → hidden) on every load.
    if (!loaded) return;
    const root = document.documentElement;
    if (prefs.borders === "default") {
      root.removeAttribute("data-ft-borders");
    } else {
      root.setAttribute("data-ft-borders", prefs.borders);
    }
  }, [prefs.borders, loaded]);

  return null;
}
