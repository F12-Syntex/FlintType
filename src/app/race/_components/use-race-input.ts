"use client";

import { useEffect } from "react";
import { useRace } from "./race-state";

/** Window-level keyboard handler for the race. Only active while
 *  `phase === "racing"` — countdown / lobby / finished swallow keys
 *  so a panicky early keystroke can't accidentally land in word 0.
 *
 *  Hooks the same shape as practice's input handler:
 *    - printable char  → TYPE_CHAR (paint correct/incorrect inline)
 *    - space           → SPACE (commit current word, advance cursor)
 *    - backspace       → BACKSPACE (undo inside the current word)
 *    - Ctrl/Meta/Alt   → ignored, so OS shortcuts still work
 *    - input/textarea focused → ignored, so text fields keep typing */
export function useRaceInput(): void {
  const { state, dispatch } = useRace();

  useEffect(() => {
    if (state.phase !== "racing") return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "BACKSPACE" });
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        dispatch({ type: "SPACE", now: Date.now() });
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        dispatch({ type: "TYPE_CHAR", ch: e.key, now: Date.now() });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, dispatch]);
}
