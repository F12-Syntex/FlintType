import type { KeyEvent, Phase, State, WpmSample } from "@/app/_components/practice-reducer";
import { stateToRunInput } from "@/app/_components/practice-submit";
import { calcWpmAndRaw, keystrokeAccuracy } from "@/lib/wpm";
import type { RunAnalysisSource } from "@/types/typing-analysis";

/** The settings previews' frozen practice runs, as pure data (spec-50 §6).
 *  Kept apart from `preview-practice.tsx` (a client module whose imports
 *  reach Clerk) so the done run can be tested against the analysis
 *  engine. The done run is a v1 run on one clock: its first key is at
 *  t = 0, `endTime − startTime` is the run's real length, and `typed` is
 *  rebuilt from its events, so the analysis explains exactly what the
 *  preview shows. */

/** Tiny LCG for deterministic preview noise: the same passage gives the
 *  same jitter every render, so the preview doesn't flicker. */
export function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export type SampleRun = {
  events: KeyEvent[];
  wpmHistory: WpmSample[];
  elapsedMs: number;
  wpm: number;
  raw: number;
  accuracy: number;
};

/** Where the sample run slips and pauses (pangram word:letter indexes). */
const FIXED_SLIP = { word: 2, char: 1, typed: "e", fixMs: 600 };
const LEFT_SLIP = { word: 4, char: 1, typed: "x" };
const PAUSE_BEFORE_WORD = 6;
const PAUSE_SPACE_MS = 2400;

/** A completed sample run over `words`: a key about every 200 ms with
 *  light jitter, one slip fixed 600 ms later ("brown"), one slip left
 *  in ("jumps"), one long pause before word 6, plus a per-second wpm
 *  curve that climbs, dips and recovers (decorative, as before). */
export function buildSampleRun(words: readonly string[]): SampleRun {
  const rand = lcg(42);
  const baseInterval = 200; // ms per char, about 60 wpm
  const events: KeyEvent[] = [];
  let t = 0;

  words.forEach((word, wi) => {
    [...word].forEach((ch, ci) => {
      const jitter = (rand() - 0.5) * 80;
      // The run's clock starts at its first key (t = 0), as in the reducer.
      t = events.length === 0 ? 0 : t + baseInterval + jitter;
      if (wi === FIXED_SLIP.word && ci === FIXED_SLIP.char) {
        // A wrong key (the cursor stays put), then the right one.
        events.push({ t: Math.round(t), expected: ch, typed: FIXED_SLIP.typed, correct: false, wordIndex: wi });
        t += FIXED_SLIP.fixMs;
      }
      const left = wi === LEFT_SLIP.word && ci === LEFT_SLIP.char;
      events.push({
        t: Math.round(t),
        expected: ch,
        typed: left ? LEFT_SLIP.typed : ch,
        correct: !left,
        wordIndex: wi,
      });
    });
    // The space between words; a long one before the pause word.
    const space = wi + 1 === PAUSE_BEFORE_WORD ? PAUSE_SPACE_MS : baseInterval;
    t += space + (rand() - 0.5) * 60;
  });

  const totalChars = events.length;
  const correctChars = events.filter((e) => e.correct).length;
  const accuracy = (correctChars / Math.max(1, totalChars)) * 100;
  const elapsedMs = Math.max(1000, Math.round(t));
  const seconds = Math.max(2, Math.round(elapsedMs / 1000));

  // A believable per-second curve: cold start, mid-test peak, recovery.
  const peakSec = Math.floor(seconds * 0.55);
  const wpmHistory: WpmSample[] = [];
  for (let s = 1; s <= seconds; s++) {
    const fromPeak = Math.abs(s - peakSec) / Math.max(1, peakSec);
    const base = 70 - fromPeak * 22; // peaks about 70, floors about 48
    const noise = (rand() - 0.5) * 6;
    const wpm = Math.max(20, Math.round(base + noise));
    const raw = wpm + 4 + Math.round(rand() * 4);
    wpmHistory.push({ t: s * 1000, wpm, raw });
  }
  const avg = wpmHistory.reduce((sum, s) => sum + s.wpm, 0) / Math.max(1, wpmHistory.length);
  return { events, wpmHistory, elapsedMs, wpm: Math.round(avg), raw: Math.round(avg) + 4, accuracy };
}

/** A partway-through run: `finishedWords` words done, the active word
 *  partly typed, and an optional error word. The real <Passage> reads
 *  these fields, so the preview mounts the real visual chain. */
