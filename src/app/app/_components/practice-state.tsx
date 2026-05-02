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
import englishWords from "@/data/english.json";

// ─── Types ──────────────────────────────────────────────────────────

export type Mode = "WORDS" | "TIME" | "QUOTE";
/** Numeric value whose meaning depends on `mode`:
 *    WORDS — words to type (25 / 50 / 100 / 200)
 *    TIME  — seconds to type for (15 / 30 / 60 / 120)
 *    QUOTE — group index 0–3 (short / medium / long / thicc) */
export type Length = number;
export type Phase = "rest" | "running" | "done";

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
  };
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
      const expected = word[s.cursorChar];
      const correct = a.char === expected;
      // Stop-on-error: count the attempt + flag the word, but don't
      // advance the cursor until the user types the expected character.
      if (!correct && a.stopOnError) {
        return {
          ...s,
          phase: s.phase === "rest" ? "running" : s.phase,
          startTime: s.startTime ?? a.now,
          totalChars: s.totalChars + 1,
          errorWords: new Set([...s.errorWords, s.cursorWord]),
        };
      }
      return {
        ...s,
        phase: s.phase === "rest" ? "running" : s.phase,
        startTime: s.startTime ?? a.now,
        cursorChar: s.cursorChar + 1,
        totalChars: s.totalChars + 1,
        correctChars: s.correctChars + (correct ? 1 : 0),
        errorWords: correct
          ? s.errorWords
          : new Set([...s.errorWords, s.cursorWord]),
      };
    }
    case "BACKSPACE": {
      if (s.phase === "done") return s;
      if (s.cursorChar === 0) {
        // Walk back one word if possible (only into words that had errors).
        if (s.cursorWord === 0 || !s.errorWords.has(s.cursorWord - 1))
          return s;
        const prev = s.words[s.cursorWord - 1]!;
        return { ...s, cursorWord: s.cursorWord - 1, cursorChar: prev.length };
      }
      return { ...s, cursorChar: s.cursorChar - 1 };
    }
    case "SPACE": {
      if (s.phase === "done" || s.phase === "rest") return s;
      const next = s.cursorWord + 1;
      if (next >= s.words.length) {
        // TIME mode finishes on the timer, not when words run out — top
        // up the buffer with another batch so fast typists don't stall.
        if (s.mode === "TIME") {
          const more = generateWords(TIME_BUFFER, Date.now());
          return {
            ...s,
            words: [...s.words, ...more],
            cursorWord: next,
            cursorChar: 0,
          };
        }
        return { ...s, phase: "done", endTime: a.now };
      }
      return {
        ...s,
        cursorWord: next,
        cursorChar: 0,
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
  accuracy: number;
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
    const minutes = elapsedMs / 60_000;
    const wpm =
      minutes > 0 ? Math.round(state.correctChars / 5 / minutes) : 0;
    const accuracy =
      state.totalChars > 0
        ? Math.round((state.correctChars / state.totalChars) * 1000) / 10
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
      accuracy,
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
  }, [state, elapsedMs]);

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
