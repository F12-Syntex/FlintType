"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBackend } from "@/lib/backend";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { LIVE_MAX_WORDS } from "@/types/live";
import { liveSnapshotWindow } from "./practice-progress";
import type { State } from "./practice-state";

const POST_THROTTLE_MS = 700;
/** Module-level stable default — useRemotePrefs captures it once.
 *  Sharing is ON by default; only an explicit `false` turns it off. */
const SPECTATE_DEFAULT: { enabled?: boolean } = { enabled: true };

/** Resolved CSS custom properties sent so the spectator's clone matches
 *  the broadcaster's colours + typography exactly. Read from <html> at
 *  push time so a theme switch mid-session flows through. */
const CLONE_THEME_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--destructive",
  "--destructive-foreground",
  "--ft-font-family",
  "--ft-font-scale",
  "--ft-word-spacing",
  "--ft-passage-typed",
  "--ft-passage-untyped",
  "--ft-passage-error",
] as const;

function readThemeVars(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const v of CLONE_THEME_VARS) {
    const val = cs.getPropertyValue(v).trim();
    if (val) out[v] = val;
  }
  return out;
}

/** Invisible. Mounted once inside every real <PracticeProvider>, so any
 *  passage-based surface (home practice, sudden-death drills) streams
 *  automatically. While sharing is on and a run is active, it pushes a
 *  full clone payload to `live.progress` ~every 700ms: the windowed
 *  passage + the broadcaster's appearance, caret, behaviour, and resolved
 *  theme vars, so a spectator reconstructs the exact screen.
 *
 *  State/stats arrive as props (the provider passes them) so this file
 *  never imports `usePractice` (that would close an import cycle with
 *  practice-state). Appearance/caret/behaviour come from the pref hooks
 *  — never overridden here (the override only wraps the watch clone). */
export function PracticeLiveBroadcast({
  active = true,
  state,
  wpm,
  raw,
  accuracy,
  elapsedMs,
}: {
  /** False during a race (the race subsystem owns its own broadcast). */
  active?: boolean;
  state: State;
  wpm: number;
  raw: number;
  accuracy: number;
  elapsedMs: number;
}) {
  const backend = useBackend();
  const { isSignedIn } = useUser();
  const { value: spectate } = useRemotePrefs<{ enabled?: boolean }>(
    "spectate",
    SPECTATE_DEFAULT,
  );
  const { prefs: appearance } = useAppearancePrefs();
  const { settings: caret } = useCaretSettings();
  const { prefs: behaviour } = useBehaviourPrefs();

  const enabled = active && !!isSignedIn && spectate.enabled !== false;
  const running = state.phase === "running";

  // Latest values the interval reads without re-subscribing it each tick.
  const snapRef = useRef({ state, wpm, raw, accuracy, elapsedMs, appearance, caret, behaviour });
  snapRef.current = { state, wpm, raw, accuracy, elapsedMs, appearance, caret, behaviour };

  useEffect(() => {
    if (!enabled || !running) return;
    let id = 0;
    const post = () => {
      const s = snapRef.current;
      const st = s.state;
      if (st.words.length === 0) return;
      // Window the passage so a runaway TIME buffer never blows the wire
      // cap; window `typed` + the cursor by the same offset.
      const win = liveSnapshotWindow(st, LIVE_MAX_WORDS);
      backend.live
        .progress({
          words: win.words,
          progressChars: win.progressChars,
          totalChars: win.totalChars,
          wpm: s.wpm,
          accuracy: s.accuracy,
          screen: {
            typed: st.typed.slice(win.start, win.start + win.words.length),
            cursorWord: Math.max(0, st.cursorWord - win.start),
            cursorChar: st.cursorChar,
            mode: st.mode,
            quoteSource: st.quoteSource,
            elapsedMs: s.elapsedMs,
            raw: s.raw,
            appearance: s.appearance as unknown as Record<string, unknown>,
            caret: s.caret as unknown as Record<string, unknown>,
            behaviour: { blindMode: s.behaviour.blindMode },
            themeVars: readThemeVars(),
          },
        })
        .then((r) => {
          if (!r.accepted) window.clearInterval(id); // server says opted-out
        })
        .catch(() => {});
    };
    post(); // push the first frame immediately, don't wait a tick
    id = window.setInterval(post, POST_THROTTLE_MS);
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
