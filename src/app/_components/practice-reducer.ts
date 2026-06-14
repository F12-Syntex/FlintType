import englishWords from "@/data/english.json";
import { type BehaviourPrefs, DEFAULT_BEHAVIOUR } from "@/lib/behaviour-prefs";

/** Pure practice-test types + reducer + word-list helpers — extracted
 *  out of `practice-state.tsx` so the React-side Provider/hooks stay
 *  in the `.tsx` and everything testable lives here. The reducer is
 *  unit-tested in `practice-state.test.ts`. Per docs/ui-law.md §1.3
 *  the test exception, pure reducers next to their `.tsx` Provider
 *  *are* part of the automated suite. */

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
 *  Backspaces and spaces are not recorded — only printable character
 *  attempts inside a word. */
export type KeyEvent = {
  t: number;
  expected: string;
  typed: string;
  correct: boolean;
  wordIndex: number;
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

export type WordCfg = Pick<BehaviourPrefs, "minWordLength" | "showSecondary"> & {
  /** Optional override for the word pool. When provided, generation
   *  draws from this list instead of the embedded English-200. The
   *  practice provider hands the user's currently-loaded MonkeyType
   *  wordlist in via this field; absence (or empty) falls back to
   *  the embedded set. */
  wordPool?: readonly string[];
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
    }
  | { type: "BACKSPACE" }
  | { type: "BACKSPACE_WORD" }
  | { type: "SPACE"; now: number; strictSpace: boolean }
  | { type: "RESTART"; words: string[]; quoteSource: string | null }
  | { type: "REGENERATE"; cfg: WordCfg }
  | { type: "FINISH_TIME"; now: number }
  /** TIME-mode buffer top-up. The provider dispatches this from a
   *  refill effect whenever the cursor nears the end of the generated
   *  passage, so a fast typist always has a deep buffer of upcoming
   *  words ahead of them. Pure append — never touches cursor / run
   *  state. */
  | { type: "APPEND_WORDS"; words: string[] }
  /** Burst-mode mid-run retry. The burst controller dispatches this
   *  on every failed attempt (wrong word OR below threshold WPM) and
   *  on every successful-but-rep-incomplete attempt: clears the
   *  user's typed buffer for the current word, drops cursorChar to
   *  0, leaves cursorWord put so they re-attempt the same item.
   *  Does not mark errorWords — burst retries aren't typing mistakes,
   *  they're rep regressions. */
  | { type: "BURST_RESET" };

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
  // Casual mode has no length-skew preference — just respect the user's
  // minimum-word-length floor. Adaptive mode picks purely on bigram
  // weakness data, no length skew.
  //
  // `cfg.wordPool` (set by the practice provider after a wordlist
  // fetch resolves) overrides the embedded English-200 default.
  const pool: readonly string[] =
    cfg.wordPool && cfg.wordPool.length > 0 ? cfg.wordPool : WORD_POOL;
  const list = pool.filter((w) => w.length >= cfg.minWordLength);
  return list.length > 0 ? list : pool;
}

export function generateWords(
  count: number,
  seed: number,
  cfg: WordCfg = DEFAULT_BEHAVIOUR,
): string[] {
  const list = filteredList(cfg);
  const rand = seededRandom(seed);
  // Reject back-to-back duplicates — re-roll up to a few times per slot
  // before giving up. With a single-word pool the user has nothing to
  // do but see the same word; we don't infinite-loop on that.
  const base: string[] = [];
  let prev = "";
  for (let i = 0; i < count; i++) {
    let pick = list[Math.floor(rand() * list.length)]!;
    for (let tries = 0; tries < 4 && pick === prev && list.length > 1; tries++) {
      pick = list[Math.floor(rand() * list.length)]!;
    }
    base.push(pick);
    prev = pick;
  }
  return decorate(base, cfg, seed + 1);
}

/** Mix in numbers / trailing punctuation when `showSecondary` is on.
 *  Pulled out so adaptive selections (where the word list is sourced
 *  from the algorithm rather than a local RNG) get the same
 *  decoration the user expects from their behaviour prefs. */
export function decorate(
  words: readonly string[],
  cfg: WordCfg,
  seed: number,
): string[] {
  if (!cfg.showSecondary) return [...words];
  const rand = seededRandom(seed);
  return words.map((w) => {
    const r = rand();
    if (r < 0.08) return Math.floor(rand() * 1000).toString();
    if (r < 0.22) return w + PUNCTUATION[Math.floor(rand() * PUNCTUATION.length)];
    return w;
  });
}

