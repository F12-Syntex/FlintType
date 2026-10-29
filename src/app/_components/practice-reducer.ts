import type { EditTiming, SpaceTiming } from "@/types/capture";
import { freshCapture, shiftCapture } from "./practice-capture";
import { backspace, backspaceWord, space, typeChar } from "./practice-keys";
import { generateForMode, generateWords, INITIAL_LENGTH, type WordCfg } from "./practice-words";

/** Pure practice-test types + reducer — extracted out of
 *  `practice-state.tsx` so the React-side Provider/hooks stay in the
 *  `.tsx` and everything testable lives here. The four key branches
 *  live in `practice-keys.ts` (with the capture v2 recording in
 *  `practice-capture.ts`) and the word-list helpers in
 *  `practice-words.ts`. The reducer is unit-tested in
 *  `practice-reducer.test.ts` and `practice-reducer-capture.test.ts`.
 *  Per docs/ui-law.md §1.3 the test exception, pure reducers next to
 *  their `.tsx` Provider *are* part of the automated suite. */

// ─── Types ──────────────────────────────────────────────────────────

export type WpmSample = { t: number; wpm: number; raw: number };

export type Mode = "WORDS" | "TIME" | "QUOTE" | "BURST";

/** Numeric value whose meaning depends on `mode`:
 *    WORDS — words to type (25 / 50 / 100 / 200)
 *    TIME  — seconds to type for (15 / 30 / 60 / 120)
 *    QUOTE — group index 0–3 (short / medium / long / thicc) */
export type Length = number;

export type Phase = "rest" | "running" | "done";

/** One keystroke event captured for the run-summary. `t` is ms since the
 *  run started; `expected` is the char we expected ("" if past word end);
 *  `typed` is what the user pressed; `wordIndex` is the index of the
 *  word the cursor was on at the time of the keystroke (the adapt
 *  pipeline uses it to detect bigrams that span a word boundary).
 *  Only printable character attempts are events; backspaces and spaces
 *  are recorded separately as `edits` and `spaces` (capture v2). */
export type KeyEvent = {
  t: number;
  expected: string;
  typed: string;
  correct: boolean;
  wordIndex: number;
  /** cursorChar before this key (v2). Optional: hand-built States (clone, preview, tests) omit it. */
  pos?: number;
  /** Present only for soft-keyboard / IME text, and for a keydown with no key code (an iOS on-screen key). */
  src?: "input";
  /** ms since htOrigin, from KeyboardEvent/InputEvent.timeStamp, 1 dp (v2). */
  ht?: number;
};
/** The wire types, so the State and the submit payload can never drift. */
export type EditEvent = EditTiming;
export type SpaceEvent = SpaceTiming;

export type State = {
  // config
  mode: Mode;
  length: Length;
  adapt: boolean;

  // run
  phase: Phase;
  words: string[];
  cursorWord: number;
  cursorChar: number;
  errorWords: Set<number>;
  totalChars: number; // for accuracy
  correctChars: number;
  startTime: number | null;
  endTime: number | null;
  events: KeyEvent[];
  /** Per-word typed input — `typed[i]` is exactly what the user has
   *  entered for `words[i]` (excluding the trailing space).  This is the
   *  source of truth monkeytype uses when computing WPM at the end of a
   *  run, so we maintain it on every TYPE_CHAR / BACKSPACE / SPACE. */
  typed: string[];
  /** Source label for QUOTE mode — shown under the passage. */
  quoteSource: string | null;

  /** Capture v2. Optional so hand-built States elsewhere stay valid. */
  edits?: EditEvent[];
  spaces?: SpaceEvent[];
  /** timeStamp of the run's first recorded key (char or space); ht is relative to it. */
  htOrigin?: number | null;
  /** [letter keydowns a–z, of which KeyboardEvent.code === "Key" + the letter].
   *  One aggregate per run, never per-key codes; it decides whether QWERTY
   *  gap classes apply (spec-10 §4.1). The on-screen keyboard's layout
   *  setting is a display preference and is not used. */
  layoutHits?: [letters: number, matches: number];
  /** True once an edit or space was dropped at the cap; the run is then analysed as v1. */
  capped?: boolean;
};

