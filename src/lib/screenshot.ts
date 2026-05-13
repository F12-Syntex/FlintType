/** Helpers for result-page screenshot exports.
 *
 *  The convention is `[data-screenshot-root]` on the page-level
 *  content wrapper (set by `AppChrome` on the scrolling main div).
 *  Per-page download buttons resolve that element and hand it to
 *  html-to-image — that way the PNG includes the whole content
 *  area (passage + stats + chart + ledger) instead of just the
 *  result panel, which the user reported reading as "too zoomed in"
 *  even after the pixelRatio fix.
 *
 *  Pure browser-DOM helpers; no React, no html-to-image import. The
 *  call sites lazy-load html-to-image themselves and pipe `width` /
 *  `height` / `backgroundColor` from the helpers below. */

/** Walk up the DOM from `node`, returning the first opaque
 *  `background-color`. Fallbacks to white when the entire tree is
 *  transparent (e.g. inside a portal). */
export function pickScreenshotBg(node: HTMLElement): string {
  let el: HTMLElement | null = node;
  while (el) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
    el = el.parentElement;
  }
  return "#ffffff";
}

/** Find the page-level screenshot target by data attribute, falling
 *  back to the supplied node when no marker is present (e.g. an
 *  embedded preview outside the app shell). Returns null only when
 *  neither is available. */
export function findScreenshotRoot(
  fallback?: HTMLElement | null,
): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const found = document.querySelector<HTMLElement>("[data-screenshot-root]");
  return found ?? fallback ?? null;
}

/** Natural size of the screenshot target — uses scrollWidth/Height
 *  so a scrolling content area still renders every off-screen
 *  section into the PNG rather than only the visible viewport. */
export function naturalScreenshotSize(node: HTMLElement): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(node.clientWidth, node.scrollWidth),
    height: Math.max(node.clientHeight, node.scrollHeight),
  };
}
