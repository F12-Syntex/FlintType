"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { mergeOffset, offsetSample } from "@/lib/race-clock";
import type { RoomSnapshot } from "@/types/race";
import { usePractice } from "../../_components/practice-state";
import { localGunInstant } from "./race-anchor";

/** Your own progress as the race publishes it. `startTime` / `endTime`
 *  are the practice run's clock (pinned to the gun by
 *  `useGunAnchoredRun`); `publishedWpm` turns them into the posted
 *  wpm at send time. */
export type YouProgress = {
  correctChars: number;
  finished: boolean;
  errors: number;
  accuracy: number;
  startTime: number | null;
  endTime: number | null;
};

/** Anchors the local practice run's clock on the race gun.
 *
 *  The server times every racer from the gun, so the practice run must
 *  too: otherwise a racer who starts typing late gets a live / recorded
 *  WPM timed from their first keystroke, well above the result card.
 *  On the first snapshot that shows this seat racing, the hook records
 *  the local gun instant (`localGunInstant`: skew-safe, from when this
 *  client saw the race go live and the countdown's server-clock offset,
 *  `offsetRef`, read the same way the countdown digit does) and dispatches
 *  `ANCHOR_START` with it. It re-anchors to the same instant if the run
 *  is reset mid-race (Esc restarts the passage), so the clock never
 *  drifts back to a keystroke.
 *
 *  A layout effect, not a plain effect: the race provider unlocks input
 *  during the render that sees "racing", and a layout effect runs in the
 *  same task as that commit, so no keystroke can start the clock first.
 *  (If one ever did, the reducer moves the clock back to the gun.)
 *
 *  Spectators (no seat) and racers who already crossed are left alone.
 *  The race subtree re-mounts per round, so a rematch anchors afresh. */
export function useGunAnchoredRun(
  snapshot: RoomSnapshot | null,
  sessionToken: string | null,
  offsetRef: RefObject<number | null>,
): void {
  const { state, dispatch } = usePractice();
  const gunAtRef = useRef<number | null>(null);
  const me = sessionToken
    ? (snapshot?.racers.find((r) => r.id === sessionToken) ?? null)
    : null;
  const raceStartedAt = snapshot?.raceStartedAt ?? null;
  const serverNowMs = snapshot?.serverNowMs ?? null;
  const racing =
    snapshot?.phase === "racing" &&
    raceStartedAt != null &&
    serverNowMs != null &&
    me != null &&
    me.finishedAt == null;
  useLayoutEffect(() => {
    if (!racing || raceStartedAt == null || serverNowMs == null) return;
    if (gunAtRef.current == null) {
      const now = Date.now();
      // Fold this snapshot's own sample in without writing the ref (the
      // provider's offset effect owns it), like the first live frame.
      const offset = mergeOffset(offsetRef.current, offsetSample(serverNowMs, now));
      gunAtRef.current = localGunInstant(now, serverNowMs, raceStartedAt, offset);
    }
    const at = gunAtRef.current;
    if (state.phase === "done" || state.startTime === at) return;
    dispatch({ type: "ANCHOR_START", at });
  }, [racing, raceStartedAt, serverNowMs, offsetRef, state.phase, state.startTime, dispatch]);
}

/** Your progress, computed locally from the practice run on every
 *  keystroke (instant feedback; the server echoes it back).
 *
 *  - `correctChars` is the cursor position in the passage (it moves
 *    back with backspace); the server uses it for progress bars and
 *    spectator views.
 *  - `errors` / `accuracy` come from the reducer's keystroke counters,
 *    which never decrement, so a corrected mistake still counts.
 *  - `startTime` / `endTime` carry the run's clock so the poster can
 *    measure the wpm when it sends (`publishedWpm`, the server's
 *    formula). Only same-clock subtraction (local `Date.now()` minus a
 *    local start), so device skew can't zero it. */
export function useYouProgress(): YouProgress {
  const { state } = usePractice();
  return useMemo(() => {
    let progressChars = 0;
    for (let i = 0; i < state.typed.length; i += 1) {
      const t = state.typed[i] ?? "";
      const w = state.words[i] ?? "";
      progressChars += Math.min(t.length, w.length);
      if (i < state.typed.length - 1) progressChars += 1;
    }
    const totalKeystrokes = state.totalChars;
    const correctKeystrokes = state.correctChars;
    const errors = Math.max(0, totalKeystrokes - correctKeystrokes);
    const accuracy =
      totalKeystrokes === 0
        ? 100
        : Math.round((correctKeystrokes / totalKeystrokes) * 1000) / 10;
    return {
      correctChars: progressChars,
      errors,
      accuracy,
      finished: state.phase === "done",
      startTime: state.startTime,
      endTime: state.endTime,
    };
  }, [
    state.typed,
    state.words,
    state.phase,
    state.totalChars,
    state.correctChars,
    state.startTime,
    state.endTime,
  ]);
}
