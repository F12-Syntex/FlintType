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

// ─── Types ──────────────────────────────────────────────────────────

export type Mode = "WORDS" | "TIME" | "QUOTE" | "CODE";
export type Length = 25 | 50 | 100 | 200;
export type Lang = "EN" | "EN-COMMON" | "PROGRAMMING";
export type Phase = "rest" | "running" | "done";

export type State = {
  // config
  mode: Mode;
  length: Length;
  lang: Lang;
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
};

type WordCfg = Pick<
  BehaviourPrefs,
  "minWordLength" | "difficulty" | "showSecondary"
>;

type Action =
  | { type: "SET_MODE"; mode: Mode; cfg: WordCfg }
  | { type: "SET_LENGTH"; length: Length; cfg: WordCfg }
  | { type: "SET_LANG"; lang: Lang; cfg: WordCfg }
  | { type: "TOGGLE_ADAPT" }
  | { type: "TYPE_CHAR"; char: string; now: number; stopOnError: boolean }
  | { type: "BACKSPACE" }
  | { type: "SPACE"; now: number }
  | { type: "RESTART"; seed?: number; cfg: WordCfg }
  | { type: "REGENERATE"; cfg: WordCfg };

// ─── Word lists ─────────────────────────────────────────────────────

const WORDS: Record<Lang, readonly string[]> = {
  "EN-COMMON": [
    "the", "of", "and", "to", "in", "a", "is", "that", "for", "it",
    "as", "was", "with", "be", "by", "on", "not", "he", "this", "are",
    "or", "his", "from", "at", "which", "but", "have", "an", "had",
    "they", "you", "were", "their", "one", "all", "we", "can", "has",
    "there", "been", "if", "more", "when", "will", "who", "so", "no",
    "would", "only", "other", "into", "than", "its", "two", "these",
    "may", "then", "do", "first", "any", "my", "now", "such", "like",
    "our", "over", "man", "me", "even", "most", "made", "after", "also",
    "did", "many", "before", "must", "well", "back", "through", "years",
  ],
  EN: [
    "ability", "able", "about", "above", "accept", "according", "account",
    "across", "action", "activity", "actually", "address", "administration",
    "affect", "after", "again", "against", "agency", "agent", "ahead",
    "almost", "alone", "along", "already", "although", "always", "among",
    "amount", "analysis", "animal", "another", "answer", "anyone", "anything",
    "appear", "apply", "approach", "area", "argue", "around", "arrive",
    "article", "artist", "ask", "assume", "attack", "attention", "attorney",
    "audience", "author", "authority", "available", "avoid", "away", "baby",
    "back", "bad", "bag", "ball", "bank", "base", "beat", "beautiful",
    "because", "become", "before", "begin", "behavior", "behind", "believe",
    "benefit", "best", "better", "between", "beyond", "billion", "black",
    "blood", "blue", "board", "body", "book", "born", "both", "break",
    "bring", "brother", "budget", "build", "building", "business", "call",
    "camera", "campaign", "candidate", "capital", "card", "care", "career",
    "carry", "case", "catch", "cause", "cell", "center", "central", "century",
  ],
  PROGRAMMING: [
    "function", "return", "const", "let", "var", "if", "else", "for",
    "while", "true", "false", "null", "undefined", "async", "await",
    "import", "export", "default", "class", "extends", "this", "new",
    "public", "private", "static", "void", "int", "string", "boolean",
    "console", "log", "error", "warn", "interface", "type", "enum",
    "throw", "catch", "try", "finally", "break", "continue", "switch",
    "case", "yield", "from", "as", "delete", "typeof", "instanceof",
    "in", "of", "do", "Map", "Set", "Array", "Object", "Promise",
    "then", "fetch", "JSON", "parse", "stringify", "number", "string",
  ],
};

// Seeded LCG so SSR & client agree on the initial passage.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const PUNCTUATION = [".", ",", ";", ":", "!", "?"] as const;

