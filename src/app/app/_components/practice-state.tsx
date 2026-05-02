"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  type BehaviourPrefs,
  DEFAULT_BEHAVIOUR,
  useBehaviourPrefs,
} from "@/lib/behaviour-prefs";
import { loadQuotes, pickQuote, type QuoteGroup } from "@/lib/quotes";
import { calcWpmAndRaw, countChars } from "@/lib/wpm";
import englishWords from "@/data/english.json";

export type WpmSample = { t: number; wpm: number; raw: number };

// ─── Types ──────────────────────────────────────────────────────────

export type Mode = "WORDS" | "TIME" | "QUOTE";
/** Numeric value whose meaning depends on `mode`:
 *    WORDS — words to type (25 / 50 / 100 / 200)
 *    TIME  — seconds to type for (15 / 30 / 60 / 120)
 *    QUOTE — group index 0–3 (short / medium / long / thicc) */
export type Length = number;
export type Phase = "rest" | "running" | "done";

/** One keystroke event captured for the run-summary. `t` is ms since the
 *  run started; `expected` is the char we expected ("" if past word end);
 *  `typed` is what the user pressed. Backspaces and spaces are not
 *  recorded — only printable character attempts inside a word. */
export type KeyEvent = {
  t: number;
  expected: string;
  typed: string;
  correct: boolean;
};

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
};

type WordCfg = Pick<
  BehaviourPrefs,
  "minWordLength" | "difficulty" | "showSecondary"
>;

type Action =
  | { type: "SET_MODE"; mode: Mode; length: Length; words: string[]; quoteSource: string | null }
  | { type: "SET_LENGTH"; length: Length; words: string[]; quoteSource: string | null }
  | { type: "SET_QUOTE"; words: string[]; source: string }
  | { type: "TOGGLE_ADAPT" }
  | { type: "TYPE_CHAR"; char: string; now: number; stopOnError: boolean }
  | { type: "BACKSPACE" }
  | { type: "SPACE"; now: number }
  | { type: "RESTART"; words: string[]; quoteSource: string | null }
  | { type: "REGENERATE"; cfg: WordCfg }
  | { type: "FINISH_TIME"; now: number };

// ─── Word lists ─────────────────────────────────────────────────────

// Single english word pool — sourced from monkeytype's english.json (top
// ~200 most-frequent words, frequency-ordered). The Lang concept is gone
// from the UI; this is the only WORDS mode source.
const WORD_POOL: readonly string[] = englishWords.words;

// Seeded LCG so SSR & client agree on the initial passage.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const PUNCTUATION = [".", ",", ";", ":", "!", "?"] as const;

function filteredList(cfg: WordCfg): readonly string[] {
  let list: readonly string[] = WORD_POOL;
  list = list.filter((w) => w.length >= cfg.minWordLength);
  if (cfg.difficulty === "easy") list = list.filter((w) => w.length <= 5);
  else if (cfg.difficulty === "expert") list = list.filter((w) => w.length >= 5);
  else if (cfg.difficulty === "master") list = list.filter((w) => w.length >= 7);
  return list.length > 0 ? list : WORD_POOL;
}

function generateWords(
  count: number,
  seed: number,
  cfg: WordCfg = DEFAULT_BEHAVIOUR,
): string[] {
  const list = filteredList(cfg);
  const rand = seededRandom(seed);
  const base = Array.from(
    { length: count },
    () => list[Math.floor(rand() * list.length)]!,
  );
  if (!cfg.showSecondary) return base;
  return base.map((w) => {
    const r = rand();
    if (r < 0.08) return Math.floor(rand() * 1000).toString();
    if (r < 0.22) return w + PUNCTUATION[Math.floor(rand() * PUNCTUATION.length)];
    return w;
  });
}

/** TIME mode generates a long buffer up front so even fast typists never
 *  run out before the timer expires. 300 words at 200 wpm ≈ 90 s of
 *  typing, which covers every supported duration with margin. */
const TIME_BUFFER = 300;

function generateForMode(
  mode: Mode,
  length: Length,
  cfg: WordCfg,
): string[] {
  if (mode === "TIME") return generateWords(TIME_BUFFER, Date.now(), cfg);
  if (mode === "WORDS") return generateWords(length, Date.now(), cfg);
  // QUOTE — words come from an async fetch; placeholder until SET_QUOTE.
  return [];
}

function quoteToWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

// ─── Initial state ──────────────────────────────────────────────────

const INITIAL_LENGTH: Length = 50;

/** Per-mode default for `length` when the user switches modes. */
export function defaultLengthFor(mode: Mode): Length {
  if (mode === "TIME") return 30;
  if (mode === "QUOTE") return 1; // medium
  return INITIAL_LENGTH;
}

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
};

// ─── Reducer ────────────────────────────────────────────────────────

function freshRun(
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
  };
}

/** Append `char` to typed[index], creating empty entries if needed. */
function pushTyped(typed: readonly string[], index: number, char: string): string[] {
  const next = [...typed];
  while (next.length <= index) next.push("");
  next[index] = (next[index] ?? "") + char;
  return next;
}

/** Remove the last char from typed[index]. */
function popTyped(typed: readonly string[], index: number): string[] {
  const next = [...typed];
  if (index < next.length) {
    next[index] = (next[index] ?? "").slice(0, -1);
  }
  return next;
}

function reducer(s: State, a: Action): State {
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
    case "TYPE_CHAR": {
      if (s.phase === "done") return s;
      const word = s.words[s.cursorWord];
      if (!word) return s;
      if (s.cursorChar >= word.length) return s;
      const expected = word[s.cursorChar]!;
      const correct = a.char === expected;
      const startTime = s.startTime ?? a.now;
      const event: KeyEvent = {
        t: a.now - startTime,
        expected,
        typed: a.char,
        correct,
      };

      if (!correct && a.stopOnError) {
        // stop-on-error blocks the wrong char from being entered; typed
        // doesn't grow, cursor doesn't advance.
        return {
          ...s,
          phase: s.phase === "rest" ? "running" : s.phase,
          startTime,
          totalChars: s.totalChars + 1,
          errorWords: new Set([...s.errorWords, s.cursorWord]),
          events: [...s.events, event],
        };
      }

      const nextTyped = pushTyped(s.typed, s.cursorWord, a.char);
      const nextCursorChar = s.cursorChar + 1;
      // Auto-finish: a correct keystroke that completes the final char of
      // the final word ends the run for WORDS / QUOTE — TIME ignores the
      // word boundary and lets the timer end the run instead.
      const isLastWord = s.cursorWord === s.words.length - 1;
      const finishedRun =
        correct &&
        s.mode !== "TIME" &&
        isLastWord &&
        nextCursorChar === word.length;

      return {
        ...s,
        phase: finishedRun ? "done" : s.phase === "rest" ? "running" : s.phase,
        startTime,
        endTime: finishedRun ? a.now : s.endTime,
        cursorChar: nextCursorChar,
        totalChars: s.totalChars + 1,
        correctChars: s.correctChars + (correct ? 1 : 0),
        errorWords: correct
          ? s.errorWords
          : new Set([...s.errorWords, s.cursorWord]),
        events: [...s.events, event],
        typed: nextTyped,
      };
    }
    case "BACKSPACE": {
      if (s.phase === "done") return s;
      if (s.cursorChar === 0) {
        if (s.cursorWord === 0 || !s.errorWords.has(s.cursorWord - 1))
          return s;
        // Cursor lands at the end of whatever the user actually typed
        // for the previous word (could be < target.length if they pressed
        // space early); typed[] keeps that prior input intact so it can
        // be edited.
        const prevTyped = s.typed[s.cursorWord - 1] ?? "";
        return {
          ...s,
          cursorWord: s.cursorWord - 1,
          cursorChar: prevTyped.length,
        };
      }
      return {
        ...s,
        cursorChar: s.cursorChar - 1,
        typed: popTyped(s.typed, s.cursorWord),
      };
    }
    case "SPACE": {
      if (s.phase === "done" || s.phase === "rest") return s;
      const next = s.cursorWord + 1;
      // Make sure typed has an entry for the just-completed word, even
      // if the user pressed space without typing anything (rare, but the
      // monkeytype WPM walk wants every position present).
      const sealedTyped = s.typed.length > s.cursorWord
        ? s.typed
        : pushTyped(s.typed, s.cursorWord, "");
      if (next >= s.words.length) {
        if (s.mode === "TIME") {
          const more = generateWords(TIME_BUFFER, Date.now());
          return {
            ...s,
            words: [...s.words, ...more],
            cursorWord: next,
            cursorChar: 0,
            typed: sealedTyped,
          };
        }
        return {
          ...s,
          phase: "done",
          endTime: a.now,
          typed: sealedTyped,
        };
      }
      return {
        ...s,
        cursorWord: next,
        cursorChar: 0,
        typed: sealedTyped,
      };
    }
    default:
      return s;
  }
}

