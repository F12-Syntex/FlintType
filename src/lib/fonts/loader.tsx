"use client";

import { useEffect } from "react";
import { useThemeOverrides } from "../theme-customization";
import { findFontByStack, type FontEntry } from "./catalog";

const PRECONNECT_GOOGLEAPIS_ID = "ft-google-fonts-preconnect-googleapis";
const PRECONNECT_GSTATIC_ID = "ft-google-fonts-preconnect-gstatic";

/** Append the two Google Fonts preconnect <link>s once. They shave the
 *  TLS handshake off the first font load — DNS + TLS to googleapis.com
 *  for the CSS, and to gstatic.com for the woff2 the CSS resolves to. */
function ensurePreconnects() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(PRECONNECT_GOOGLEAPIS_ID)) {
    const a = document.createElement("link");
    a.id = PRECONNECT_GOOGLEAPIS_ID;
    a.rel = "preconnect";
    a.href = "https://fonts.googleapis.com";
    document.head.appendChild(a);
  }
  if (!document.getElementById(PRECONNECT_GSTATIC_ID)) {
    const b = document.createElement("link");
    b.id = PRECONNECT_GSTATIC_ID;
    b.rel = "preconnect";
    b.href = "https://fonts.gstatic.com";
    b.crossOrigin = "anonymous";
    document.head.appendChild(b);
  }
}

/** Inject a <link rel="stylesheet"> for one Google Font. Idempotent —
 *  re-calling for the same entry is a no-op. The browser fetches the
 *  woff2 referenced inside the CSS only when a span actually paints in
 *  this family, so a thirty-font catalog doesn't waste thirty fetches. */
export function loadGoogleFont(entry: FontEntry): void {
  if (typeof document === "undefined") return;
  ensurePreconnects();
  if (document.getElementById(entry.id)) return;
  const link = document.createElement("link");
  link.id = entry.id;
  link.rel = "stylesheet";
  link.href = entry.cssHref;
  document.head.appendChild(link);
}

/** Mounted once at app root. Re-injects the active Google font on
 *  startup so the chosen face survives reloads — the user's stored
 *  override is just a CSS string, the <link> that resolves it to woff2
 *  has to be added back to <head> explicitly. */
export function GoogleFontsApplier() {
  const { overrides } = useThemeOverrides();
  const stack = overrides["--ft-font-family"];
  useEffect(() => {
    const entry = findFontByStack(stack);
    if (entry) loadGoogleFont(entry);
  }, [stack]);
  return null;
}
