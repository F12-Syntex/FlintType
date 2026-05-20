"use client";

import { useEffect } from "react";

/** Marker attribute set on `<html>` while an interactive typing-capture
 *  surface (practice, sudden-death, burst drills, race) is mounted and
 *  not yet finished.
 *
 *  Why it exists: those surfaces capture keystrokes at the `window`
 *  level against a non-input element (no focused `<input>`), so the
 *  global `F` focus-mode shortcut (`focus-shortcut.tsx`) — which only
 *  knew to stand down when the active element was an input — would
 *  toggle focus mode on every `f` the user typed mid-exercise. While
 *  this marker is present, `F` is treated as a typed character, not a
 *  chrome toggle.
 *
 *  Why an attribute + module ref-count rather than context: the reader
 *  (`FocusShortcut`) is mounted once in `<Providers>`, outside every
 *  typing surface's provider tree. A `<html>` marker is the cheapest
 *  cross-tree signal and mirrors the existing `data-ft-running` pattern
 *  (`autohide-applier.tsx`). */
export const TYPING_SURFACE_ATTR = "data-ft-typing-surface";

let active = 0;

function acquire() {
  active += 1;
  if (active === 1) {
    document.documentElement.setAttribute(TYPING_SURFACE_ATTR, "1");
  }
}

function release() {
  active = Math.max(0, active - 1);
  if (active === 0) {
    document.documentElement.removeAttribute(TYPING_SURFACE_ATTR);
  }
}

/** True while any interactive typing surface is mounted. Read by
 *  `FocusShortcut` to decide whether `F` is a typed char or a toggle. */
export function isTypingSurfaceActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute(TYPING_SURFACE_ATTR);
}

/** Hold the typing-surface marker while `interactive` is true. Releases
 *  on unmount or when `interactive` flips false (the run finished — so
 *  `F` toggles focus again on the results / drill-clear screen).
 *  Ref-counted so a brief mount/unmount overlap (StrictMode double
 *  invoke, route transition) can't clear the marker out from under a
 *  still-mounted surface. */
export function useTypingSurfaceMarker(interactive: boolean) {
  useEffect(() => {
    if (!interactive) return;
    acquire();
    return release;
  }, [interactive]);
}
