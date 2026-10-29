import { captureChar, recordEdit, recordSpace } from "./practice-capture";
import type {
  BackspaceAction,
  SpaceAction,
  State,
  TypeCharAction,
} from "./practice-reducer";
import { generateWords, TIME_BUFFER } from "./practice-words";

/** The reducer's four key branches (TYPE_CHAR, BACKSPACE, BACKSPACE_WORD,
 *  SPACE) as pure functions, split out of `practice-reducer.ts`. Each
 *  records its capture v2 mark through `practice-capture.ts` only when
 *  the key changed the run. */

/** Cap extras at word.length + EXTRA_CAP so a stuck key can't blow up
 *  the layout. Past the cap, the keystroke is a no-op. */
const EXTRA_CAP = 10;

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

export function typeChar(s: State, a: TypeCharAction): State {
  if (s.phase === "done") return s;
  const word = s.words[s.cursorWord];
  if (!word) return s;
  if (s.cursorChar >= word.length + EXTRA_CAP) return s;
  const isExtra = s.cursorChar >= word.length;
  // allowExtras=false → silently drop characters typed past the
  // word's length. The cursor stays put, no event recorded — the
  // user has to press space to advance or backspace to retry.
  if (isExtra && !a.allowExtras) return s;
  const expected = isExtra ? "" : word[s.cursorChar]!;
  const correct = !isExtra && a.char === expected;
  const startTime = s.startTime ?? a.now;
  const { event, capture } = captureChar(s, a, {
    t: a.now - startTime,
    expected,
    typed: a.char,
    correct,
    wordIndex: s.cursorWord,
  });

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
      ...capture,
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
  // word boundary and lets the timer end the run instead. BURST is
  // also excluded: a burst item only commits via SPACE *after*
  // BurstProvider's threshold + reps gate passes (#46), so finishing
  // on the final char here would bypass that gate (and grant drill XP
  // for an under-threshold / single-rep run). The run instead ends on
  // the SPACE branch below when the gate lets the final item through.
  // Extras past word.length never auto-finish: the user must backspace
  // the extras and hit space (or land exactly on word.length) to advance.
  const isLastWord = s.cursorWord === s.words.length - 1;
  const finishedRun =
    correct &&
    s.mode !== "TIME" &&
    s.mode !== "BURST" &&
    isLastWord &&
    nextCursorChar === word.length;

  return {
    ...s,
    ...capture,
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

function applyBackspace(s: State): State {
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

export function backspace(s: State, a: BackspaceAction): State {
  return recordEdit(s, applyBackspace(s), a, "back");
}

// Ctrl/Alt/⌥+Backspace — wipe the current word's typed buffer
// in one keystroke. Standard text-editor semantics: when the
// cursor sits at column 0, jump back into the previous word
// and wipe it too. Unlike plain BACKSPACE (which only crosses
// the word boundary when the previous word has errors), word-
// wise delete is the user's explicit "I want to redo the
// previous word" gesture, so it crosses unconditionally.
function applyBackspaceWord(s: State): State {
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

export function backspaceWord(s: State, a: BackspaceAction): State {
  return recordEdit(s, applyBackspaceWord(s), a, "backWord");
}

function applySpace(s: State, a: SpaceAction): State {
  if (s.phase === "done") return s;
  const target = s.words[s.cursorWord] ?? "";
  const typedHere = s.typed[s.cursorWord] ?? "";
  // strictSpace=true → refuse to advance unless the word is fully
  // typed correctly. The user must finish or backspace; no event,
  // no errorWord mark, the keystroke is a no-op. (At rest this also
  // means a bare space never starts a strict run.)
  //
  // Exception: when backspace is fully locked (confidence="all") the
  // user has NO correction path — strictSpace would deadlock the run
  // after one wrong char. So strictSpace yields and Space advances
  // (the word is marked errored below as usual).
  if (a.strictSpace && !a.backspaceLocked && typedHere !== target) return s;
  // Space as the very first key starts the run and skips word 0 —
  // the first word behaves exactly like every later word (issue
  // #17a). strictSpace above still blocks it, same as mid-run.
  const startTime = s.startTime ?? a.now;
  const runningPhase = s.phase === "rest" ? "running" : s.phase;
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
        phase: runningPhase,
        startTime,
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
      startTime,
      endTime: a.now,
      typed: sealedTyped,
      errorWords,
    };
  }
  return {
    ...s,
    phase: runningPhase,
    startTime,
    cursorWord: next,
    cursorChar: 0,
    typed: sealedTyped,
    errorWords,
  };
}

export function space(s: State, a: SpaceAction): State {
  return recordSpace(s, applySpace(s, a), a);
}