/** The pool the adapt route scores against. Same shape filter as the
 *  local generator, exposed so the bridge can pass it as the candidate
 *  set without re-reading prefs in two places. */
export function adaptPool(cfg: WordCfg): readonly string[] {
  return filteredList(cfg);
}

/** TIME mode generates a long buffer up front so even fast typists never
 *  run out before the timer expires. 300 words at 200 wpm ≈ 90 s of
 *  typing, which covers every supported duration with margin. */
export const TIME_BUFFER = 300;

/** TIME mode tops the buffer up while the cursor is still this many
 *  words from the end. Generous on purpose: it must comfortably exceed
 *  the most words the visible window can ever show, so the passage
 *  ahead of the cursor is never starved — even a 250 wpm typist has
 *  ~30 s of runway before the next refill is needed. The append fires
 *  once per crossing (it pushes the remaining count far back above the
 *  threshold), so there's no per-keystroke churn. */
export const TIME_REFILL_AHEAD = 120;

export function generateForMode(
  mode: Mode,
  length: Length,
  cfg: WordCfg,
): string[] {
  if (mode === "TIME") return generateWords(TIME_BUFFER, Date.now(), cfg);
  if (mode === "WORDS") return generateWords(length, Date.now(), cfg);
  if (mode === "BURST") {
    // BURST is "type N words at threshold WPM, one at a time" — the
    // burst engine reads `state.words` directly as its item list.
    // No `decorate` pass: numbers + punctuation are noisy when each
    // item has to clear a WPM threshold on its own.
    return generateWords(length, Date.now(), { ...cfg, showSecondary: false });
  }
  // QUOTE — words come from an async fetch; placeholder until SET_QUOTE.
  return [];
}

export function quoteToWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

// ─── Initial state ──────────────────────────────────────────────────

const INITIAL_LENGTH: Length = 25;

