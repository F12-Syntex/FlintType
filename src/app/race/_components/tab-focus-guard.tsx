"use client";

import { useEffect } from "react";
import { useRace } from "./race-state";

/** Phase-aware Tab handler for the race surface.
 *
 *  The race surface captures typing through a hidden, `tabIndex={-1}`
 *  input. While the local user is actively typing (the countdown
 *  before the gun, and the race itself), Tab must NOT move focus off
 *  that input — a stray Tab mid-race would silently send the next
 *  keystrokes to a button instead of the passage. So we swallow Tab
 *  during those two windows only.
 *
 *  Every other phase — the lobby, matchmaking, and the finished
 *  results screen — leaves Tab alone so keyboard-only users can reach
 *  the Ready, Start, Rematch, and Leave controls with native tab
 *  traversal. (Tab-as-restart was retired in <InputCapture>, so there
 *  is no longer any practice-side binding to out-race here.)
 *
 *  Capture phase so the decision is made before any bubble-phase
 *  listener runs. Returns no UI. */
export function TabFocusGuard() {
  const { state } = useRace();
  const you = state.racers.find((r) => r.isYou) ?? null;
  const youFinished = you?.finishedAt != null;
  // Lock focus on the typing input only while the user is (or is about
  // to be) typing: the 3-2-1 countdown, and racing before they cross
  // the line. Once finished — even if opponents are still racing —
  // their run is over, so let them Tab to the results controls.
  const lockFocus =
    state.phase === "countdown" || (state.phase === "racing" && !youFinished);

  useEffect(() => {
    if (!lockFocus) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [lockFocus]);

  return null;
}
