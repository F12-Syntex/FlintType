"use client";

import { useEffect } from "react";
import { usePractice } from "./practice-state";

/** Reads the current practice phase from PracticeContext and mirrors
 *  it onto `<html data-ft-running="1">` while a run is in progress.
 *  Globals.css pairs this with the user's `autoHide` pref
 *  (off/dim/fade) to either leave the chrome alone, dim it to 20%,
 *  or fade it out with pointer-events:none.
 *
 *  Mounts inside <PracticeProvider> on every typing surface
 *  (TypingSurface, RaceShell). The attr always clears when the
 *  component unmounts so a hard navigation away from the run can't
 *  leave the chrome stuck hidden. */
export function AutoHideApplier() {
  const { state } = usePractice();
  const running = state.phase === "running";

  useEffect(() => {
    const root = document.documentElement;
    if (running) {
      root.setAttribute("data-ft-running", "1");
    } else {
      root.removeAttribute("data-ft-running");
    }
    return () => {
      root.removeAttribute("data-ft-running");
    };
  }, [running]);

  // Peek-to-reveal. Under `fade` the chrome is pointer-events:none, so the
  // CSS `:hover` peek can never fire (the element can't receive the hover)
  // — the "hover the edge to bring chrome back" affordance was impossible
  // (FT-042). Track the pointer at the body level instead: when it's near
  // the top or bottom edge mid-run, set data-ft-peek so globals.css
  // reveals the chrome regardless of its pointer-events state.
  useEffect(() => {
    if (!running) return;
    const root = document.documentElement;
    const EDGE = 12; // px from a viewport edge that counts as "peeking"
    const onMove = (e: MouseEvent) => {
      const nearEdge =
        e.clientY <= EDGE || e.clientY >= window.innerHeight - EDGE;
      if (nearEdge) root.setAttribute("data-ft-peek", "on");
      else root.removeAttribute("data-ft-peek");
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      root.removeAttribute("data-ft-peek");
    };
  }, [running]);

  return null;
}
