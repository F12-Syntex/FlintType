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
 *  Every other phase — the launcher, matchmaking, the lobby and the
 *  finished results screen — keeps Tab as native focus traversal so
 *  keyboard-only users can reach the mode switch, Find race, Ready,
 *  Start, Rematch and Leave controls, even when focus starts on the
 *  hidden typing input (see the handler). The practice provider runs in
 *  race mode on race pages, so its own Tab-restart binding stands down.
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
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (lockFocus) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Not typing: Tab must do native focus traversal. But focus often
      // rests on the hidden typing input (it grabs focus on mount), and
      // that input's own key handler swallows EVERY key while the race
      // input is locked (launcher, matchmaking, lobby), Tab included —
      // which trapped keyboard users on the launcher and in the lobby.
      // Stopping propagation here, at the window capture phase, keeps
      // the event from ever reaching that handler; the browser's default
      // Tab action (move focus) is untouched.
      const target = e.target as HTMLElement | null;
      if (target?.getAttribute("aria-label") === "Typing input") {
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [lockFocus]);

  return null;
}
