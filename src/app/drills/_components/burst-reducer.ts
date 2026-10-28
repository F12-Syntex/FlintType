/** The burst minigame engine. Type each item correctly, then press
 *  space to commit the attempt; a commit at or above the threshold WPM
 *  counts one rep, and `repsPerItem` reps in a row advance to the next
 *  item. A wrong character or a too-slow commit resets the rep count on
 *  the current item. Pure, so it is unit-tested; the surface only feeds
 *  it raw keys. */

export type AttemptOutcome = "win" | "slow" | "wrong";

export type BurstState = {
  itemIdx: number;
  reps: number;
  typed: string;
  attemptStartedAt: number | null;
  lastOutcome: AttemptOutcome | null;
  totalAttempts: number;
  totalWins: number;
  finished: boolean;
  /** The last committed attempt's WPM, shown under the word. */
  lastWpm: number | null;
};

/** What the reducer needs to know about the drill for one key. */
export type BurstConfig = {
  items: readonly string[];
  thresholdWpm: number;
  repsPerItem: number;
};

export type BurstAction =
  /** One typed character (space included) at time `now`. */
  | { type: "KEY"; char: string; now: number; config: BurstConfig }
  | { type: "BACKSPACE" }
  /** Ctrl/Alt/⌘+Backspace: items are short, so "delete word" clears
   *  the whole attempt. */
  | { type: "BACKSPACE_WORD" }
  /** Clears the brief win / slow / miss flash. */
  | { type: "RESET_FLASH" }
  /** Start the whole drill again. */
  | { type: "RESTART" };

export const initialBurstState: BurstState = {
  itemIdx: 0,
  reps: 0,
  typed: "",
  attemptStartedAt: null,
  lastOutcome: null,
  totalAttempts: 0,
  totalWins: 0,
  finished: false,
  lastWpm: null,
};

/** Standard 5-chars-per-word WPM for one attempt, with the duration
 *  floored at 1ms so an absurdly fast first key can't divide by zero. */
export function burstWpm(charCount: number, durationMs: number): number {
  return (charCount / 5) * (60_000 / Math.max(1, durationMs));
}

/** The item the user is on, or "" once the drill is finished. */
export function currentItem(state: BurstState, config: BurstConfig): string {
  return config.items[state.itemIdx] ?? "";
}

/** The whole item is typed correctly and waiting for space to commit. */
export function isReady(state: BurstState, target: string): boolean {
  return (
    target.length > 0 &&
    state.typed === target &&
    state.attemptStartedAt != null &&
    state.lastOutcome == null
  );
}

export function burstAccuracy(state: BurstState): number {
  return state.totalAttempts > 0
    ? Math.round((state.totalWins / state.totalAttempts) * 100)
    : 100;
}

export function burstReducer(state: BurstState, action: BurstAction): BurstState {
  switch (action.type) {
    case "RESTART":
      return initialBurstState;
    case "RESET_FLASH":
      return { ...state, lastOutcome: null };
    case "BACKSPACE":
      if (state.typed.length === 0) return state;
      return { ...state, typed: state.typed.slice(0, -1) };
    case "BACKSPACE_WORD":
      if (state.typed.length === 0) return state;
      return { ...state, typed: "", attemptStartedAt: null };
    case "KEY": {
      if (state.finished) return state;
      const target = currentItem(state, action.config);
      if (action.char === " ") {
        // Space commits a fully typed item. Any earlier space is part
        // of the item only on pangrams (whose target has spaces);
        // otherwise it's a stray thumb tap and is ignored rather than
        // costing the streak.
        if (state.typed === target && state.attemptStartedAt != null) {
          return commit(state, action.now, target, action.config);
        }
        if (!target.slice(state.typed.length).startsWith(" ")) return state;
      }
      return typeChar(state, action.char, action.now, target);
    }
  }
}

function typeChar(
  state: BurstState,
  char: string,
  now: number,
  target: string,
): BurstState {
  const nextTyped = state.typed + char;
  const expected = target[nextTyped.length - 1];
  // A mismatch, or any key past the end of the item, is a miss.
  if (expected === undefined || char !== expected) {
    return {
      ...state,
      typed: "",
      attemptStartedAt: null,
      reps: 0,
      lastOutcome: "wrong",
      totalAttempts: state.totalAttempts + 1,
    };
  }
  return {
    ...state,
    typed: nextTyped,
    attemptStartedAt: state.attemptStartedAt ?? now,
  };
}

function commit(
  state: BurstState,
  now: number,
  target: string,
  config: BurstConfig,
): BurstState {
  const wpm = burstWpm(target.length, now - (state.attemptStartedAt ?? now));
  const lastWpm = Math.round(wpm);
  const base = {
    ...state,
    typed: "",
    attemptStartedAt: null,
    totalAttempts: state.totalAttempts + 1,
    lastWpm,
  };
  if (wpm < config.thresholdWpm) {
    return { ...base, reps: 0, lastOutcome: "slow" };
  }
  const nextReps = state.reps + 1;
  const itemDone = nextReps >= config.repsPerItem;
  return {
    ...base,
    reps: itemDone ? 0 : nextReps,
    itemIdx: itemDone ? state.itemIdx + 1 : state.itemIdx,
    lastOutcome: "win",
    totalWins: state.totalWins + 1,
    finished: itemDone && state.itemIdx >= config.items.length - 1,
  };
}
