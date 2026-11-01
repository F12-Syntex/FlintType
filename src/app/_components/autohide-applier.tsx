"use client";

import { useEffect } from "react";
import { peekEdge } from "@/lib/autohide-peek";
import { usePractice } from "./practice-state";

/** Reads the current practice phase from PracticeContext and mirrors
 *  it onto `<html data-ft-running="1">` while a run is in progress.
 *  Globals.css pairs this with the user's `autoHide` pref
 *  (off/dim/fade) to either leave the chrome alone, dim it to 20%,
 *  or fade it out with pointer-events:none.
 *
 *  It also drives the edge "peek": while running, it tracks the pointer
 *  and writes `<html data-ft-peek="top|bottom">` when the cursor reaches a
 *  viewport edge, so globals.css can reveal the topbar/footer. This can't
 *  be CSS `:hover` — under `fade` the chrome is `pointer-events:none` and is
 *  never hit-tested, so :hover never fires (FT-042).
 *
 *  Mounts inside <PracticeProvider> on every typing surface
 *  (TypingSurface, RaceShell). The attrs always clear when the
 *  component unmounts so a hard navigation away from the run can't
 *  leave the chrome stuck hidden. */
export function AutoHideApplier() {
  const { state } = usePractice();
  const running = state.phase === "running";

  useEffect(() => {
    const root = document.documentElement;
    if (!running) {
      root.removeAttribute("data-ft-running");
      root.removeAttribute("data-ft-peek");
      return;
    }
    root.setAttribute("data-ft-running", "1");

    // Mirror the pointer's edge zone to data-ft-peek, writing only on a
    // change so a busy mousemove doesn't thrash the DOM.
    let zone: "top" | "bottom" | null = null;
    const onMove = (e: MouseEvent) => {
      const next = peekEdge(e.clientY, window.innerHeight);
      if (next === zone) return;
      zone = next;
      if (next) root.setAttribute("data-ft-peek", next);
      else root.removeAttribute("data-ft-peek");
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("mousemove", onMove);
      root.removeAttribute("data-ft-running");
      root.removeAttribute("data-ft-peek");
    };
  }, [running]);

  return null;
}