function filteredList(lang: Lang, cfg: WordCfg): readonly string[] {
  let list: readonly string[] = WORDS[lang];
  list = list.filter((w) => w.length >= cfg.minWordLength);
  if (cfg.difficulty === "easy") list = list.filter((w) => w.length <= 5);
  else if (cfg.difficulty === "expert") list = list.filter((w) => w.length >= 5);
  else if (cfg.difficulty === "master") list = list.filter((w) => w.length >= 7);
  return list.length > 0 ? list : WORDS[lang];
}

function generateWords(
  lang: Lang,
  length: number,
  seed: number,
  cfg: WordCfg = DEFAULT_BEHAVIOUR,
): string[] {
  const list = filteredList(lang, cfg);
  const rand = seededRandom(seed);
  const base = Array.from(
    { length },
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

// ─── Initial state ──────────────────────────────────────────────────

const INITIAL_LENGTH: Length = 50;
const INITIAL_LANG: Lang = "EN-COMMON";

export const initialState: State = {
  mode: "WORDS",
  length: INITIAL_LENGTH,
  lang: INITIAL_LANG,
  adapt: true,
  phase: "rest",
  // Deterministic seed — same words on SSR + client, no hydration mismatch.
  words: generateWords(INITIAL_LANG, INITIAL_LENGTH, 1),
  cursorWord: 0,
  cursorChar: 0,
  errorWords: new Set(),
  totalChars: 0,
  correctChars: 0,
  startTime: null,
  endTime: null,
};

// ─── Reducer ────────────────────────────────────────────────────────

function freshRun(s: State, words?: string[]): State {
  return {
    ...s,
    phase: "rest",
    words: words ?? s.words,
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
        { ...s, mode: a.mode },
        generateWords(s.lang, s.length, Date.now(), a.cfg),
      );
    case "SET_LENGTH":
      return freshRun(
        { ...s, length: a.length },
        generateWords(s.lang, a.length, Date.now(), a.cfg),
      );
    case "SET_LANG":
      return freshRun(
        { ...s, lang: a.lang },
        generateWords(a.lang, s.length, Date.now(), a.cfg),
      );
    case "TOGGLE_ADAPT":
      return { ...s, adapt: !s.adapt };
    case "RESTART":
      return freshRun(
        s,
        generateWords(s.lang, s.length, a.seed ?? Date.now(), a.cfg),
      );
    case "REGENERATE":
      return freshRun(
        s,
        generateWords(s.lang, s.length, Date.now(), a.cfg),
      );
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
        return {
          ...s,
          phase: "done",
          endTime: a.now,
        };
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
   *  for word generation. Prefer these over raw dispatch in UI code. */
  setMode: (mode: Mode) => void;
  setLength: (length: Length) => void;
  setLang: (lang: Lang) => void;
  toggleAdapt: () => void;
  restart: (seed?: number) => void;
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
    return {
      state,
      dispatch,
      elapsedMs,
      wpm,
      accuracy,
      setMode: (mode) => dispatch({ type: "SET_MODE", mode, cfg: buildCfg() }),
      setLength: (length) =>
        dispatch({ type: "SET_LENGTH", length, cfg: buildCfg() }),
      setLang: (lang) => dispatch({ type: "SET_LANG", lang, cfg: buildCfg() }),
      toggleAdapt: () => dispatch({ type: "TOGGLE_ADAPT" }),
      restart: (seed) => dispatch({ type: "RESTART", seed, cfg: buildCfg() }),
    };
  }, [state, elapsedMs]);

  // Keyboard listener — only when user isn't typing into another input.
  const stateRef = useRef(state);
  stateRef.current = state;

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
    const cfg: WordCfg = {
      minWordLength: p.minWordLength,
      difficulty: p.difficulty,
      showSecondary: p.showSecondary,
    };

    if (e.key === "Tab") {
      // Quick restart off → let Tab do its native thing (focus shift).
      if (!p.quickRestart) return;
      e.preventDefault();
      dispatch({ type: "RESTART", cfg });
      return;
    }
    if (e.key === "Escape") {
      dispatch({ type: "RESTART", cfg });
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
