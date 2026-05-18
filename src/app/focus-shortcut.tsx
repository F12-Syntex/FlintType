"use client";

import { useEffect } from "react";

/** Global `F` shortcut → toggle a session-scoped "focus mode" that
 *  collapses every chrome layer in one swoop (transparent cards,
 *  hidden borders, dim topbar/footer, no accents). Implemented as a
 *  CSS cascade on `html[data-ft-focus="on"]` (see globals.css §15) —
 *  the shortcut just flips the attr, so toggling has zero render cost
 *  and doesn't write to the user's pref store.
 *
 *  Activation rules:
 *    - Listen only when the active element isn't an input / textarea
 *      / contenteditable; otherwise users typing the letter "f" in a
 *      search field would accidentally enter focus mode.
 *    - Esc clears the attr unconditionally.
 *    - Ignore when modifier keys are held — Cmd-F is the browser's
 *      Find shortcut and must keep working.
 *
 *  Sits inside <Providers> next to AppearanceApplier so it's mounted
 *  for every route. */
export function FocusShortcut() {
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      // Esc always clears focus mode, regardless of where focus is.
      // Lets the user bail without having to reach back to the
      // background to click somewhere clearable.
      if (e.key === "Escape") {
        document.documentElement.removeAttribute("data-ft-focus");
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "f" && e.key !== "F") return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      const root = document.documentElement;
      if (root.getAttribute("data-ft-focus") === "on") {
        root.removeAttribute("data-ft-focus");
      } else {
        root.setAttribute("data-ft-focus", "on");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
