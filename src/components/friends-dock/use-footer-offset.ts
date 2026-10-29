"use client";

import { useEffect, useState } from "react";

/** How far (px) the page footer reaches into the viewport from the
 *  bottom edge, so the dock can float just above it instead of sitting
 *  on its links. Two placements (see <AppChrome>):
 *
 *  - pinned under compact surfaces: always on screen, so the offset is
 *    its full height;
 *  - in flow at the end of a scrolling page: off screen until the user
 *    scrolls near the bottom (or the page is short), then it slides in.
 *    The offset is how much of it is currently visible, so the pill
 *    rides up with the footer as it scrolls into view.
 *
 *  Returns 0 when the footer isn't there or isn't shown (the §15
 *  "hidden" footer style, the compact footer that drops at <md, a
 *  footer-less route), so the dock falls back to its corner gap.
 *
 *  Re-measures on any scroll (captured at the document, so the page's
 *  own scroller counts), on resize, when the content above the footer
 *  changes size (data loading in moves the footer), on route change
 *  and when the footer-style attribute toggles on <html>. */
export function useFooterOffset(routeKey: string): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let raf = 0;
    let observed: HTMLElement | null = null;
    const ro = new ResizeObserver(() => schedule());

    const read = (): number => {
      const el =
        document.querySelector<HTMLElement>("footer[data-ft-footer][data-pinned]") ??
        document.querySelector<HTMLElement>("footer[data-ft-footer]");
      // (Re)bind the size observer whenever the footer element changes —
      // it remounts per page.
      if (el !== observed) {
        ro.disconnect();
        observed = el;
        if (el) {
          ro.observe(el);
          if (el.previousElementSibling instanceof HTMLElement) {
            ro.observe(el.previousElementSibling);
          }
        }
      }
      if (!el || getComputedStyle(el).display === "none") return 0;
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) return 0;
      if (el.hasAttribute("data-pinned")) return rect.height;
      return Math.max(0, Math.min(rect.height, window.innerHeight - rect.top));
    };
    const measure = () => {
      raf = 0;
      setOffset(Math.round(read()));
    };
    function schedule() {
      if (!raf) raf = requestAnimationFrame(measure);
    }

    schedule();
    // Late content (streamed sections, async data) can move the footer
    // after the first frame — one more pass once things settle.
    const late = window.setTimeout(schedule, 400);
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ft-footer-style"],
    });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(late);
      ro.disconnect();
      mo.disconnect();
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [routeKey]);
  return offset;
}