export function buildState({
  words,
  finishedWords,
  cursorChar,
  errorWord,
  phase,
  events,
  activeWordTyped,
  now = Date.now(),
}: {
  words: readonly string[];
  finishedWords: number;
  cursorChar: number;
  errorWord?: number;
  phase: Exclude<Phase, "done">;
  events: readonly KeyEvent[];
  /** The active word's typed text (the Mistakes preview's wrong and
   *  extra letters); the caret then sits after it. */
  activeWordTyped?: string;
  now?: number;
}): State {
  const typed: string[] = [];
  let totalChars = 0;
  let correctChars = 0;
  for (let i = 0; i < finishedWords; i++) {
    const w = words[i] ?? "";
    typed.push(w);
    totalChars += w.length;
    correctChars += w.length;
  }
  const activeWord = words[finishedWords] ?? "";
  const activeTyped = activeWordTyped ?? activeWord.slice(0, cursorChar);
  typed.push(activeTyped);
  totalChars += activeTyped.length;
  for (let i = 0; i < activeTyped.length; i++) {
    if (activeTyped[i] === activeWord[i]) correctChars += 1;
  }

  const errorWords = new Set<number>();
  if (errorWord !== undefined) {
    errorWords.add(errorWord);
    if (errorWord < finishedWords) {
      const target = words[errorWord] ?? "";
      if (target.length > 0) typed[errorWord] = target.slice(0, -1) + "x";
    }
  }

  return {
    ...base(words, phase),
    cursorWord: finishedWords,
    cursorChar,
    errorWords,
    totalChars,
    correctChars,
    // The running readouts expect a run about 12 s in.
    startTime: now - 12_000,
    endTime: null,
    events: [...events],
    typed,
  };
}

/** The finished sample run on one clock: `typed` rebuilt from the
 *  events (a fixed slip leaves only its correction, a left slip stays
 *  wrong), every word committed, and `endTime − startTime` equal to the
 *  run's length. Its speed, raw and accuracy are the figures a submit
 *  would compute, and the decorative curve is levelled to that speed,
 *  so the hero, the chart and the analysis's flow speed agree. `source`
 *  is the fixed analysis source the preview supplies (spec-50 §6.4): an
 *  empty run context, so the viewer's own settings never change it. */
export function buildDoneRun(
  words: readonly string[],
  now = Date.now(),
): { state: State; sample: SampleRun; source: RunAnalysisSource | null } {
  const curve = buildSampleRun(words);
  const typed = words.map(() => "");
  // A wrong key the next event re-types at the same position was fixed.
  curve.events.forEach((e, i) => {
    const next = curve.events[i + 1];
    const fixed = !e.correct && next !== undefined && next.wordIndex === e.wordIndex && next.expected === e.expected;
    if (!fixed && typed[e.wordIndex] !== undefined) typed[e.wordIndex] += e.typed;
  });
  const errorWords = new Set<number>();
  let totalChars = 0;
  let correctChars = 0;
  typed.forEach((t, i) => {
    const target = words[i] ?? "";
    if (t !== target) errorWords.add(i);
    totalChars += t.length;
    for (let c = 0; c < t.length; c++) if (t[c] === target[c]) correctChars += 1;
  });
  const state: State = {
    ...base(words, "done"),
    cursorWord: words.length,
    cursorChar: 0,
    errorWords,
    totalChars,
    correctChars,
    startTime: now - curve.elapsedMs,
    endTime: now,
    events: curve.events,
    typed,
  };
  const { wpm, raw } = calcWpmAndRaw(typed, state.words, curve.elapsedMs, true, curve.events.length);
  const scale = curve.wpm > 0 ? wpm / curve.wpm : 1;
  const wpmHistory = curve.wpmHistory.map((h) => {
    const level = Math.max(1, Math.round(h.wpm * scale));
    return { t: h.t, wpm: level, raw: level + (h.raw - h.wpm) };
  });
  const sample: SampleRun = { ...curve, wpmHistory, wpm, raw, accuracy: keystrokeAccuracy(curve.events) };
  const input = stateToRunInput(state, {}, wpm);
  const source = input ? { input, bucket: `casual|words|${words.length}`, fixMode: "fix" as const, startedAt: now - curve.elapsedMs } : null;
  return { state, sample, source };
}

function base(words: readonly string[], phase: Phase) {
  return { mode: "WORDS" as const, length: words.length as State["length"], adapt: false, phase, words: [...words], quoteSource: null };
}