export type Action =
  | { type: "SET_MODE"; mode: Mode; length: Length; words: string[]; quoteSource: string | null }
  | { type: "SET_LENGTH"; length: Length; words: string[]; quoteSource: string | null }
  | { type: "SET_QUOTE"; words: string[]; source: string }
  | { type: "TOGGLE_ADAPT" }
  | {
      type: "TYPE_CHAR";
      char: string;
      now: number;
      stopOnError: boolean;
      allowExtras: boolean;
      /** The event's timeStamp (capture v2 `ht`). */
      ht?: number;
      src?: "input";
      /** keydown only, for a–z/A–Z: e.code === "Key" + char.toUpperCase(). Absent for input events. */
      codeOk?: boolean;
    }
  | { type: "BACKSPACE"; now?: number; ht?: number; src?: "input" }
  | { type: "BACKSPACE_WORD"; now?: number; ht?: number; src?: "input" }
  | {
      type: "SPACE";
      now: number;
      strictSpace: boolean;
      backspaceLocked?: boolean;
      ht?: number;
      src?: "input";
    }
  | { type: "RESTART"; words: string[]; quoteSource: string | null }
  | { type: "REGENERATE"; cfg: WordCfg }
  | { type: "FINISH_TIME"; now: number }
  /** TIME-mode buffer top-up. The provider dispatches this from a
   *  refill effect whenever the cursor nears the end of the generated
   *  passage, so a fast typist always has a deep buffer of upcoming
   *  words ahead of them. Pure append — never touches cursor / run
   *  state. */
  | { type: "APPEND_WORDS"; words: string[] }
  /** Pin the run's clock to an outside start instant: the race gun.
   *  Solo practice never dispatches it, so there the first keystroke
   *  still starts the clock. In a race the server times everyone from
   *  the gun, so the race provider anchors the run there and every
   *  client figure (published wpm, recorded result, chart) is measured
   *  on the same window as the result card. Phase is left alone: the
   *  run still turns "running" on the first keystroke, it just times
   *  from `at`. A clock that already started later than `at` moves
   *  back to it (its events shift with it); a later `at` never moves a
   *  started clock forward, and a finished run is left as is. */
  | { type: "ANCHOR_START"; at: number }
  /** Burst-mode mid-run retry. The burst controller dispatches this
   *  on every failed attempt (wrong word OR below threshold WPM) and
   *  on every successful-but-rep-incomplete attempt: clears the
   *  user's typed buffer for the current word, drops cursorChar to
   *  0, leaves cursorWord put so they re-attempt the same item.
   *  Does not mark errorWords — burst retries aren't typing mistakes,
   *  they're rep regressions. */
  | { type: "BURST_RESET" };

export type TypeCharAction = Extract<Action, { type: "TYPE_CHAR" }>;
export type BackspaceAction = Extract<Action, { type: "BACKSPACE" | "BACKSPACE_WORD" }>;
export type SpaceAction = Extract<Action, { type: "SPACE" }>;

// ─── Initial state ──────────────────────────────────────────────────

export const initialState: State = {
  mode: "WORDS",
  length: INITIAL_LENGTH,
  adapt: true,
  phase: "rest",
  // Deterministic seed — same words on SSR + client, no hydration mismatch.
  words: generateWords(INITIAL_LENGTH, 1),
  cursorWord: 0,
  cursorChar: 0,
  errorWords: new Set(),
  totalChars: 0,
  correctChars: 0,
  startTime: null,
  endTime: null,
  events: [],
  typed: [],
  quoteSource: null,
  ...freshCapture(),
};

// ─── Reducer ────────────────────────────────────────────────────────

export function freshRun(
  s: State,
  patch: { words?: string[]; quoteSource?: string | null } = {},
): State {
  return {
    ...s,
    phase: "rest",
    words: patch.words ?? s.words,
    quoteSource:
      patch.quoteSource !== undefined ? patch.quoteSource : s.quoteSource,
    cursorWord: 0,
    cursorChar: 0,
    errorWords: new Set(),
    totalChars: 0,
    correctChars: 0,
    startTime: null,
    endTime: null,
    events: [],
    typed: [],
    ...freshCapture(),
  };
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_MODE":
      return freshRun(
        { ...s, mode: a.mode, length: a.length },
        { words: a.words, quoteSource: a.quoteSource },
      );
    case "SET_LENGTH":
      return freshRun(
        { ...s, length: a.length },
        { words: a.words, quoteSource: a.quoteSource },
      );
    case "SET_QUOTE":
      return freshRun(s, { words: a.words, quoteSource: a.source });
    case "TOGGLE_ADAPT":
      return { ...s, adapt: !s.adapt };
    case "RESTART":
      return freshRun(s, { words: a.words, quoteSource: a.quoteSource });
    case "REGENERATE":
      // QUOTE mode passages aren't randomly generated — leave them alone
      // when the user toggles a behaviour pref.
      if (s.mode === "QUOTE") return s;
      return freshRun(s, {
        words: generateForMode(s.mode, s.length, a.cfg),
      });
    case "FINISH_TIME":
      if (s.phase !== "running") return s;
      return { ...s, phase: "done", endTime: a.now };
    case "APPEND_WORDS":
      // Pure buffer top-up (TIME mode — see the provider's refill
      // effect). No-op on an empty batch so a stray dispatch can't
      // churn the array identity and re-trigger downstream effects.
      if (a.words.length === 0) return s;
      return { ...s, words: [...s.words, ...a.words] };
    case "ANCHOR_START": {
      // Same reference on a no-op so the provider skips the re-render.
      if (s.phase === "done" || s.startTime === a.at) return s;
      if (s.startTime == null) return { ...s, startTime: a.at };
      if (a.at > s.startTime) return s;
      // A keystroke landed before the anchor did: move the clock back
      // to the gun and keep every event's (and mark's) offset relative
      // to it.
      const shift = s.startTime - a.at;
      return {
        ...s,
        startTime: a.at,
        events: s.events.map((e) => ({ ...e, t: e.t + shift })),
        ...shiftCapture(s, shift),
      };
    }
    case "BURST_RESET": {
      // Reset the user's typed buffer for the current word so they
      // can re-attempt it. Don't touch errorWords (burst retries
      // aren't typing mistakes), don't touch totalChars/correctChars
      // (the retry's characters are already counted toward accuracy).
      if (s.phase === "done") return s;
      const cleared = [...s.typed];
      cleared[s.cursorWord] = "";
      return { ...s, cursorChar: 0, typed: cleared };
    }
    case "TYPE_CHAR":
      return typeChar(s, a);
    case "BACKSPACE":
      return backspace(s, a);
    case "BACKSPACE_WORD":
      return backspaceWord(s, a);
    case "SPACE":
      return space(s, a);
    default:
      return s;
  }
}
