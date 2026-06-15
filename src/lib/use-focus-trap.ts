"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Focus management for a hand-rolled `role="dialog" aria-modal="true"`
 *  modal that doesn't sit on Radix's Dialog (which does this for free):
 *
 *    1. on open, move focus into the panel (first focusable, else the
 *       panel itself) and remember what was focused before;
 *    2. while open, keep Tab / Shift+Tab cycling inside the panel so a
 *       keyboard user can't walk the obscured page behind it;
 *    3. on close / unmount, restore focus to the opener.
 *
 *  Pair with `tabIndex={-1}` + a `ref` on the panel element. Without this
 *  the `aria-modal` announcement lies to screen-reader + keyboard users
 *  (FT-054 / ui-law §7). The hook no-ops while `active` is false or the
 *  panel isn't mounted yet, so it's safe to call before the modal's own
 *  mount/animation gate.
 *
 *  Assumes a single active trap at a time (the project never stacks two
 *  hand-rolled modals); if that changes, give it a trap stack so an inner
 *  modal suppresses the outer one. */
export function useFocusTrap(
  active: boolean,
  panelRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Visible, tabbable descendants in DOM order.
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus in after the panel has painted in its resting position.
    // Double-rAF mirrors the modals' enter-animation gate, so focus lands
    // once the panel is at its final transform (not while it's still
    // translated off-screen on mobile), avoiding a focus jump to an
    // invisible element.
    let rafInner = 0;
    const raf = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        (focusables()[0] ?? panel).focus();
      });
    });

    // Trap Tab on the document (capture) so focus that has somehow
    // escaped the panel is still pulled back in.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      const activeEl = document.activeElement;
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(activeEl);
      if (e.shiftKey && (activeEl === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      if (rafInner) cancelAnimationFrame(rafInner);
      document.removeEventListener("keydown", onKeyDown, true);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, panelRef]);
}
