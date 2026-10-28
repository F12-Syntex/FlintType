import type { AppearancePrefs } from "@/lib/appearance-prefs";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import type { CaretSettings } from "@/lib/caret-settings";
import { LIVE_MAX_CHART_SAMPLES } from "@/types/live-burst";
import { CLONE_THEME_VARS } from "@/types/live-screen-meta";
import { burstResult, type BurstResult, type BurstTry } from "./burst-stats";
import { burstTriesFor } from "./burst-tries";
import type { LiveSnapshotShape } from "./practice-progress";
import type { State } from "./practice-reducer";

/** The clone payload ("screen") the live broadcaster sends with each
 *  `live.progress` push (practice-live-broadcast.tsx), so a spectator
 *  rebuilds the exact screen: passage, mode and, on done, the results. */

/** What the payload is built from: the run plus the broadcaster's prefs. */
export type LiveScreenSource = {
  state: State;
  raw: number;
  elapsedMs: number;
  wpmHistory: readonly { t: number; wpm: number; raw: number }[];
  appearance: AppearancePrefs;
  caret: CaretSettings;
  behaviour: BehaviourPrefs;
};

/** Cap on the per-keystroke event log sent on the `done` frame (drives
 *  the spectator's results chart/heatmap). Big enough for any normal run,
 *  bounded so a marathon TIME run can't push a huge payload. */
const MAX_EVENTS = 3_000;

/** Resolved CSS custom properties sent so the spectator's clone matches
 *  the broadcaster's colours + typography exactly. Read from <html> at
 *  push time so a theme switch mid-session flows through. The list is
 *  the wire allowlist (`CLONE_THEME_VARS` in src/types/live-screen-meta)
 *  — single source, so the sender and the schema can't drift. */
function readThemeVars(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const v of CLONE_THEME_VARS) {
    const val = cs.getPropertyValue(v).trim();
    if (val) out[v] = val;
  }
  return out;
}

/** Burst roll-ups by try log. The store swaps in a new array on every
 *  try, so the array itself is the cache key: a watched results screen
 *  re-sends the same block on every push without recomputing it. */
const burstCache = new WeakMap<readonly BurstTry[], BurstResult | null>();

/** A finished BURST run's result figures, so the spectator's results
 *  screen reads "Burst WPM", its caption and "Raw (all N tries)" like
 *  the broadcaster's. Rolled up from the run's try log (the per-passage
 *  store: the log itself lives inside the typing surface, below the
 *  broadcaster) with the same `burstResult` the results screen uses, and
 *  sent as a summary plus per-second chart samples rather than every
 *  try. Null until a try has cleared. */
export function liveBurstFigures(
  words: readonly string[],
): BurstResult | null {
  const tries = burstTriesFor(words);
  const cached = burstCache.get(tries);
  if (cached !== undefined) return cached;
  const r = burstResult(tries);
  const block = r
    ? { summary: r.summary, buckets: r.buckets.slice(-LIVE_MAX_CHART_SAMPLES) }
    : null;
  burstCache.set(tries, block);
  return block;
}

/** Build the clone payload for the windowed passage `win`. `includeMeta`
 *  carries the static block (appearance, caret, behaviour, resolved theme
 *  vars): the broadcaster sends it only every Nth frame and the server
 *  backfills the lean frames in between, so the steady-state push is
 *  tiny and skips the getComputedStyle read. The per-frame fields
 *  (cursor, typed, etc.) always go; the results data only when done. */
export function buildLiveScreen(
  s: LiveScreenSource,
  win: LiveSnapshotShape,
  includeMeta: boolean,
) {
  const st = s.state;
  const start = win.start;
  const len = win.words.length;
  const done = st.phase === "done";
  const burst = done && st.mode === "BURST" ? liveBurstFigures(st.words) : null;
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
    adapt: st.adapt,
    ...(includeMeta
      ? {
          appearance: s.appearance,
          caret: s.caret,
          behaviour: { blindMode: s.behaviour.blindMode },
          themeVars: readThemeVars(),
        }
      : {}),
    ...(done
      ? {
          // A burst run charts its own per-second figures, so the regular
          // samples would only double the frame.
          wpmHistory: burst
            ? []
            : s.wpmHistory
                .slice(-LIVE_MAX_CHART_SAMPLES)
                .map((h) => ({ t: h.t, wpm: h.wpm, raw: h.raw })),
          events: st.events
            .filter((e) => e.wordIndex >= start && e.wordIndex < start + len)
            .slice(0, MAX_EVENTS)
            .map((e) => ({
              t: e.t,
              expected: e.expected,
              typed: e.typed,
              correct: e.correct,
              wordIndex: e.wordIndex - start,
            })),
          ...(burst ? { burst } : {}),
        }
      : {}),
  };
}
