"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBackend } from "@/lib/backend";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { broadcastPlan } from "@/lib/live-cadence";
import { setWatcherCount } from "@/lib/live-watchers";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { LIVE_MAX_WORDS } from "@/types/live";
import { liveSnapshotWindow } from "./practice-progress";
import type { State } from "./practice-state";
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
 *  automatically. While sharing is on, it pushes a full clone payload to
 *  `live.progress` ~every 700ms in EVERY phase (rest / running / done):
 *  the windowed passage + the broadcaster's appearance, caret, behaviour,
 *  resolved theme vars, and (on done) the results data, so a spectator
 *  reconstructs the exact screen — passage, mode, and results alike.
 *
 *  State/stats arrive as props (the provider passes them) so this file
 *  never imports `usePractice` (that would close an import cycle with
 *  practice-state). Appearance/caret/behaviour come from the pref hooks
 *  — never overridden here (the override only wraps the watch clone). */
/** Cap on the per-keystroke event log sent on the `done` frame (drives
 *  the spectator's results chart/heatmap). Big enough for any normal run,
 *  bounded so a marathon TIME run can't push a huge payload. */
const MAX_EVENTS = 3_000;

export function PracticeLiveBroadcast({
  active = true,
  state,
  wpm,
  raw,
  accuracy,
  elapsedMs,
  wpmHistory,
}: {
  /** False during a race (the race subsystem owns its own broadcast). */
  active?: boolean;
  state: State;
  wpm: number;
  raw: number;
  accuracy: number;
  elapsedMs: number;
  wpmHistory: readonly { t: number; wpm: number; raw: number }[];
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
  const phase = state.phase;

  // Latest values the loop reads without re-subscribing each tick.
  const snapRef = useRef({ state, wpm, raw, accuracy, elapsedMs, wpmHistory, appearance, caret, behaviour });
  snapRef.current = { state, wpm, raw, accuracy, elapsedMs, wpmHistory, appearance, caret, behaviour };
  // Last known watcher count — persists across the effect restarts that
  // phase changes trigger, so a watched run doesn't blink to "unwatched"
  // when it transitions running → done.
  const watchersRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setWatcherCount(0);
      return;
    }
    let stopped = false;
    let timer = 0;

    // Build the full clone payload — only when actually watched (it's the
    // expensive part: getComputedStyle + the done events).
    const buildScreen = (
      s: typeof snapRef.current,
      win: ReturnType<typeof liveSnapshotWindow>,
    ) => {
      const st = s.state;
      const start = win.start;
      const len = win.words.length;
      const done = st.phase === "done";
      return {
        phase: st.phase,
        typed: st.typed.slice(start, start + len),
        cursorWord: Math.max(0, st.cursorWord - start),
        cursorChar: st.cursorChar,
        mode: st.mode,
        length: st.length,
        quoteSource: st.quoteSource,
        elapsedMs: s.elapsedMs,
        raw: s.raw,
        appearance: s.appearance as unknown as Record<string, unknown>,
        caret: s.caret as unknown as Record<string, unknown>,
        behaviour: { blindMode: s.behaviour.blindMode },
        themeVars: readThemeVars(),
        ...(done
          ? {
              wpmHistory: s.wpmHistory.map((h) => ({
                t: h.t,
                wpm: h.wpm,
                raw: h.raw,
              })),
              events: st.events
                .filter(
                  (e) => e.wordIndex >= start && e.wordIndex < start + len,
                )
                .slice(0, MAX_EVENTS)
                .map((e) => ({
                  t: e.t,
                  expected: e.expected,
                  typed: e.typed,
                  correct: e.correct,
                  wordIndex: e.wordIndex - start,
                })),
            }
          : {}),
      };
    };

    // Reschedule on the plan's cadence (reads the freshest watcher count
    // + phase). Idle + unwatched yields a null delay → the loop stops and
    // resumes only when the phase changes (the effect dep below).
    const reschedule = () => {
      if (stopped) return;
      const { nextDelayMs } = broadcastPlan(
        watchersRef.current > 0,
        snapRef.current.state.phase,
      );
      if (nextDelayMs != null) timer = window.setTimeout(tick, nextDelayMs);
    };

    const tick = () => {
      if (stopped) return;
      const s = snapRef.current;
      const st = s.state;
      const plan = broadcastPlan(watchersRef.current > 0, st.phase);
      if (plan.nextDelayMs == null) return; // idle + unwatched → stop
      // Skip the push (but keep the cadence) while the tab is hidden, or
      // when there's nothing to send yet — no request goes out.
      const hidden = typeof document !== "undefined" && document.hidden;
      if (hidden || !plan.push || st.words.length === 0) {
        timer = window.setTimeout(tick, plan.nextDelayMs);
        return;
      }
      const win = liveSnapshotWindow(st, LIVE_MAX_WORDS);
      backend.live
        .progress({
          words: win.words,
          progressChars: win.progressChars,
          totalChars: win.totalChars,
          wpm: s.wpm,
          accuracy: s.accuracy,
          // Heavy clone payload only when someone's watching.
          ...(plan.includeScreen ? { screen: buildScreen(s, win) } : {}),
        })
        .then((r) => {
          if (!r.accepted) {
            stopped = true;
            setWatcherCount(0);
            return;
          }
          watchersRef.current = r.watchers;
          setWatcherCount(r.watchers);
          reschedule();
        })
        .catch(() => reschedule());
    };

    tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      setWatcherCount(0);
    };
  }, [enabled, phase, backend]);

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
