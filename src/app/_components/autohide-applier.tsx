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

  return null;
}