/** Per-mode default for `length` when the user switches modes. */
export function defaultLengthFor(mode: Mode): Length {
  if (mode === "TIME") return 30;
  if (mode === "QUOTE") return 1; // medium
  if (mode === "BURST") return 40;
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

/** Whether a word's current typed buffer is "wrong" for the red
 *  underline: it has a character that mismatches the target in the
 *  overlap, or it runs past the target (extras). An incomplete but
 *  correct prefix is NOT wrong here — it only gets flagged when the
 *  user skips past it with SPACE. Used to clear/keep the error flag as
 *  the buffer is edited, so correcting a mistake (via plain Backspace,
 *  not just Ctrl+Backspace) clears the underline. */
function wordErrored(typedWord: string, target: string): boolean {
  if (typedWord.length > target.length) return true;
  for (let i = 0; i < typedWord.length; i += 1) {
    if (typedWord[i] !== target[i]) return true;
  }
  return false;
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
    case "TYPE_CHAR": {
      if (s.phase === "done") return s;
      const word = s.words[s.cursorWord];
      if (!word) return s;
      // Cap extras at word.length + EXTRA_CAP so a stuck key can't blow up
      // the layout. Past the cap, the keystroke is a no-op.
      const EXTRA_CAP = 10;
      if (s.cursorChar >= word.length + EXTRA_CAP) return s;
      const isExtra = s.cursorChar >= word.length;
      // allowExtras=false → silently drop characters typed past the
      // word's length. The cursor stays put, no event recorded — the
      // user has to press space to advance or backspace to retry.
      if (isExtra && !a.allowExtras) return s;
      const expected = isExtra ? "" : word[s.cursorChar]!;
      const correct = !isExtra && a.char === expected;
      const startTime = s.startTime ?? a.now;
      const event: KeyEvent = {
        t: a.now - startTime,
        expected,
        typed: a.char,
        correct,
        wordIndex: s.cursorWord,
      };

      if (!correct && a.stopOnError) {
        // stop-on-error blocks the wrong char from being entered; typed
        // doesn't grow, cursor doesn't advance. The buffer therefore
        // stays a correct prefix, so DON'T flag the word in errorWords:
        // the red underline is buffer-based everywhere else, and flagging
        // it here left a perfectly-typed word underlined for the rest of
        // the run with no path to clear it (BACKSPACE never fires on a
        // correct prefix; SPACE never deletes) — FT-034. The blocked
        // attempt is still recorded as an event for stats / replay, and
        // `...s` preserves any flag a genuinely-incomplete word already
        // carries.
        return {
          ...s,
          phase: s.phase === "rest" ? "running" : s.phase,
          startTime,
          totalChars: s.totalChars + 1,
          events: [...s.events, event],
        };
      }

      const nextTyped = pushTyped(s.typed, s.cursorWord, a.char);
      const nextCursorChar = s.cursorChar + 1;
      // Auto-finish: a correct keystroke that completes the final char of
      // the final word ends the run for WORDS / QUOTE — TIME ignores the
      // word boundary and lets the timer end the run instead. Extras past
      // word.length never auto-finish: the user must backspace the extras
      // and hit space (or land exactly on word.length) to advance.
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
        // ^ extras are never `correct`, so they correctly flag errorWords too.
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
      // Re-evaluate the current word's error flag after the delete:
      // if the buffer no longer has a wrong character, clear the red
      // underline — so plain Backspace clears a corrected mistake just
      // like Ctrl+Backspace does (previously only the latter did).
      const nextTyped = popTyped(s.typed, s.cursorWord);
      const nextErrors = new Set(s.errorWords);
      if (wordErrored(nextTyped[s.cursorWord] ?? "", s.words[s.cursorWord] ?? "")) {
        nextErrors.add(s.cursorWord);
      } else {
        nextErrors.delete(s.cursorWord);
      }
      return {
        ...s,
        cursorChar: s.cursorChar - 1,
        typed: nextTyped,
        errorWords: nextErrors,
      };
    }
    case "BACKSPACE_WORD": {
      // Ctrl/Alt/⌥+Backspace — wipe the current word's typed buffer
      // in one keystroke. Standard text-editor semantics: when the
      // cursor sits at column 0, jump back into the previous word
      // and wipe it too. Unlike plain BACKSPACE (which only crosses
      // the word boundary when the previous word has errors), word-
      // wise delete is the user's explicit "I want to redo the
      // previous word" gesture, so it crosses unconditionally.
      if (s.phase === "done") return s;
      if (s.cursorChar === 0) {
        if (s.cursorWord === 0 || !s.errorWords.has(s.cursorWord - 1))
          return s;
        const next = [...s.typed];
        next[s.cursorWord - 1] = "";
        // Re-clear the error flag if we just wiped that word's typed
        // buffer — there's nothing left for the user to "fix" there.
        const nextErrors = new Set(s.errorWords);
        nextErrors.delete(s.cursorWord - 1);
        return {
          ...s,
          cursorWord: s.cursorWord - 1,
          cursorChar: 0,
          typed: next,
          errorWords: nextErrors,
        };
      }
      const next = [...s.typed];
      if (s.cursorWord < next.length) next[s.cursorWord] = "";
      const nextErrors = new Set(s.errorWords);
      nextErrors.delete(s.cursorWord);
      return {
        ...s,
        cursorChar: 0,
        typed: next,
        errorWords: nextErrors,
      };
    }
    case "SPACE": {
      if (s.phase === "done" || s.phase === "rest") return s;
      const target = s.words[s.cursorWord] ?? "";
      const typedHere = s.typed[s.cursorWord] ?? "";
      // strictSpace=true → refuse to advance unless the word is fully
      // typed correctly. The user must finish or backspace; no event,
      // no errorWord mark, the keystroke is a no-op.
      if (a.strictSpace && typedHere !== target) return s;
      // Space always advances the cursor — the user explicitly asked
      // to skip past mistakes. If the typed word doesn't match the
      // target, mark it as an error word so the summary still
      // accounts for it (and it underlines in the passage).
      const wordHasError = typedHere !== target;
      const errorWords = wordHasError
        ? new Set([...s.errorWords, s.cursorWord])
        : s.errorWords;
      const next = s.cursorWord + 1;
      // Make sure typed has an entry for the just-completed word (the
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
            errorWords,
          };
        }
        return {
          ...s,
          phase: "done",
          endTime: a.now,
          typed: sealedTyped,
          errorWords,
        };
      }
      return {
        ...s,
        cursorWord: next,
        cursorChar: 0,
        typed: sealedTyped,
        errorWords,
      };
    }
    default:
      return s;
  }
}
