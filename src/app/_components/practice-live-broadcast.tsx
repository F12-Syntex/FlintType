"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { practiceProgressChars } from "./practice-progress";
import type { State } from "./practice-state";

const POST_THROTTLE_MS = 700;
/** Module-level stable default — useRemotePrefs captures it once. */
const SPECTATE_DEFAULT = { enabled: false };

/** Invisible. Mounted once inside every real <PracticeProvider>, so any
 *  passage-based surface (home practice, sudden-death drills) streams
 *  automatically — no per-surface wiring. While the signed-in user has
 *  opted in (Customise > Behaviour > Live spectating) and a run is
 *  active, it pushes the live passage + caret + wpm/accuracy to
 *  `live.progress` ~every 700ms so mutual friends can watch from the
 *  friends hub.
 *
 *  State/wpm/accuracy arrive as props (the provider passes them in) so
 *  this file never imports `usePractice` — that would close a runtime
 *  import cycle with practice-state. The server re-checks the consent
 *  gate on every push; a rejected push means the user opted out and we
 *  stop. Broadcasting clears on unmount and otherwise ages out
 *  server-side ~6s after the last push. */
export function PracticeLiveBroadcast({
  active = true,
  state,
  wpm,
  accuracy,
}: {
  /** False during a race (the race subsystem owns its own broadcast). */
  active?: boolean;
  state: State;
  wpm: number;
  accuracy: number;
}) {
  const backend = useBackend();
  const { isSignedIn } = useUser();
  const { value: spectate } = useRemotePrefs<{ enabled: boolean }>(
    "spectate",
    SPECTATE_DEFAULT,
  );

  const enabled = active && !!isSignedIn && spectate.enabled;
  const running = state.phase === "running";

  // Latest values the interval reads without re-subscribing each tick.
  const snapRef = useRef({ state, wpm, accuracy });
  snapRef.current = { state, wpm, accuracy };

  useEffect(() => {
    if (!enabled || !running) return;
    let stopped = false;
    const post = () => {
      const { state: s, wpm: w, accuracy: a } = snapRef.current;
      if (s.words.length === 0) return;
      backend.live
        .progress({
          words: s.words,
          progressChars: practiceProgressChars(s),
          totalChars: s.words.join(" ").length,
          wpm: w,
          accuracy: a,
        })
        .then((r) => {
          if (!r.accepted) stopped = true; // server says opted-out
        })
        .catch(() => {});
    };
    post(); // push the first frame immediately, don't wait a tick
    const id = window.setInterval(() => {
      if (!stopped) post();
    }, POST_THROTTLE_MS);
    return () => window.clearInterval(id);
  }, [enabled, running, backend]);

  // Clear our snapshot when the surface unmounts so a spectator doesn't
  // linger on a stale frame for the full freshness window.
  useEffect(() => {
    if (!isSignedIn) return;
    return () => {
      backend.live.stop().catch(() => {});
    };
  }, [isSignedIn, backend]);

  return null;
}
