import type { State } from "@/app/_components/practice-reducer";
import { lengthModeOf, runContextFor, stateToRunInput } from "@/app/_components/practice-submit";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import { runBucketKey } from "@/lib/test-bucket";
import { fixModeOf } from "@/lib/typing-analysis/context";
import { calcWpmAndRaw } from "@/lib/wpm";
import type { RunAnalysisSource } from "@/types/typing-analysis";

/** The live clone's analysis source (spec-50 §3.2): the broadcaster's
 *  finished run as their own result screen analyses it, built from the
 *  frozen state and the broadcaster's settings, never the viewer's. The
 *  live payload carries only the five original event fields, so this is
 *  a v1 analysis with plain gap classes. `windowStart` > 0 means the
 *  events start after word 0, which marks the run partial (the time
 *  card hides, and so do findings about the run's start, end and
 *  breaks). Null while running, for BURST, or with no keys. */
export function cloneAnalysisSource(a: {
  state: State;
  behaviour: BehaviourPrefs;
  wordlist: string;
  windowStart: number | undefined;
}): RunAnalysisSource | null {
  const { state } = a;
  if (state.phase !== "done" || state.mode === "BURST") return null;
  if (state.startTime == null || state.endTime == null) return null;
  const ctx = runContextFor({
    behaviour: a.behaviour,
    wordlist: a.wordlist,
    mode: state.mode,
    suddenDeath: false,
    lockedWords: false,
    raceMode: false,
    state,
  });
  // The final speed exactly as the submit computes it, never the
  // throttled live figure.
  const { wpm } = calcWpmAndRaw(state.typed, state.words, state.endTime - state.startTime, true, state.events.length);
  const base = stateToRunInput(state, ctx, wpm);
  if (!base) return null;
  const spec = { mode: state.adapt ? "training" : "casual", lengthMode: lengthModeOf(state.mode), length: state.length };
  return {
    input: { ...base, partial: (a.windowStart ?? 0) > 0 },
    bucket: runBucketKey(spec, ctx.input === "touch"),
    fixMode: fixModeOf(ctx),
    startedAt: state.startTime,
  };
}
