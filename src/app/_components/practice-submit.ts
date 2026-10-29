import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import { runBucketKey } from "@/lib/test-bucket";
import { CODE_MATCH_LETTERS } from "@/lib/typing-analysis/constants";
import { fixModeOf, inputKindOf } from "@/lib/typing-analysis/context";
import { calcWpmAndRaw, keystrokeAccuracy, keystrokeErrors } from "@/lib/wpm";
import { avgWpm, consistencyScore, peakWpm, stallWpm } from "@/lib/wpm-stats";
import type { SubmitTestInput, TestMode } from "@/types/adapt";
import type { KeystrokeTimingV2, RunContext } from "@/types/capture";
import type { RunAnalysisSource, RunInput, RunLengthMode } from "@/types/typing-analysis";
import type { KeyEvent, Mode, State, WpmSample } from "./practice-reducer";

/** Pure builders for what a finished run sends and what the result
 *  screen analyses (spec-20 §5.2). The submit payload and the analysed
 *  RunInput share `reachedWords` and the run context, so the result
 *  screen and the stored digest see the same run (invariant I2). */

/** The schema's bound on `resetCount`. */
const RESET_COUNT_MAX = 10_000;
/** The schema's bound on `wpmHistory`. */
const HISTORY_MAX = 600;

/** The adapt `mode` a run is stored under (unchanged mapping). */
export function submitModeFor(adapt: boolean, raceMode: boolean): TestMode {
  return raceMode ? "race" : adapt ? "training" : "casual";
}

/** The length unit a run is stored under. BURST never submits. */
export function lengthModeOf(mode: Mode): RunLengthMode {
  return mode === "TIME" ? "time" : mode === "QUOTE" ? "quote" : "words";
}

/** The words a run reached: exactly the submit's slice, words up to
 *  the cursor's word. In TIME mode `state.words` is the refill buffer,
 *  so this cuts it to what was actually shown and typed. */
export function reachedWords(state: Pick<State, "words" | "cursorWord">): string[] {
  return state.words.slice(0, Math.min(state.cursorWord + 1, state.words.length));
}

/** The run's settings as the analysis needs them. `codeMatch` appears
 *  once at least CODE_MATCH_LETTERS letter keydowns were seen, rounded
 *  to 3 dp; absent fields are omitted, never set to undefined. */
export function runContextFor(a: {
  behaviour: Pick<BehaviourPrefs, "stopOnError" | "allowExtras" | "strictSpace" | "confidence" | "showSecondary">;
  wordlist: string;
  mode: Mode;
  suddenDeath: boolean;
  lockedWords: boolean;
  raceMode: boolean;
  state: Pick<State, "events" | "layoutHits" | "capped">;
}): RunContext {
  const ctx: RunContext = {
    stopOnError: a.behaviour.stopOnError || a.suddenDeath,
    allowExtras: a.behaviour.allowExtras,
    strictSpace: a.behaviour.strictSpace,
    confidence: a.behaviour.confidence,
    suddenDeath: a.suddenDeath,
    drill: a.lockedWords && !a.raceMode,
    race: a.raceMode,
    punctuation: a.behaviour.showSecondary,
    input: inputKindOf(a.state.events),
  };
  if (a.mode !== "QUOTE") ctx.wordlist = a.wordlist;
  const [letters, matches] = a.state.layoutHits ?? [0, 0];
  if (letters >= CODE_MATCH_LETTERS) ctx.codeMatch = Math.round((matches / letters) * 1000) / 1000;
  if (a.state.capped) ctx.capped = true;
  return ctx;
}

/** One timing on the wire: exactly the five original fields plus the
 *  three v2 ones, with undefined omitted, so nothing else leaks. */
function timingOf(e: KeyEvent): KeystrokeTimingV2 {
  return {
    t: e.t,
    expected: e.expected,
    typed: e.typed,
    correct: e.correct,
    wordIndex: e.wordIndex,
    ...(e.pos !== undefined ? { pos: e.pos } : {}),
    ...(e.src !== undefined ? { src: e.src } : {}),
    ...(e.ht !== undefined ? { ht: e.ht } : {}),
  };
}