// ─── Context ────────────────────────────────────────────────────────

type PracticeCtx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  /** Action helpers that auto-bind the current behaviour-prefs cfg
   *  for word generation, kick the async quote fetch when the user
   *  switches into QUOTE mode, and handle per-mode defaults. */
  setMode: (mode: Mode) => void;
  setLength: (length: Length) => void;
  toggleAdapt: () => void;
  restart: () => void;
  elapsedMs: number;
  wpm: number;
  raw: number;
  accuracy: number;
  /** Per-second sample of (wpm, raw, t-since-first-keystroke). Cleared on
   *  every fresh run; populated by an interval while the test is running
   *  so the chart and any history view share the same data. */
  wpmHistory: readonly WpmSample[];
};

const Ctx = createContext<PracticeCtx | null>(null);

export function usePractice(): PracticeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePractice must be used within <PracticeProvider>");
  return ctx;
}

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { prefs } = useBehaviourPrefs();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Regenerate the passage when the word-shape prefs change so the
  // user sees the effect of difficulty / min-word / show-secondary
  // immediately instead of after the next manual restart.
  const wordCfgKey = `${prefs.minWordLength}|${prefs.difficulty}|${prefs.showSecondary}`;
  useEffect(() => {
    dispatch({
      type: "REGENERATE",
      cfg: {
        minWordLength: prefs.minWordLength,
        difficulty: prefs.difficulty,
        showSecondary: prefs.showSecondary,
      },
    });
    // wordCfgKey covers every cfg field that influences the passage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordCfgKey]);

  // Live elapsed (ticks every 100ms while running).
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (state.phase !== "running" || state.startTime == null) {
      if (state.phase === "done" && state.startTime && state.endTime) {
        setElapsedMs(state.endTime - state.startTime);
      } else if (state.phase === "rest") {
        setElapsedMs(0);
      }
      return;
    }
    const id = setInterval(() => {
      setElapsedMs(Date.now() - (state.startTime ?? Date.now()));
    }, 100);
    return () => clearInterval(id);
  }, [state.phase, state.startTime, state.endTime]);

  // Per-second WPM sampling — same approach monkeytype uses to power its
  // chart. We read the latest typed[] / words via a ref so the interval
  // stays mounted across keystrokes (the array changes every key).
  const stateForSampleRef = useRef(state);
  stateForSampleRef.current = state;
  const [wpmHistory, setWpmHistory] = useState<WpmSample[]>([]);
  useEffect(() => {
    if (state.phase === "rest") {
      setWpmHistory([]);
      return;
    }
    if (state.phase !== "running" || state.startTime == null) return;
    const startTime = state.startTime;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const s = stateForSampleRef.current;
      if (s.startTime == null) return;
      const t = Date.now() - startTime;
      const { wpm, raw } = calcWpmAndRaw(s.typed, s.words, t, false);
      setWpmHistory((prev) => [
        ...prev,
        {
          t,
          wpm: Math.round(wpm * 10) / 10,
          raw: Math.round(raw * 10) / 10,
        },
      ]);
    };
    // Schedule the first sample at the next 1s boundary so consecutive
    // samples land on whole-second ticks.
    const firstDelay = Math.max(50, 1000 - (Date.now() - startTime));
    timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 1000);
    }, firstDelay);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.phase, state.startTime]);

  // TIME mode countdown: end the run when the duration elapses. We let
  // setTimeout handle the wake-up so we don't poll Date.now() on every
  // keystroke; the elapsed-tick effect above stays purely cosmetic.
  useEffect(() => {
    if (
      state.mode !== "TIME" ||
      state.phase !== "running" ||
      state.startTime == null
    ) {
      return;
    }
    const remaining =
      state.length * 1000 - (Date.now() - state.startTime);
    const id = setTimeout(() => {
      dispatch({ type: "FINISH_TIME", now: Date.now() });
    }, Math.max(0, remaining));
    return () => clearTimeout(id);
  }, [state.mode, state.phase, state.startTime, state.length]);

  const value = useMemo<PracticeCtx>(() => {
    const isFinal = state.phase === "done";
    const { wpm: rawWpm, raw: rawRaw } = calcWpmAndRaw(
      state.typed,
      state.words,
      elapsedMs,
      isFinal,
    );
    const wpm = Math.round(rawWpm);
    const raw = Math.round(rawRaw);
    // Accuracy uses monkeytype's char counts (correct vs incorrect).
    const counts = countChars(state.typed, state.words, isFinal);
    const correct = counts.allCorrectChars;
    const incorrect = counts.incorrectChars + counts.extraChars;
    const accuracy =
      correct + incorrect > 0
        ? Math.round((correct / (correct + incorrect)) * 1000) / 10
        : 100;
    const buildCfg = (): WordCfg => {
      const p = prefsRef.current;
      return {
        minWordLength: p.minWordLength,
        difficulty: p.difficulty,
        showSecondary: p.showSecondary,
      };
    };
    const loadAndDispatchQuote = async (group: QuoteGroup) => {
      try {
        const all = await loadQuotes();
        const q = pickQuote(all, group);
        dispatch({
          type: "SET_QUOTE",
          words: quoteToWords(q.text),
          source: q.source,
        });
      } catch {
        // Network or parse failure — fall back to a generated passage so
        // the user is never stuck staring at an empty screen.
        dispatch({
          type: "SET_QUOTE",
          words: generateWords(50, Date.now(), buildCfg()),
          source: "(quote unavailable)",
        });
      }
    };
    return {
      state,
      dispatch,
      elapsedMs,
      wpm,
      raw,
      accuracy,
      wpmHistory,
      setMode: (mode) => {
        const length = defaultLengthFor(mode);
        const cfg = buildCfg();
        dispatch({
          type: "SET_MODE",
          mode,
          length,
          words: generateForMode(mode, length, cfg),
          quoteSource: null,
        });
        if (mode === "QUOTE") void loadAndDispatchQuote(length as QuoteGroup);
      },
      setLength: (length) => {
        const cfg = buildCfg();
        dispatch({
          type: "SET_LENGTH",
          length,
          words: generateForMode(state.mode, length, cfg),
          quoteSource: state.mode === "QUOTE" ? null : state.quoteSource,
        });
        if (state.mode === "QUOTE") {
          void loadAndDispatchQuote(length as QuoteGroup);
        }
      },
      toggleAdapt: () => dispatch({ type: "TOGGLE_ADAPT" }),
      restart: () => {
        const cfg = buildCfg();
        if (state.mode === "QUOTE") {
          // Reset the run; new quote arrives when the fetch resolves.
          dispatch({
            type: "RESTART",
            words: [],
            quoteSource: null,
          });
          void loadAndDispatchQuote(state.length as QuoteGroup);
          return;
        }
        dispatch({
          type: "RESTART",
          words: generateForMode(state.mode, state.length, cfg),
          quoteSource: null,
        });
      },
    };
  }, [state, elapsedMs, wpmHistory]);

  // Keyboard listener — only when user isn't typing into another input.
  const stateRef = useRef(state);
  stateRef.current = state;
  const restartRef = useRef(value.restart);
  restartRef.current = value.restart;

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT")
    ) {
      return;
    }

    const s = stateRef.current;
    const p = prefsRef.current;

    if (e.key === "Tab") {
      // Quick restart off → let Tab do its native thing (focus shift).
      if (!p.quickRestart) return;
      e.preventDefault();
      restartRef.current();
      return;
    }
    if (e.key === "Escape") {
      restartRef.current();
      return;
    }
    if (s.phase === "done") return;

    if (e.key === " ") {
      e.preventDefault();
      if (s.phase === "rest") return;
      dispatch({ type: "SPACE", now: Date.now() });
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      // Confidence: off = allow always; word = block jumping past word
      // start; all = block backspace entirely.
      if (p.confidence === "all") return;
      if (p.confidence === "word" && s.cursorChar === 0) return;
      dispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      dispatch({
        type: "TYPE_CHAR",
        char: e.key,
        now: Date.now(),
        stopOnError: p.stopOnError,
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
