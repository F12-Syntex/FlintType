import type { KeyEvent, Phase, State } from "@/app/_components/practice-reducer";
import type { LiveScreen } from "@/types/live";

type CloneScreen = Pick<
  LiveScreen,
  "phase" | "typed" | "cursorWord" | "cursorChar" | "mode" | "length" | "adapt" | "elapsedMs" | "events" | "quoteSource"
>;

/** The clone's word cursor. A done TIME frame keeps the broadcaster's
 *  (rebased) cursor: `words` there is the refill buffer, so the words
 *  past the cursor were never shown, and the cursor is what their own
 *  result screen and submit read (Run details, `reachedWords`). A done
 *  WORDS or QUOTE frame sits past the last word, as before. */
export function cloneCursorWord(phase: Phase, mode: string, cursorWord: number, wordCount: number): number {
  const cursor = Math.min(Math.max(0, cursorWord), wordCount);
  return phase === "done" && mode !== "TIME" ? wordCount : cursor;
}

/** The frozen practice state the clone's real components read, rebuilt
 *  from one live snapshot. `now` is the one clock read, so a done run's
 *  length is exactly `elapsedMs`. Pure. */
export function cloneState(words: readonly string[], screen: CloneScreen, now: number): State {
  const typed = screen.typed;
  const phase = (screen.phase as Phase) ?? "running";
  const cursorWord = cloneCursorWord(phase, screen.mode, screen.cursorWord, words.length);
  const errorWords = new Set<number>();
  let totalChars = 0;
  let correctChars = 0;
  for (let i = 0; i < typed.length; i++) {
    const t = typed[i] ?? "";
    const w = words[i] ?? "";
    for (let c = 0; c < t.length; c++) {
      totalChars += 1;
      if (t[c] === w[c]) correctChars += 1;
    }
    if (i < cursorWord && t !== w) errorWords.add(i);
  }
  return {
    mode: screen.mode as State["mode"],
    length: screen.length as State["length"],
    adapt: screen.adapt ?? false,
    phase,
    words: [...words],
    cursorWord,
    cursorChar: phase === "done" ? 0 : screen.cursorChar,
    errorWords,
    totalChars,
    correctChars,
    startTime: now - screen.elapsedMs,
    endTime: phase === "done" ? now : null,
    events: (screen.events ?? []) as KeyEvent[],
    typed: [...typed],
    quoteSource: screen.quoteSource,
  };
}