/** The finished run as the engine sees it. Null for BURST, an unfinished
 *  run, or a run with no keys. */
export function stateToRunInput(state: State, ctx: RunContext | undefined, wpm: number): RunInput | null {
  const { startTime, endTime } = state;
  if (state.mode === "BURST" || startTime == null || endTime == null || state.events.length === 0) return null;
  const words = reachedWords(state);
  return {
    timings: state.events.map(timingOf),
    ...(state.edits ? { edits: state.edits } : {}),
    ...(state.spaces ? { spaces: state.spaces } : {}),
    words,
    typedFinal: state.typed.slice(0, words.length),
    durationMs: endTime - startTime,
    wpm,
    lengthMode: lengthModeOf(state.mode),
    ...(ctx ? { ctx } : {}),
  };
}

/** The adapt.submit payload for a finished run: today's fields
 *  unchanged, plus the v2 timings, marks and run context, and the real
 *  reset count. The caller has already checked that the run finished
 *  (both clock ends set) and isn't BURST. */
export function buildSubmitInput(a: {
  state: State;
  history: readonly WpmSample[];
  raceMode: boolean;
  resetCount: number;
  ctx: RunContext;
}): SubmitTestInput {
  const { state, history } = a;
  const startedAt = state.startTime ?? 0;
  const completedAt = state.endTime ?? startedAt;
  // Raw counts every key pressed (stop-on-error blocks and dropped
  // extras included), so pass the keystroke count (see wpm.ts).
  const { wpm, raw } = calcWpmAndRaw(state.typed, state.words, completedAt - startedAt, true, state.events.length);
  return {
    startedAt,
    completedAt,
    mode: submitModeFor(state.adapt, a.raceMode),
    durationOrWordCount: state.length,
    lengthMode: lengthModeOf(state.mode),
    wpm,
    // Keystroke-true accuracy and errors: a backspaced or blocked
    // mistake still counts, matching the results and live readouts.
    accuracy: keystrokeAccuracy(state.events),
    errorCount: keystrokeErrors(state.events),
    resetCount: Math.max(0, Math.min(Math.round(a.resetCount), RESET_COUNT_MAX)),
    wasCompleted: true,
    words: reachedWords(state),
    timings: state.events.map(timingOf),
    rawWpm: raw,
    // Roll-ups from the same per-second history the result chart reads.
    peakWpm: Math.round(peakWpm(history)),
    avgWpm: Math.round(avgWpm(history)),
    stallWpm: Math.round(stallWpm(history)),
    consistency: consistencyScore(history),
    // Head-trimmed to the schema max; the chart cares about the shape.
    wpmHistory: history.slice(-HISTORY_MAX).map((s) => ({ t: s.t, wpm: s.wpm, raw: s.raw })),
    ...(state.edits ? { edits: state.edits } : {}),
    ...(state.spaces ? { spaces: state.spaces } : {}),
    ctx: a.ctx,
  };
}

/** What the result screen analyses: the RunInput the submit used, with
 *  its bucket and fix mode. Null when there is nothing to analyse. */
export function analysisSourceFor(a: { state: State; ctx: RunContext; raceMode: boolean }): RunAnalysisSource | null {
  const { state, ctx } = a;
  if (state.startTime == null || state.endTime == null) return null;
  const { wpm } = calcWpmAndRaw(state.typed, state.words, state.endTime - state.startTime, true, state.events.length);
  const input = stateToRunInput(state, ctx, wpm);
  if (!input) return null;
  const spec = { mode: submitModeFor(state.adapt, a.raceMode), lengthMode: input.lengthMode, length: state.length };
  return { input, bucket: runBucketKey(spec, ctx.input === "touch"), fixMode: fixModeOf(ctx), startedAt: state.startTime };
}
